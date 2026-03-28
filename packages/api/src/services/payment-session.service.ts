import { jwtVerify, SignJWT } from "jose";
import QRCode from "qrcode";

import type { Prisma } from "@getblitz/database";
import { ProviderRegistry } from "@getblitz/bank-providers";

import type {
  BankAccountWithOrganizationBankConnection,
  CreateChallengeInput,
  CreateChallengeResult,
  IBankAccountRepository,
  ICredentialManagerService,
  IOrganizationRepository,
  IPaymentSessionRepository,
  IPaymentSessionService,
  IPaymentSettlementService,
  PaymentSessionWithOrg,
  QrCodeResult,
  SessionDetailsResult,
  SimulatePaymentResult,
} from "../interfaces";
import { env } from "../env";
import { generateReferenceId } from "../utils/reference-id";
import { centsToEuros, generateSepaQrString } from "../utils/sepa-qr";

export class PaymentSessionService implements IPaymentSessionService {
  constructor(
    private readonly paymentSessionRepository: IPaymentSessionRepository,
    private readonly bankAccountRepository: IBankAccountRepository,
    private readonly paymentSettlementService: IPaymentSettlementService,
    private readonly credentialManagerService: ICredentialManagerService,
    private readonly organizationRepository: IOrganizationRepository,
  ) {}

  private async generateClientToken(
    sessionId: string,
    organizationId: string,
  ): Promise<string> {
    const secret = new TextEncoder().encode(env.ENCRYPTION_KEY);
    const alg = "HS256";

    return new SignJWT({
      sessionId,
      organizationId,
      typ: "payment_socket",
    })
      .setProtectedHeader({ alg })
      .setIssuedAt()
      .setExpirationTime("1h") // Token valid for 1 hour
      .sign(secret);
  }

  /**
   * Create a new payment challenge/session
   */
  async createChallenge(
    {
      input,
      baseUrl,
    }: {
      input: CreateChallengeInput;
      baseUrl: string;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<CreateChallengeResult> {
    const {
      organizationId,
      amount,
      currency,
      bankAccountId,
      merchantReferenceId,
      metadata,
      expiresInMinutes,
    } = input;

    // Validate merchantReferenceId uniqueness per organization if provided
    if (merchantReferenceId) {
      const existingSession =
        await this.paymentSessionRepository.findByMerchantReferenceId(
          {
            organizationId,
            merchantReferenceId,
          },
          tx,
        );
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

    // Set expiration
    const expiresAt =
      expiresInMinutes === null
        ? null
        : new Date(Date.now() + (expiresInMinutes ?? 15) * 60 * 1000);

    // Create payment session
    const paymentSession = await this.paymentSessionRepository.create(
      {
        data: {
          organizationId,
          bankAccountId: bankAccount.id,
          referenceId,
          merchantReferenceId,
          amountCents: amount,
          currency,
          expiresAt,
          metadata,
        },
      },
      tx,
    );

    // Generate payment URL
    const paymentUrl = `${baseUrl}/pay/${paymentSession.id}`;

    // Validate origin and generate token
    const organization = await this.organizationRepository.findById({
      id: organizationId,
    });

    if (!organization) throw new Error("Organization not found");

    const clientToken = await this.generateClientToken(
      paymentSession.id,
      organizationId,
    );

    return {
      sessionId: paymentSession.id,
      referenceId,
      merchantReferenceId,
      paymentUrl,
      expiresAt: paymentSession.expiresAt?.toISOString() ?? null,
      connectionId: bankAccount.organizationBankConnection.id,
      clientToken,
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
    if (
      session.status === "PENDING" &&
      session.expiresAt &&
      session.expiresAt < new Date()
    ) {
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

    const clientToken = await this.generateClientToken(
      session.id,
      session.organizationId,
    );

    return {
      sessionId: session.id,
      referenceId: session.referenceId,
      amountCents: session.amountCents,
      currency: session.currency,
      status: session.status,
      expiresAt: session.expiresAt?.toISOString() ?? null,
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
      clientToken,
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

    // Try sandbox simulation for providers that support it
    if (connection.providerConfig && connection.credentials) {
      const provider =
        await this.credentialManagerService.createAuthenticatedProvider({
          connectionId: connection.id,
        });

      if (provider.supportsSandboxSimulation()) {
        // Use the external account ID from the bank account
        const accountId = session.bankAccount.externalAccountId;
        const amount = session.amountCents / 100; // Convert cents to major units

        const sandboxResult = await provider.simulateSandboxPayment({
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
    const simTxHash = `sim_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const result = await this.paymentSettlementService.settle({
      input: {
        referenceId: session.referenceId,
        txHash: simTxHash,
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

  async getQrCodeBase64({
    sessionId,
  }: {
    sessionId: string;
  }): Promise<QrCodeResult | null> {
    const session = await this.getSessionDetails({ sessionId });
    if (!session?.sepaQrString) return null;

    const qrCodeBuffer = await this.getQrCodeBuffer({ sessionId });
    if (!qrCodeBuffer) return null;

    return {
      qrCodeBase64: `data:image/png;base64,${qrCodeBuffer.toString("base64")}`,
      qrString: session.sepaQrString,
    };
  }

  async getQrCodeBuffer({
    sessionId,
  }: {
    sessionId: string;
  }): Promise<Buffer | null> {
    const session = await this.getSessionDetails({ sessionId });
    if (!session?.sepaQrString) return null;

    return QRCode.toBuffer(session.sepaQrString, {
      type: "png",
      width: 400,
      margin: 2,
    });
  }
  async verifySessionAccess({
    sessionId,
    clientToken,
    origin,
  }: {
    sessionId: string;
    clientToken: string;
    origin: string;
  }): Promise<void> {
    const secret = new TextEncoder().encode(env.ENCRYPTION_KEY);

    try {
      const { payload } = await jwtVerify(clientToken, secret);

      if (payload.sessionId !== sessionId) {
        throw new Error("Invalid token for this session");
      }

      // Check organization allowed origins
      const organizationId = payload.organizationId as string;
      const organization = await this.organizationRepository.findById({
        id: organizationId,
      });

      if (!organization) {
        throw new Error("Organization not found");
      }

      // Allow if origin matches the app URL (e.g. self-hosted checkout)
      const appUrl = new URL(env.NEXT_PUBLIC_APP_URL);
      if (origin === appUrl.origin) {
        return;
      }

      // Check allowed origins
      if (organization.allowedOrigins.length > 0) {
        if (!organization.allowedOrigins.includes(origin)) {
          throw new Error(`Origin ${origin} is not allowed`);
        }
      } else {
        // If no allowed origins are set, strictly allow only app URL (already checked)
        // or potentially block all external access?
        // For now, let's assume if the list is empty, we ONLY allow the app URL.
        throw new Error(`Origin ${origin} is not allowed`);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Session verification failed: ${error.message}`);
      }
      throw new Error("Session verification failed");
    }
  }
}
