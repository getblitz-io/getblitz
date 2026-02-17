/**
 * Input types for creating/updating entities
 */

import type {
  BankConnectionStatus,
  Currency,
  Invoice,
  Prisma,
} from "@getblitz/database";

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
  status?: BankConnectionStatus;
}

// Invoice-related input types

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPriceCents: number;
}

// Invoice-related data types for database operations

export type InvoiceCreateData = Omit<
  Pick<
    Invoice,
    | "organizationId"
    | "referenceId"
    | "customerEmail"
    | "subtotalCents"
    | "taxRateBps"
    | "taxAmountCents"
    | "discountCents"
    | "totalCents"
    | "currency"
    | "bankAccountId"
  >,
  "lineItems"
> & { lineItems: Prisma.InputJsonValue } & Partial<
    Omit<
      Pick<
        Invoice,
        | "paymentSessionId"
        | "customerId"
        | "customerName"
        | "customerTaxId"
        | "customerAddress"
        | "description"
        | "notes"
        | "dueDate"
        | "invoiceNumber"
        | "passwordHash"
        | "expiresAt"
        | "status"
      >,
      "metadata"
    >
  > & { metadata?: Prisma.InputJsonValue };

export type InvoiceUpdateData = Partial<
  Omit<InvoiceCreateData, "organizationId" | "referenceId"> &
    Pick<Invoice, "paymentSessionId">
>;

export interface DeviceDetails {
  ipAddress: string;
  userAgent: string;
  deviceType: string;
  deviceOs: string;
  deviceBrowser: string;
}
