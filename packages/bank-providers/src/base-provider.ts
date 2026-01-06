/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unused-vars */
import type { z } from "zod";

import type {
  AccountConfig,
  BankCredentials,
  BankProvider,
  ProviderConfig,
  ProviderConfigSchema,
  WebhookVerificationResult,
} from "./types";

export abstract class BaseBankProvider implements BankProvider {
  // Static metadata (replaces Bank table fields)
  abstract readonly id: string;
  abstract readonly displayName: string;
  abstract readonly domain: string;
  abstract readonly authType: "oauth2" | "api_key" | "certificate" | "none";
  readonly isTestProvider: boolean = false;

  // Documentation
  abstract getSetupGuide(): string | null;

  // Provider configuration for dynamic form
  abstract getProviderConfigSchema(): ProviderConfigSchema;
  abstract getDefaultConfig(sandboxMode?: boolean): ProviderConfig;

  abstract getCredentialSchema(): z.ZodObject<z.ZodRawShape>;
  abstract getAccountSchema(): z.ZodObject<z.ZodRawShape>;

  abstract verifyAndParseWebhook({
    request,
    secret,
  }: {
    request: Request;
    secret?: string;
  }): Promise<WebhookVerificationResult>;

  abstract validateAccount({
    credentials,
    account,
  }: {
    credentials: BankCredentials;
    account: AccountConfig;
  }): Promise<boolean>;

  // Default implementations for optional methods
  getAuthUrl?({
    redirectUri,
    state,
  }: {
    redirectUri: string;
    state: string;
  }): string {
    throw new Error("getAuthUrl not implemented for this provider");
  }

  async exchangeCode?({
    code,
    redirectUri,
  }: {
    code: string;
    redirectUri?: string;
  }): Promise<BankCredentials> {
    throw new Error("exchangeCode not implemented for this provider");
  }

  async listAccounts?({
    credentials,
  }: {
    credentials: BankCredentials;
  }): Promise<
    { id: string; name: string; iban: string; currency: string; bic: string }[]
  > {
    throw new Error("listAccounts not implemented for this provider");
  }

  async createWebhook?({
    credentials,
    webhookUrl,
  }: {
    credentials: BankCredentials;
    webhookUrl: string;
  }): Promise<{ id: string; secret: string }> {
    throw new Error("createWebhook not implemented for this provider");
  }

  async refreshToken?({
    refreshToken,
  }: {
    refreshToken: string;
  }): Promise<BankCredentials> {
    throw new Error("refreshToken not implemented for this provider");
  }

  supportsTokenRefresh(): boolean {
    return this.authType === "oauth2";
  }
}
