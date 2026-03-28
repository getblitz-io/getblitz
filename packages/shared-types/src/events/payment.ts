import { z } from "zod/v4";

// Redis pub/sub channel name
export const PAYMENT_EVENTS_CHANNEL = "payment_events";

// Event types for realtime notifications
export const PaymentEventTypeSchema = z.enum([
  "PAYMENT_SUCCESS",
  "PAYMENT_PARTIAL",
  "PAYMENT_FAILED",
  "PAYMENT_EXPIRED",
]);
export type PaymentEventType = z.infer<typeof PaymentEventTypeSchema>;

// Payment event payload (published to Redis, emitted via WebSocket)
export const PaymentEventSchema = z.object({
  type: PaymentEventTypeSchema,
  referenceId: z.string(),
  sessionId: z.uuid(),
  status: z.enum(["PENDING", "PARTIAL", "PAID", "FAILED", "EXPIRED"]),
  clientToken: z.string().optional(), // Proof of payment for the buyer
  timestamp: z.string(), // ISO timestamp string for JSON serialization
});
export type PaymentEvent = z.infer<typeof PaymentEventSchema>;
