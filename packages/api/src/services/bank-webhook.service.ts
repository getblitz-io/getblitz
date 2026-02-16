import { WebhookVerificationStatus } from "@getblitz/bank-providers";
import { BankConnectionStatus } from "@getblitz/database";

import type {
  BankWebhookResult,
  IBankWebhookService,
  ICredentialManagerService,
  IOrganizationBankConnectionRepository,
  IPaymentSettlementService,
} from "../interfaces";
import { webhookLogger } from "../utils/logger";

export class BankWebhookService implements IBankWebhookService {
  constructor(
    private readonly organizationBankConnectionRepository: IOrganizationBankConnectionRepository,
    private readonly paymentSettlementService: IPaymentSettlementService,
    private readonly credentialManagerService: ICredentialManagerService,
  ) {}

  /**
   * Process webhook by connection ID (new preferred method)
   */
  async processWebhookByConnectionId({
    connectionId,
    request,
  }: {
    connectionId: string;
    request: Request;
  }): Promise<BankWebhookResult> {
    try {
      // 1. Find OrganizationBankConnection by ID
      const connection =
        await this.organizationBankConnectionRepository.findById({
          id: connectionId,
        });

      if (!connection) {
        webhookLogger.error(`Organization bank connection not found`, {
          connectionId,
        });
        return {
          success: false,
          error: "Organization bank connection not found",
          errorCode: "NOT_FOUND",
        };
      }

      const providerId = connection.providerId;

      // 2. Validate connection is in CONNECTED status
      if (connection.status !== BankConnectionStatus.CONNECTED) {
        webhookLogger.error(`Organization bank connection is not connected`, {
          connectionId,
          providerId,
          status: connection.status,
        });
        return {
          success: false,
          error: "Organization bank connection is not connected",
          errorCode: "NOT_FOUND",
        };
      }

      if (!connection.webhookSecret) {
        webhookLogger.error(
          `Organization bank connection has no webhook secret`,
          {
            connectionId,
            providerId,
          },
        );
        return {
          success: false,
          error: "Organization bank connection has no webhook secret",
          errorCode: "NOT_FOUND",
        };
      }

      const provider =
        await this.credentialManagerService.createAuthenticatedProvider({
          connectionId,
        });

      // 5. Verify webhook signature and parse payload
      const webhookResult = await provider.verifyAndParseWebhook({
        request,
        secret: connection.webhookSecret,
      });

      switch (webhookResult.status) {
        case WebhookVerificationStatus.Error:
          webhookLogger.error(
            `Webhook verification failed for provider: ${providerId}`,
            {
              connectionId,
              error: webhookResult.error,
            },
          );
          return {
            success: false,
            error: webhookResult.error,
            errorCode: "INVALID_SIGNATURE",
          };

        case WebhookVerificationStatus.Ignore:
          webhookLogger.info(`Webhook ignored for provider: ${providerId}`, {
            connectionId,
            reason: webhookResult.reason,
          });
          return {
            success: true,
            alreadyProcessed: false,
            errorCode: "IGNORE",
            error: webhookResult.reason,
          };

        case WebhookVerificationStatus.Success:
          webhookLogger.info(`Webhook processed for provider: ${providerId}`, {
            connectionId,
            referenceId: webhookResult.referenceId,
          });
          break;

        default:
          webhookLogger.error(`Unknown webhook result status`, {
            connectionId,
          });
          return {
            success: false,
            error: "Unknown webhook result status",
            errorCode: "INTERNAL_ERROR",
          };
      }

      // 6. Call paymentSettlementService.settle() with parsed notification data
      const result = await this.paymentSettlementService.settle({
        input: {
          referenceId: webhookResult.referenceId,
          txHash: webhookResult.txHash,
          amountCents: webhookResult.amountCents,
          rawPayload: webhookResult.rawPayload,
        },
      });

      if (!result.success) {
        webhookLogger.error(`Settlement failed for ${providerId}`, {
          referenceId: webhookResult.referenceId,
          error: result.error,
          connectionId,
        });
        return {
          success: false,
          error: result.error ?? "Settlement failed",
          errorCode: "SETTLEMENT_FAILED",
          referenceId: webhookResult.referenceId,
        };
      }

      webhookLogger.info(`Payment settled via ${providerId}`, {
        referenceId: webhookResult.referenceId,
        connectionId,
        alreadyProcessed: result.alreadyProcessed,
      });

      return {
        success: true,
        alreadyProcessed: result.alreadyProcessed,
        referenceId: webhookResult.referenceId,
      };
    } catch (error) {
      webhookLogger.error(`Bank webhook processing error`, {
        connectionId,
        error: String(error),
      });
      return {
        success: false,
        error: "Internal server error",
        errorCode: "INTERNAL_ERROR",
      };
    }
  }
}
