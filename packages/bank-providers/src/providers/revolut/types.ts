import { z } from "zod";

import type { BaseBankCredentials, ProviderConfig } from "../../types";

/**
 * Revolut transaction leg schema (used in full transaction responses)
 */
export const RevolutTransactionLegSchema = z.object({
  leg_id: z.string().optional(),
  amount: z.number(),
  currency: z.string(),
  description: z.string().optional(),
  account_id: z.string().optional(),
});

/**
 * Full Revolut transaction schema (from API response)
 * @see https://developer.revolut.com/docs/business/get-transaction
 */
export const RevolutTransactionSchema = z.object({
  id: z.string(),
  type: z.string(),
  state: z.string(),
  request_id: z.string().optional(),
  created_at: z.string().optional(),
  completed_at: z.string().optional(),
  reference: z.string().optional(),
  legs: z.array(RevolutTransactionLegSchema).optional(),
});

export type RevolutTransaction = z.infer<typeof RevolutTransactionSchema>;

/**
 * TransactionCreated webhook payload - contains full transaction data
 */
export const TransactionCreatedPayloadSchema = z.object({
  event: z.literal("TransactionCreated"),
  timestamp: z.string(),
  data: RevolutTransactionSchema,
});

/**
 * TransactionStateChanged webhook payload - contains minimal data
 * Requires API call to fetch full transaction details
 */
export const TransactionStateChangedPayloadSchema = z.object({
  event: z.literal("TransactionStateChanged"),
  timestamp: z.string(),
  data: z.object({
    id: z.string(),
    request_id: z.string().optional(),
    old_state: z.string(),
    new_state: z.string(),
  }),
});

/**
 * Combined Revolut webhook payload schema
 * Handles both TransactionCreated (full) and TransactionStateChanged (minimal) events
 */
export const RevolutWebhookPayloadSchema = z.discriminatedUnion("event", [
  TransactionCreatedPayloadSchema,
  TransactionStateChangedPayloadSchema,
]);

export type RevolutWebhookPayload = z.infer<typeof RevolutWebhookPayloadSchema>;

/**
 * Revolut account schema (from GET /api/1.0/accounts)
 * @see https://developer.revolut.com/docs/business/get-accounts
 */
export const RevolutAccountSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  balance: z.number(),
  currency: z.string(),
  state: z.string(),
  public: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export const RevolutAccountsResponseSchema = z.array(RevolutAccountSchema);

/**
 * Revolut bank detail schema (from GET /api/1.0/accounts/{id}/bank-details)
 * @see https://developer.revolut.com/docs/business/get-account-details
 */
export const RevolutBankDetailSchema = z.object({
  iban: z.string().optional(),
  bic: z.string().optional(),
  account_no: z.string().optional(),
  sort_code: z.string().optional(),
  routing_number: z.string().optional(),
  beneficiary: z.string().optional(),
  beneficiary_address: z
    .object({
      street_line1: z.string().optional(),
      street_line2: z.string().optional(),
      region: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
      postcode: z.string().optional(),
    })
    .optional(),
  bank_country: z.string().optional(),
  pooled: z.boolean().optional(),
  unique_reference: z.string().optional(),
  schemes: z.array(z.string()).optional(),
  estimated_time: z
    .object({
      unit: z.string().optional(),
      min: z.number().optional(),
      max: z.number().optional(),
    })
    .optional(),
});
export const RevolutBankDetailsResponseSchema = z.array(
  RevolutBankDetailSchema,
);

/**
 * Revolut token response schema (from POST /api/1.0/auth/token — exchange code)
 */
export const RevolutTokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
  token_type: z.string(),
});

/**
 * Revolut refresh token response schema (from POST /api/1.0/auth/token — refresh)
 * Note: Revolut does not return a new refresh_token on refresh.
 */
export const RevolutRefreshTokenResponseSchema = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  token_type: z.string(),
});

/**
 * Revolut create webhook response schema (from POST /api/2.0/webhooks)
 * @see https://developer.revolut.com/docs/business/create-webhook
 */
export const RevolutCreateWebhookResponseSchema = z.object({
  id: z.string(),
  url: z.string().optional(),
  events: z.array(z.string()).optional(),
  signing_secret: z.string(),
});

export const RevolutProviderConfigSchema = z.object({
  clientId: z.string(),
  privateKeyPem: z.string(),
  sandboxMode: z.boolean().default(false),
});

export interface RevolutProviderConfig extends ProviderConfig {
  clientId: string;
  privateKeyPem: string;
  sandboxMode: boolean;
}

export interface RevolutBankCredentials extends BaseBankCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}
