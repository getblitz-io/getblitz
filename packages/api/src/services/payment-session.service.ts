import { ProviderRegistry } from "@getblitz/bank-providers";

import type {
  BankAccountWithOrganizationBankConnection,
  CreateChallengeInput,
  CreateChallengeResult,
  IBankAccountRepository,
  ICredentialManagerService,
  IPaymentSessionRepository,
  IPaymentSessionService,
  IPaymentSettlementService,
  PaymentSessionWithOrg,
  SessionDetailsResult,
  SimulatePaymentResult,
} from "../interfaces";
import { generateReferenceId } from "../utils/reference-id";
import { centsToEuros, generateSepaQrString } from "../utils/sepa-qr";

export class PaymentSessionService implements IPaymentSessionService {
  constructor(
    private readonly paymentSessionRepository: IPaymentSessionRepository,
    private readonly bankAccountRepository: IBankAccountRepository,
    private readonly paymentSettlementService: IPaymentSettlementService,
    private readonly credentialManagerService: ICredentialManagerService,
  ) {}

  /**
   * Create a new payment challenge/session
   */
  async createChallenge({
    input,
    baseUrl,
  }: {
    input: CreateChallengeInput;
    baseUrl: string;
  }): Promise<CreateChallengeResult> {
    const {
      organizationId,
      amount,
      currency,
      bankAccountId,
      merchantReferenceId,
    } = input;

    // Validate merchantReferenceId uniqueness per organization if provided
    if (merchantReferenceId) {
      const existingSession =
        await this.paymentSessionRepository.findByMerchantReferenceId({
          organizationId,
          merchantReferenceId,
        });
      if (existingSession) {
        throw new Error(
          `A payment with merchantReferenceId "${merchantReferenceId}" already exists for this organization`,
        );
      }
    }

    // Resolve bank account
    let bankAccount: BankAccountWithOrganizationBankConnection | null = null;

    if (bankAccountId) {
      bankAccount = await this.bankAccountRepository.findById({
        id: bankAccountId,
      });
    } else {
      // Try default bank account
      bankAccount =
        await this.bankAccountRepository.findDefaultByOrganizationId({
          organizationId,
        });
    }

    if (!bankAccount) {
      throw new Error(
        "No bank account configured. Please add one in the dashboard.",
      );
    }

    // Generate unique reference ID
    const referenceId = generateReferenceId();

    // Set expiration (15 minutes from now)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // Create payment session
    const paymentSession = await this.paymentSessionRepository.create({
      data: {
        organizationId,
        bankAccountId: bankAccount.id,
        referenceId,
        merchantReferenceId,
        amountCents: amount,
        currency,
        expiresAt,
      },
    });

    // Generate payment URL
    const paymentUrl = `${baseUrl}/pay/${paymentSession.id}`;

    return {
      sessionId: paymentSession.id,
      referenceId,
      merchantReferenceId,
      paymentUrl,
      expiresAt: paymentSession.expiresAt.toISOString(),
      connectionId: bankAccount.organizationBankConnection.id,
    };
  }

  /**
   * Get session details by reference ID
   */
  async getSessionDetailsByReference({
    referenceId,
  }: {
    referenceId: string;
  }): Promise<SessionDetailsResult | null> {
    const session = await this.paymentSessionRepository.findByReferenceId({
      referenceId,
    });
    if (!session) {
      return null;
    }
    return this.getSessionDetails({ sessionId: session.id });
  }

