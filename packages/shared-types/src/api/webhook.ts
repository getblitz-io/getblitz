import { z } from "zod/v4";

// Monerium webhook payload structure
export const MoneriumWebhookPayloadSchema = z.object({
  id: z.string(),
  kind: z.enum(["issuance", "redeem", "transfer"]),
  amount: z.string(),
  currency: z.string(),
  iban: z.string().optional(),
  address: z.string().optional(),
  memo: z.string().optional(), // Contains the reference_id
  transactionHash: z.string().optional(),
  state: z.enum(["pending", "placed", "processed", "rejected"]),
  meta: z
    .object({
      sentAt: z.string().optional(),
    })
    .optional(),
});
export type MoneriumWebhookPayload = z.infer<
  typeof MoneriumWebhookPayloadSchema
>;

// Generic EVM chain webhook (for direct crypto payments)
export const EvmTransactionWebhookSchema = z.object({
  txHash: z.string(),
  from: z.string(),
  to: z.string(),
  value: z.string(),
  chainId: z.number(),
  blockNumber: z.number(),
  data: z.string().optional(),
});
export type EvmTransactionWebhook = z.infer<typeof EvmTransactionWebhookSchema>;
