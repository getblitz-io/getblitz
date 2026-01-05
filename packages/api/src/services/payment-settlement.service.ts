import type { PaymentEvent } from "@getblitz/shared-types";
import { prisma } from "@getblitz/database";
import { publishPaymentEvent } from "@getblitz/redis";

import type {
  IPaymentSettlementService,
  IWebhookService,
  SettlementInput,
  SettlementResult,
} from "../interfaces";

interface SuccessfulSettlement extends SettlementResult {
  success: true;
  txHash: string;
}

export class PaymentSettlementService implements IPaymentSettlementService {
  constructor(private readonly webhookService: IWebhookService) {}

  /**
   * Settle a payment session
   */
  async settle({
    input,
  }: {
    input: SettlementInput;
  }): Promise<SettlementResult> {
    const { referenceId, txHash, amountCents, rawPayload } = input;

    try {
      const result: SettlementResult = await prisma.$transaction(async (tx) => {
        // Find session
        const session = await tx.paymentSession.findUnique({
          where: { referenceId },
          include: { organization: true },
        });

        if (!session) {
          return { success: false, error: "Payment session not found" };
        }

        if (session.status === "PAID") {
          return {
            success: true,
            alreadyProcessed: true,
            sessionId: session.id,
            clientToken: session.clientToken ?? undefined,
          };
        }

        if (session.status === "EXPIRED") {
          return { success: false, error: "Payment session expired" };
        }

        if (session.amountCents !== amountCents) {
          return {
            success: false,
            error: `Amount mismatch: expected ${session.amountCents}, got ${amountCents}`,
          };
        }

        // Create transaction record (acts as settlement record)
        await tx.transaction.create({
          data: {
            paymentSessionId: session.id,
            txHash,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            rawPayload: rawPayload
              ? JSON.parse(JSON.stringify(rawPayload))
              : undefined,
          },
        });

        // Update session status
        await tx.paymentSession.update({
          where: { id: session.id },
          data: { status: "PAID" },
        });

        // Prepare payment event for internal pub/sub
        const event: PaymentEvent = {
          type: "PAYMENT_SUCCESS",
          referenceId: session.referenceId,
          sessionId: session.id,
          status: "PAID",
          timestamp: new Date().toISOString(),
          clientToken: session.clientToken ?? undefined,
        };

        // Publish event to Redis
        await publishPaymentEvent(event);

        return {
          success: true,
          txHash,
          sessionId: session.id,
          clientToken: session.clientToken ?? undefined,
        } as SuccessfulSettlement;
      });

      // Notify merchant via webhook if successful and not already processed
      if (result.success && result.sessionId && !result.alreadyProcessed) {
        await this.webhookService
          .notifyMerchant({
            sessionId: result.sessionId,
            event: "payment.success",
          })
          .catch((err: unknown) => {
            console.error("Webhook notification failed:", err);
          });
      }

      return result;
    } catch (error) {
      console.error("Settlement failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      };
    }
  }

  /**
   * Post-settlement actions (like webhooks)
   * This should be called after settle() returns success
   * Kept for backward compatibility or if needed by other callers
   */
  async postSettle(result: SettlementResult): Promise<void> {
    if (result.success && result.sessionId && !result.alreadyProcessed) {
      await this.webhookService
        .notifyMerchant({
          sessionId: result.sessionId,
          event: "payment.success",
        })
        .catch((err: unknown) => {
          console.error("Webhook notification failed:", err);
        });
    }
  }
}
