import type { z } from "zod";

import type { QontoBankCredentials } from "./providers/qonto/types";
import type { RevolutBankCredentials } from "./providers/revolut/types";
import type { TestBankCredentials } from "./providers/test-bank/adapter";
import type { WiseBankCredentials } from "./providers/wise/types";

export enum WebhookVerificationStatus {
  Error = "error",
  Ignore = "ignore",
  Success = "success",
}

export type WebhookVerificationResult =
  | { status: WebhookVerificationStatus.Error; error: string }
  | { status: WebhookVerificationStatus.Ignore; reason: string }
  | {
      status: WebhookVerificationStatus.Success;
      referenceId: string;
      txHash: string;
      amountCents: number;
      currency: string;
      rawPayload: unknown;
    };

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface BaseBankCredentials {}

export type BankCredentials =
  | TestBankCredentials
  | RevolutBankCredentials
  | QontoBankCredentials
  | WiseBankCredentials;

export interface AccountConfig {
  iban?: string;
  accountId?: string;
  [key: string]: unknown;
}

export type OAuthAuthType = "oauth2" | "api_key" | "certificate" | "none";

export interface BankProviderBankAccount {
  id: string;
  name: string;
  iban: string;
  currency: string;
  bic: string;
  bankIdentifierName: string;
}

/**
 * Provider configuration stored per-organization.
 * Contains settings needed to initialize a provider (clientId, keys, sandboxMode, etc.).
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ProviderConfig {}

/**
 * Metadata about a provider for UI display
 */
export interface ProviderMetadata {
  id: string;
  displayName: string;
  domain: string;
  authType: OAuthAuthType;
  oauthFlowType: OAuthFlowType;
  setupGuideUrl: string | null;
  isTestProvider: boolean;
  customConfigComponentId: string | null;
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
  /** Injected or system-owned — omit from the generic form UI */
  hidden?: boolean;
}

export interface ProviderConfigSchema {
  fields: ProviderConfigField[];
}

export type OAuthFlowType = "redirect" | "manual-consent" | "none";

/** Input passed to {@link BankProvider.preSaveConfigHook} before persisting config. */
export interface ProviderConfigPreSaveContext {
  config: ProviderConfig;
  credentials: BankCredentials | null;
}

/** Input passed to {@link BankProvider.postSaveConfigHook} after config is persisted. */
export interface ProviderConfigPostSaveContext extends ProviderConfigPreSaveContext {
  connectionId: string;
}

/**
 * Phase 1: Template / Metadata provider (no config, no credentials).
 *
 * Returned by `ProviderRegistry.getProvider()`. Can access metadata,
 * config schema, and transition to configured/authenticated phases.
 */
export interface BankProvider {
  // Static metadata
  readonly id: string;
  readonly displayName: string;
  readonly domain: string;
  readonly authType: OAuthAuthType;
  readonly oauthFlowType: OAuthFlowType;
  readonly isTestProvider: boolean;

  // Documentation
  getSetupGuide(): string | null;

  /**
   * Return a custom UI component identifier for provider-specific setup steps.
   * Returns null for providers that work with the default generic config form.
   * The frontend maps this ID to a lazy-loaded React component.
   */
  getCustomConfigComponentId(): string | null;

  /**
   * Field names that must be collected before the custom config step can run
   * (e.g. Wise: API token before profile picker). Empty if custom step is first or N/A.
   */
  getFieldNamesBeforeCustomStep(): string[];

  /**
   * For providers without OAuth (no exchangeCode), derive credentials to store
   * when saving provider config. OAuth providers return null.
   */
  getCredentialsFromSavedConfig(config: ProviderConfig): BankCredentials | null;

  /**
   * Runs before provider config (and derived credentials) are written to the DB.
   * Use to validate config against external APIs, reject invalid combinations, etc.
   * Default implementation is a no-op.
   */
  preSaveConfigHook(context: ProviderConfigPreSaveContext): Promise<void>;

  /**
   * Runs after provider config is persisted. Receives the saved connection id.
   * Use for provider-specific side effects that must happen only once config is stored.
   * Default implementation is a no-op.
   */
  postSaveConfigHook(context: ProviderConfigPostSaveContext): Promise<void>;

  // Provider configuration schema for dynamic form
  getProviderConfigSchema(): ProviderConfigSchema;
  getDefaultConfig(sandboxMode?: boolean): ProviderConfig;

  // Credential / account schemas
  getCredentialSchema(): z.ZodObject<z.ZodRawShape>;
  getAccountSchema(): z.ZodObject<z.ZodRawShape>;

  // Capability checks
  supportsTokenRefresh(): boolean;
  supportsSandboxSimulation(): boolean;

  // Phase transitions — produce progressively more capable instances
  withProviderConfig(config: ProviderConfig): ConfiguredProvider;
  withCredentials(
    config: ProviderConfig,
    credentials: BankCredentials,
  ): AuthenticatedProvider;
}

/**
 * Phase 2: Configured provider (has provider config, no credentials yet).
 *
 * Can perform auth flows (getAuthUrl, exchangeCode, refreshToken) and
 * webhook verification (signing secrets are passed as params).
 */
export interface ConfiguredProvider {
  readonly id: string;

  // Auth flows (for merchant setup)
  getAuthUrl(params: { redirectUri: string; state: string }): string;
  exchangeCode(params: {
    code: string;
    redirectUri?: string;
  }): Promise<BankCredentials>;
  refreshToken(params: {
    refreshToken: string;
    callbackUrl?: string;
  }): Promise<BankCredentials>;

  // Webhook handling & account validation
  verifyAndParseWebhook(params: {
    request: Request;
    secret?: string;
  }): Promise<WebhookVerificationResult>;
  validateAccount(params: { account: AccountConfig }): Promise<boolean>;
}

/**
 * Phase 3: Authenticated provider (has both config AND credentials).
 *
 * Can make API calls that require an access token: list accounts,
 * create webhooks, simulate sandbox payments, etc.
 */
export interface AuthenticatedProvider extends ConfiguredProvider {
  supportsSandboxSimulation(): boolean;
  listAccounts(): Promise<BankProviderBankAccount[]>;
  createWebhook(params: {
    webhookUrl: string;
  }): Promise<{ id: string; secret: string }>;
  simulateSandboxPayment(params: {
    accountId: string;
    amount: number;
    currency: string;
    reference: string;
  }): Promise<{ success: boolean; error?: string }>;
}
