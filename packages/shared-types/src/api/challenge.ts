import { z } from "zod/v4";

// Request to create a payment challenge
export const CreateChallengeRequestSchema = z.object({
  amount: z
    .number()
    .int()
    .positive()
    .describe("Amount in cents (e.g., 500 = €5.00)"),
  currency: z.enum(["EUR", "USDC"]).default("EUR"),
  bankAccountId: z
    .uuid()
    .optional()
    .describe("Specific bank account ID, or uses default"),
  metadata: z
    .record(z.string(), z.string())
    .optional()
    .describe("Optional merchant metadata"),
});
export type CreateChallengeRequest = z.infer<
  typeof CreateChallengeRequestSchema
>;

// Response from creating a payment challenge
export const CreateChallengeResponseSchema = z.object({
  sessionId: z.uuid(),
  referenceId: z.string().max(35),
  paymentUrl: z.url(),
  expiresAt: z.date(),
});
export type CreateChallengeResponse = z.infer<
  typeof CreateChallengeResponseSchema
>;

// Session details for the payment widget
export const PaymentSessionDetailsSchema = z.object({
  sessionId: z.uuid(),
  referenceId: z.string(),
  amountCents: z.number().int(),
  currency: z.enum(["EUR"]),
  status: z.enum(["PENDING", "PAID", "FAILED", "EXPIRED"]),
  expiresAt: z.date(),
  organization: z.object({
    name: z.string(),
  }),
  bankAccount: z.object({
    providerId: z.string(),
    accountName: z.string(),
    iban: z.string(),
  }),
});
export type PaymentSessionDetails = z.infer<typeof PaymentSessionDetailsSchema>;
