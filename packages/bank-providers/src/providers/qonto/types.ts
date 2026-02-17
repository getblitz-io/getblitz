import { z } from "zod";

import type { BaseBankCredentials, ProviderConfig } from "../../types";

export const QontoWebhookPayloadSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.object({
    id: z.string(),
    amount: z.number(),
    currency: z.string(),
    status: z.string(),
    reference: z.string().optional(),
    note: z.string().optional(),
    transaction_id: z.string().optional(),
    bank_account_id: z.string().optional(),
    side: z.enum(["debit", "credit"]),
    operation_type: z.string().optional(),
  }),
});

export const QontoOrganizationSchema = z.object({
  organization: z.object({
    legal_name: z.string(),
    bank_accounts: z.array(
      z.object({
        name: z.string(),
        iban: z.string(),
        bic: z.string(),
        currency: z.string(),
        authorized_balance_cents: z.number(),
      }),
    ),
  }),
});

export const QontoBankAccountSchema = z.object({
  bank_accounts: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      status: z.string(),
      main: z.boolean(),
      iban: z.string(),
      bic: z.string(),
      currency: z.string(),
      authorized_balance_cents: z.number(),
      is_external_account: z.boolean(),
    }),
  ),
});

export const QontoProviderConfigSchema = z.object({
  clientId: z.string(),
  clientSecret: z.string(),
  sandboxMode: z.boolean().default(false),
  sandboxToken: z.string().optional(),
});

/**
 * Qonto provider configuration
 */
export interface QontoProviderConfig extends ProviderConfig {
  clientId: string;
  clientSecret: string;
  sandboxMode: boolean;
  sandboxToken?: string;
}

export interface QontoBankCredentials extends BaseBankCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
}
