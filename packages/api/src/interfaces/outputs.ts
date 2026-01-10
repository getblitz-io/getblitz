/**
 * Output/Result types for service operations
 */

import type { Currency, PaymentStatus } from "@getblitz/database";

export interface CreateChallengeResult {
  sessionId: string;
  referenceId: string;
  merchantReferenceId?: string;
  paymentUrl: string;
  expiresAt: string;
  connectionId: string;
}

export interface SessionDetailsResult {
  sessionId: string;
  referenceId: string;
  amountCents: number;
  currency: Currency;
  status: PaymentStatus;
  expiresAt: string;
  organization: {
    name: string;
  };
  bankAccount: {
    organizationBankConnection: {
      id: string;
      providerId: string;
    };
    accountName: string;
    iban?: string;
    walletAddressEvm?: string;
  } | null;
  provider: {
    id: string;
    displayName: string;
    domain: string;
  } | null;
  sepaQrString: string | null;
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
  | "payment.failed"
  | "payment.expired";

export interface BankWebhookResult {
  success: boolean;
  error?: string;
  errorCode?:
    | "NOT_FOUND"
    | "INVALID_SIGNATURE"
    | "SETTLEMENT_FAILED"
    | "INTERNAL_ERROR";
  alreadyProcessed?: boolean;
  referenceId?: string;
}
