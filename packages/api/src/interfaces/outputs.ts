/**
 * Output/Result types for service operations
 */

import type {
  Currency,
  InvoiceStatus,
  PaymentStatus,
} from "@getblitz/database";

import type { InvoiceLineItem } from "./inputs";

export interface CreateChallengeResult {
  sessionId: string;
  referenceId: string;
  merchantReferenceId?: string;
  paymentUrl: string;
  expiresAt: string | null; // Nullable for non-expiring payments
  connectionId: string;
  clientToken: string;
}

export interface SessionDetailsResult {
  sessionId: string;
  referenceId: string;
  amountCents: number;
  currency: Currency;
  status: PaymentStatus;
  expiresAt: string | null; // Nullable for non-expiring payments
  redirectUrl: string | null; // Optional redirect URL after success
  organization: {
    name: string;
    logo: string | null;
  };
  bankAccount: {
    organizationBankConnection: {
      id: string;
      providerId: string;
    };
    accountName: string;
    iban?: string;
    bic?: string;
    bankName?: string;
    walletAddressEvm?: string;
  } | null;
  provider: {
    id: string;
    displayName: string;
    domain: string;
  } | null;
  sepaQrString: string | null;
  clientToken: string;
}

export interface SimulatePaymentResult {
  success: boolean;
  message?: string;
  error?: string;
  sessionId?: string;
}

export interface SettlementResult {
  success: boolean;
  error?: string;
  alreadyProcessed?: boolean;
  sessionId?: string;
  clientToken?: string;
}

export interface ApiKeyValidationResult {
  valid: boolean;
  organizationId?: string;
  keyId?: string;
  error?: string;
}

export type WebhookEventType =
  | "payment.success"
  | "payment.partial"
  | "payment.failed"
  | "payment.expired";

export interface BankWebhookResult {
  success: boolean;
  error?: string;
  errorCode?:
    | "NOT_FOUND"
    | "INVALID_SIGNATURE"
    | "SETTLEMENT_FAILED"
    | "INTERNAL_ERROR"
    | "IGNORE";
  alreadyProcessed?: boolean;
  referenceId?: string;
}

// Invoice-related output types

export interface CreateInvoiceResult {
  invoiceId: string;
  referenceId: string;
  invoiceUrl: string;
}

export interface InvoiceDetailsResult {
  invoiceId: string;
  referenceId: string;
  invoiceNumber: string | null;
  status: InvoiceStatus;

  // Financial summary
  amountCents: number;
  currency: Currency;
  subtotalCents: number;
  taxRateBps: number;
  taxAmountCents: number;
  discountCents: number;
  lineItems: InvoiceLineItem[] | null;

  // Status
  expiresAt: string | null;
  dueDate: string | null;

  // Customer info
  customerEmail: string | null;
  customerName: string | null;
  customerAddress: string | null;
  customerTaxId: string | null;

  // Invoice content
  description: string | null;
  notes: string | null;

  // Organization with logo
  organization: {
    name: string;
    logo: string | null;
  };

  // Security
  isPasswordProtected: boolean;

  // Payment session for QR code
  paymentSession: SessionDetailsResult;
}

export interface QrCodeResult {
  qrCodeBase64: string;
  qrString: string;
}
