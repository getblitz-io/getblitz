import type { z } from "zod";

export type WebhookVerificationResult =
  | { valid: false; error: string }
  | {
      valid: true;
      referenceId: string;
      txHash: string;
      amountCents: number;
      currency: string;
      rawPayload: unknown;
    };

export interface BankCredentials {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  apiKey?: string;
  [key: string]: unknown;
}

export interface AccountConfig {
  iban?: string;
  accountId?: string;
  [key: string]: unknown;
}

export interface BankProviderBankAccount {
  id: string;
  name: string;
  iban: string;
  currency: string;
  bic: string;
}

/**
 * Provider configuration stored per-organization.
 * Contains credentials and settings needed to initialize a provider.
 */
export type ProviderConfig = Record<string, unknown>;

/**
 * Metadata about a provider for UI display
 */
export interface ProviderMetadata {
  id: string;
  displayName: string;
  domain: string;
  authType: "oauth2" | "api_key" | "certificate" | "none";
  oauthFlowType: OAuthFlowType;
  setupGuideUrl: string | null;
  isTestProvider: boolean;
}

/**
 * JSON Schema representation for dynamic form rendering
 */
export interface ProviderConfigField {
  name: string;
  type: "string" | "boolean" | "number" | "textarea";
  label: string;
  description?: string;
  required: boolean;
  secret?: boolean; // For password-style inputs
  defaultValue?: string | boolean | number;
  dependsOn?: { field: string; value: unknown }; // Conditional visibility
}

export interface ProviderConfigSchema {
  fields: ProviderConfigField[];
}

export type OAuthFlowType = "redirect" | "manual-consent" | "none";

export interface BankProvider {
  // Static metadata (replaces Bank table fields)
  readonly id: string;
  readonly displayName: string;
  readonly domain: string;
  readonly authType: "oauth2" | "api_key" | "certificate" | "none";
  readonly oauthFlowType: OAuthFlowType;
  readonly isTestProvider: boolean;

  // Documentation
  getSetupGuide(): string | null;

  // Provider configuration schema for dynamic form
  getProviderConfigSchema(): ProviderConfigSchema;
  getDefaultConfig(sandboxMode?: boolean): ProviderConfig;

  // Credential schema (for OAuth tokens stored after connection)
  getCredentialSchema(): z.ZodObject<z.ZodRawShape>;
  getAccountSchema(): z.ZodObject<z.ZodRawShape>;

  // Webhook handling
  verifyAndParseWebhook({
    request,
    secret,
    credentials,
  }: {
    request: Request;
    secret?: string;
    credentials?: BankCredentials;
  }): Promise<WebhookVerificationResult>;

  // Auth flows (for merchant setup)
  getAuthUrl?({
    redirectUri,
    state,
  }: {
    redirectUri: string;
    state: string;
  }): string;
  exchangeCode?({
    code,
    redirectUri,
  }: {
    code: string;
    redirectUri?: string;
  }): Promise<BankCredentials>;

  // Account operations
  validateAccount({
    credentials,
    account,
  }: {
    credentials: BankCredentials;
    account: AccountConfig;
  }): Promise<boolean>;
  listAccounts?({
    credentials,
  }: {
    credentials: BankCredentials;
  }): Promise<BankProviderBankAccount[]>;
  createWebhook?({
    credentials,
    webhookUrl,
  }: {
    credentials: BankCredentials;
    webhookUrl: string;
  }): Promise<{ id: string; secret: string }>;

  // Token refresh (for OAuth2 providers)
  refreshToken?({
    refreshToken,
    callbackUrl,
  }: {
    refreshToken: string;
    callbackUrl?: string; // Optional: needed by some providers (e.g., Revolut) for JWT generation
  }): Promise<BankCredentials>;

  // Helper to check if provider supports token refresh
  supportsTokenRefresh(): boolean;

  // Helper to check if provider supports sandbox simulation
  supportsSandboxSimulation(): boolean;

  // Sandbox simulation (for providers that support it)
  simulateSandboxPayment?({
    credentials,
    accountId,
    amount,
    currency,
    reference,
  }: {
    credentials: BankCredentials;
    accountId: string;
    amount: number;
    currency: string;
    reference: string;
  }): Promise<{ success: boolean; error?: string }>;
}
