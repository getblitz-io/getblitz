import { z } from "zod/v4";

export const WebhookEventTypeSchema = z.enum([
  "payment.success",
  "payment.partial",
  "payment.failed",
  "payment.expired",
]);
export type WebhookEventType = z.infer<typeof WebhookEventTypeSchema>;

export const MerchantWebhookPayloadSchema = z.object({
  event: WebhookEventTypeSchema,
  sessionId: z.string(),
  referenceId: z.string(),
  merchantReferenceId: z.string().optional(),
  amountCents: z.number().int(),
  amountPaidCents: z.number().int(),
  currency: z.string(),
  provider: z.string(),
  clientToken: z.string().optional(),
  timestamp: z.string(),
  bankAccount: z.object({
    connectionId: z.string(),
    connectionName: z.string(),
    accountName: z.string(),
    iban: z.string(),
    bic: z.string(),
  }),
  metadata: z.record(z.string(), z.string()).optional(),
});
export type MerchantWebhookPayload = z.infer<
  typeof MerchantWebhookPayloadSchema
>;
