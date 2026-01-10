/**
 * Input types for creating/updating entities
 */

import type { Currency } from "@getblitz/database";

export interface CreatePaymentSessionInput {
  organizationId: string;
  bankAccountId?: string;
  referenceId: string;
  merchantReferenceId?: string;
  amountCents: number;
  currency: Currency;
  expiresAt: Date;
}

export interface CreateBankAccountInput {
  organizationBankConnectionId: string;
  externalAccountId: string;
  accountName: string;
  accountIban: string;
  accountBic: string;
}

export interface CreateWebhookInput {
  webhookUrl: string;
  webhookSecret: string;
  notifyPaymentSuccess?: boolean;
  notifyPaymentFailed?: boolean;
  notifyPaymentExpired?: boolean;
}

export interface UpdateWebhookInput {
  webhookUrl?: string;
  webhookSecret?: string;
  notifyPaymentSuccess?: boolean;
  notifyPaymentFailed?: boolean;
  notifyPaymentExpired?: boolean;
}

export interface CreateTransactionInput {
  paymentSessionId: string;
  txHash: string;
  rawPayload?: unknown;
}

export interface CreateChallengeInput {
  organizationId: string;
  amount: number;
  currency: Currency;
  bankAccountId?: string;
  merchantReferenceId?: string;
}

export interface SettlementInput {
  referenceId: string;
  txHash: string;
  amountCents: number;
  rawPayload?: unknown;
}

export interface AddBankAccountInput {
  organizationId: string;
  connectionId: string;
  externalAccountId: string;
  accountName: string;
  accountIban: string;
  accountBic: string;
  isDefault?: boolean;
}

export interface CreateOrganizationWebhookInput {
  organizationId: string;
  webhookUrl: string;
  webhookSecret: string;
  notifyPaymentSuccess?: boolean;
  notifyPaymentFailed?: boolean;
  notifyPaymentExpired?: boolean;
}

export interface UpdateOrganizationWebhookInput {
  webhookId: string;
  webhookUrl?: string;
  webhookSecret?: string;
  notifyPaymentSuccess?: boolean;
  notifyPaymentFailed?: boolean;
  notifyPaymentExpired?: boolean;
}

export interface CreateOrganizationBankConnectionInput {
  organizationId: string;
  providerId: string;
  providerConfig: string; // Encrypted provider configuration
  credentials?: string | null; // Encrypted OAuth credentials (null until OAuth complete)
  webhookUrl?: string | null;
  webhookSecret?: string | null;
}
