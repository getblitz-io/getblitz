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
  expiresAt: Date | null; // Nullable for non-expiring payments
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
  amountCents: number;
  currency: Currency;
  customerIban?: string;
  customerBic?: string;
  customerName?: string;
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
  currency?: Currency;
  customerIban?: string;
  customerBic?: string;
  customerName?: string;
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
  providerConfig?: string | null; // Encrypted provider configuration (null in PENDING_CONFIG state)
  credentials?: string | null; // Encrypted OAuth credentials (null until OAuth complete)
  callbackUrl?: string | null; // OAuth callback URL (needed for token refresh)
  webhookUrl?: string | null;
  webhookSecret?: string | null;
  name?: string | null; // Optional connection name
}

// Invoice-related input types

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPriceCents: number;
}

export interface CreateInvoiceInput {
  organizationId: string;
  amountCents: number; // Total amount (for payment session)
  currency: Currency;
  bankAccountId?: string;
  merchantReferenceId?: string;

  // Customer information
  customerEmail: string;
  customerName?: string;
  customerAddress?: string;
  customerTaxId?: string;

  // Invoice details
  description?: string;
  notes?: string;
  dueDate?: Date;
  invoiceNumber?: string;

  // Financial details
  lineItems?: InvoiceLineItem[];
  subtotalCents: number;
  taxRateBps?: number; // Tax rate in basis points (1900 = 19%)
  taxAmountCents?: number;
  discountCents?: number;

  // Security
  password?: string; // Plain text - will be hashed before storage

  // Expiration
  expiresInMinutes?: number | null; // null = no expiration

  metadata?: Record<string, unknown>;
}

export interface CreateInvoiceDbInput {
  organizationId: string;
  referenceId: string;
  paymentSessionId: string;
  customerId?: string;
  customerEmail?: string | null;
  customerName?: string | null;
  customerAddress?: string | null;
  customerTaxId?: string | null;
  description?: string;
  notes?: string;
  dueDate?: Date;
  invoiceNumber?: string;
  lineItems?: InvoiceLineItem[];
  subtotalCents: number;
  taxRateBps: number;
  taxAmountCents: number;
  discountCents: number;
  passwordHash?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateInvoiceInput {
  id: string;
  organizationId: string;
  // Customer information (updatable)
  customerId?: string;
  customerEmail?: string;
  customerName?: string;
  customerAddress?: string;
  customerTaxId?: string;
  // Invoice content (updatable)
  description?: string;
  notes?: string;
  dueDate?: Date;
  invoiceNumber?: string;
  // Financial details (updatable)
  lineItems?: InvoiceLineItem[];
  subtotalCents?: number;
  taxRateBps?: number;
  taxAmountCents?: number;
  discountCents?: number;
  // Security
  password?: string; // Plain text - will be hashed if provided
  metadata?: Record<string, unknown>;
}

export interface UpdateInvoiceDbInput {
  customerId?: string;
  customerEmail?: string | null;
  customerName?: string | null;
  customerAddress?: string | null;
  customerTaxId?: string | null;
  description?: string;
  notes?: string;
  dueDate?: Date;
  invoiceNumber?: string;
  lineItems?: InvoiceLineItem[];
  subtotalCents?: number;
  taxRateBps?: number;
  taxAmountCents?: number;
  discountCents?: number;
  passwordHash?: string;
  metadata?: Record<string, unknown>;
}
