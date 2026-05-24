/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unused-vars */
import type { z } from "zod";

import type {
  AccountConfig,
  AuthenticatedProvider,
  BankCredentials,
  BankProvider,
  BankProviderBankAccount,
  ConfiguredProvider,
  OAuthFlowType,
  ProviderConfig,
  ProviderConfigPostSaveContext,
  ProviderConfigPreSaveContext,
  ProviderConfigSchema,
  WebhookVerificationResult,
} from "./types";

/**
 * Abstract base class for bank providers.
 *
 * Implements the three-phase type system:
 * - Template (no config/credentials) → metadata & schema access
 * - Configured (has provider config) → auth flows & webhook verification
 * - Authenticated (has provider config + credentials) → API calls
 *
 * Concrete adapters extend this class and override:
 * - Abstract metadata/schema methods
 * - `applyProviderConfig()` to validate & store provider config fields
 * - `applyCredentials()` to validate & store credential fields
 * - Operation methods (verifyAndParseWebhook, listAccounts, etc.)
 */
export abstract class BaseBankProvider
  implements BankProvider, ConfiguredProvider, AuthenticatedProvider
{
  // Static metadata (replaces Bank table fields)
  abstract readonly id: string;
  abstract readonly displayName: string;
  abstract readonly domain: string;
  abstract readonly authType: "oauth2" | "api_key" | "certificate" | "none";
  abstract readonly oauthFlowType: OAuthFlowType;
  readonly isTestProvider: boolean = false;

  // Documentation
  abstract getSetupGuide(): string | null;

  /**
   * Return null by default — only override when the provider needs
   * a custom UI step (e.g. Wise profile selection).
   */
  getCustomConfigComponentId(): string | null {
    return null;
  }

  getFieldNamesBeforeCustomStep(): string[] {
    return [];
  }

  getCredentialsFromSavedConfig(
    _config: ProviderConfig,
  ): BankCredentials | null {
    return null;
  }

  async preSaveConfigHook(
    _context: ProviderConfigPreSaveContext,
  ): Promise<void> {
    /* empty */
  }

  async postSaveConfigHook(
    _context: ProviderConfigPostSaveContext,
  ): Promise<void> {
    /* empty */
  }

  // Provider configuration for dynamic form
  abstract getProviderConfigSchema(): ProviderConfigSchema;
  abstract getDefaultConfig(sandboxMode?: boolean): ProviderConfig;

  abstract getCredentialSchema(): z.ZodObject<z.ZodRawShape>;
  abstract getAccountSchema(): z.ZodObject<z.ZodRawShape>;

  /**
   * Apply provider configuration to a new instance.
   * Concrete adapters override to validate and store config fields.
   */
  protected abstract applyProviderConfig(config: ProviderConfig): void;

  /**
   * Apply credentials to a new instance.
   * Concrete adapters override to validate and store credential fields.
   */
  protected abstract applyCredentials(credentials: BankCredentials): void;

  /**
   * Create a fresh copy of this provider for phase transitions.
   * Concrete adapters implement this to return `new ConcreteProvider()`.
   */
  protected abstract createInstance(): BaseBankProvider;

  /**
   * Phase 1 → Phase 2: Create a ConfiguredProvider with provider config.
   */
  withProviderConfig(config: ProviderConfig): ConfiguredProvider {
    const instance = this.createInstance();
    instance.applyProviderConfig(config);
    return instance;
  }

  /**
   * Phase 1 → Phase 3: Create an AuthenticatedProvider with both config and credentials.
   */
  withCredentials(
    config: ProviderConfig,
    credentials: BankCredentials,
  ): AuthenticatedProvider {
    const instance = this.createInstance();
    instance.applyProviderConfig(config);
    instance.applyCredentials(credentials);
    return instance;
  }

  abstract verifyAndParseWebhook(params: {
    request: Request;
    secret?: string;
  }): Promise<WebhookVerificationResult>;

  abstract validateAccount(params: {
    account: AccountConfig;
  }): Promise<boolean>;

  // Default implementations for optional methods
  getAuthUrl(params: { redirectUri: string; state: string }): string {
    throw new Error("getAuthUrl not implemented for this provider");
  }

  async exchangeCode(params: {
    code: string;
    redirectUri?: string;
  }): Promise<BankCredentials> {
    throw new Error("exchangeCode not implemented for this provider");
  }

  async listAccounts(): Promise<BankProviderBankAccount[]> {
    throw new Error("listAccounts not implemented for this provider");
  }

  async createWebhook(params: {
    webhookUrl: string;
  }): Promise<{ id: string; secret: string }> {
    throw new Error("createWebhook not implemented for this provider");
  }

  async refreshToken(params: {
    refreshToken: string;
    callbackUrl?: string;
  }): Promise<BankCredentials> {
    throw new Error("refreshToken not implemented for this provider");
  }

  simulateSandboxPayment(params: {
    accountId: string;
    amount: number;
    currency: string;
    reference: string;
  }): Promise<{ success: boolean; error?: string }> {
    throw new Error("Method not implemented.");
  }

  supportsTokenRefresh(): boolean {
    return this.authType === "oauth2";
  }

  supportsSandboxSimulation(): boolean {
    return false;
  }
}