  /**
   * Get session details for the payment page
   */
  async getSessionDetails({
    sessionId,
  }: {
    sessionId: string;
  }): Promise<SessionDetailsResult | null> {
    const session = await this.paymentSessionRepository.findById({
      id: sessionId,
    });

    if (!session) {
      return null;
    }

    // Check if expired and update status
    if (session.status === "PENDING" && session.expiresAt < new Date()) {
      await this.paymentSessionRepository.updateStatus({
        id: session.id,
        status: "EXPIRED",
      });
      session.status = "EXPIRED";
    }

    // Generate SEPA QR string if EUR payment
    let sepaQrString: string | null = null;
    const iban: string = session.bankAccount.accountIban;
    const walletAddressEvm: string = "random-wallet-address" as const;

    sepaQrString = generateSepaQrString({
      name: session.organization.name,
      iban: iban,
      amount: centsToEuros(session.amountCents),
      reference: session.referenceId,
      currency: "EUR",
    });

    // Get provider metadata from registry
    const providerId =
      session.bankAccount.organizationBankConnection.providerId;
    const providerMeta = ProviderRegistry.getProvider(providerId);

    return {
      sessionId: session.id,
      referenceId: session.referenceId,
      amountCents: session.amountCents,
      currency: session.currency,
      status: session.status,
      expiresAt: session.expiresAt.toISOString(),
      organization: {
        name: session.organization.name,
      },
      bankAccount: {
        organizationBankConnection: {
          id: session.bankAccount.organizationBankConnection.id,
          providerId,
        },
        accountName: session.bankAccount.accountName,
        iban,
        walletAddressEvm,
      },
      provider: providerMeta
        ? {
            id: providerMeta.id,
            displayName: providerMeta.displayName,
            domain: providerMeta.domain,
          }
        : null,
      sepaQrString,
    };
  }

  /**
   * Simulate a payment (for testing/development)
   * For Revolut in sandbox mode, uses Revolut's sandbox API for realistic testing.
   */
  async simulatePayment({
    sessionId,
  }: {
    sessionId: string;
  }): Promise<SimulatePaymentResult> {
    const session = await this.paymentSessionRepository.findById({
      id: sessionId,
    });

    if (!session) {
      return { success: false, error: "Payment session not found" };
    }

    if (session.status === "PAID") {
      return { success: false, error: "Payment already completed" };
    }

    if (session.status === "EXPIRED") {
      return { success: false, error: "Payment session expired" };
    }

    // Check if provider supports sandbox simulation
    const connection = session.bankAccount.organizationBankConnection;
    const providerId = connection.providerId;

    // Try sandbox simulation for providers that support it
    if (connection.providerConfig && connection.credentials) {
      const providerConfig =
        this.credentialManagerService.decryptProviderConfig(
          connection.providerConfig,
        );
      const provider = ProviderRegistry.createProvider(
        providerId,
        providerConfig,
      );

      if (
        provider.supportsSandboxSimulation() &&
        provider.simulateSandboxPayment
      ) {
        // Get valid credentials (may refresh if needed)
        const { credentials } =
          await this.credentialManagerService.getValidCredentials({
            connectionId: connection.id,
          });

        // Use the external account ID from the bank account
        const accountId = session.bankAccount.externalAccountId;
        const amount = session.amountCents / 100; // Convert cents to major units

        const sandboxResult = await provider.simulateSandboxPayment({
          credentials,
          accountId,
          amount,
          currency: session.currency,
          reference: session.referenceId,
        });

        if (!sandboxResult.success) {
          return {
            success: false,
            error: sandboxResult.error ?? "Sandbox simulation failed",
          };
        }

        // For sandbox simulation, the webhook will handle the actual settlement
        // Return success - the payment will be marked as paid when the webhook arrives
        return {
          success: true,
          message:
            "Payment simulated via provider sandbox API. Awaiting webhook confirmation.",
          sessionId: session.id,
        };
      }
    }

    // Fallback: Direct settlement simulation for providers without sandbox API
    const result = await this.paymentSettlementService.settle({
      input: {
        referenceId: session.referenceId,
        txHash: `sim_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        amountCents: session.amountCents,
        rawPayload: {
          simulated: true,
          timestamp: new Date().toISOString(),
        },
      },
    });

    if (!result.success) {
      return { success: false, error: result.error ?? "Settlement failed" };
    }

    return {
      success: true,
      message: "Payment simulated successfully",
      sessionId: session.id,
    };
  }

  /**
   * Expire all pending sessions that have passed their expiration time
   */
  async expireSessions(): Promise<number> {
    return this.paymentSessionRepository.expirePendingSessions();
  }

  /**
   * List payment sessions for given organizations
   */
  async listByOrgIds({
    orgIds,
    options,
  }: {
    orgIds: string[];
    options?: { take?: number };
  }): Promise<PaymentSessionWithOrg[]> {
    return this.paymentSessionRepository.findByOrgIds({ orgIds, options });
  }
}
