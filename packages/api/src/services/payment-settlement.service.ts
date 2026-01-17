import type { PaymentEvent, WebhookEventType } from "@getblitz/shared-types";
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
   * Settle a payment transaction for a session.
   * Supports multiple transactions per session (e.g., group splitting a bill).
   * Session is marked PAID when total paid >= required amount.
   */
  async settle({
    input,
  }: {
    input: SettlementInput;
  }): Promise<SettlementResult> {
    const {
      referenceId,
      txHash,
      amountCents,
      currency,
      customerIban,
      customerBic,
      customerName,
      rawPayload,
    } = input;

    try {
      const result: SettlementResult & { webhookEvent?: WebhookEventType } =
        await prisma.$transaction(async (tx) => {
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

          // Check if this transaction already exists (idempotency)
          const existingTx = await tx.transaction.findUnique({
            where: { txHash },
          });
          if (existingTx) {
            return {
              success: true,
              alreadyProcessed: true,
              sessionId: session.id,
              clientToken: session.clientToken ?? undefined,
            };
          }

          // Create transaction record with amount details
          await tx.transaction.create({
            data: {
              paymentSessionId: session.id,
              txHash,
              amountCents,
              currency: currency ?? session.currency,
              status: "COMPLETED",
              customerIban,
              customerBic,
              customerName,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              rawPayload: rawPayload
                ? JSON.parse(JSON.stringify(rawPayload))
                : undefined,
            },
          });

          // Calculate total paid across all completed transactions
          const totalPaidResult: { _sum: { amountCents: number | null } } =
            await tx.transaction.aggregate({
              where: {
                paymentSessionId: session.id,
                status: "COMPLETED",
              },
              _sum: { amountCents: true },
            });
          const totalPaidCents = totalPaidResult._sum.amountCents ?? 0;

          // Determine if payment is complete
          const isPaymentComplete = totalPaidCents >= session.amountCents;
          const newStatus = isPaymentComplete ? "PAID" : "PENDING";

          // Update session with new totals and status
          await tx.paymentSession.update({
            where: { id: session.id },
            data: {
              amountPaidCents: totalPaidCents,
              amountPaidCurrency: currency ?? session.currency,
              status: newStatus,
            },
          });

          // Publish event to Redis for real-time notifications
          if (isPaymentComplete) {
            const event: PaymentEvent = {
              type: "PAYMENT_SUCCESS",
              referenceId: session.referenceId,
              sessionId: session.id,
              status: "PAID",
              timestamp: new Date().toISOString(),
              clientToken: session.clientToken ?? undefined,
            };
            await publishPaymentEvent(event);
          }

          return {
            success: true,
            txHash,
            sessionId: session.id,
            clientToken: session.clientToken ?? undefined,
            webhookEvent: isPaymentComplete
              ? "payment.success"
              : "payment.partial",
          } as SuccessfulSettlement & { webhookEvent: WebhookEventType };
        });

      // Notify merchant via webhook if successful and not already processed
      if (result.success && result.sessionId && !result.alreadyProcessed) {
        await this.webhookService
          .notifyMerchant({
            sessionId: result.sessionId,
            event: result.webhookEvent ?? "payment.success",
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
