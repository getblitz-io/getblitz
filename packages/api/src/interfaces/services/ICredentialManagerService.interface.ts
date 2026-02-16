import type {
  AuthenticatedProvider,
  BankCredentials,
  ConfiguredProvider,
  ProviderConfig,
} from "@getblitz/bank-providers";

export interface CredentialManagerResult {
  credentials: BankCredentials;
  wasRefreshed: boolean;
}

export interface ICredentialManagerService {
  isTokenExpiringSoon(
    credentials: BankCredentials,
    bufferMinutes?: number,
  ): boolean;
  encryptProviderConfig(config: ProviderConfig): string;
  decryptProviderConfig(encrypted: string): ProviderConfig;
  encryptCredentials(credentials: BankCredentials): string;
  decryptCredentials(encrypted: string): BankCredentials;

  /**
   * Create a ConfiguredProvider — has provider config, can do auth flows.
   * Use for: getAuthUrl, exchangeCode, refreshToken
   */
  createConfiguredProvider({
    connectionId,
  }: {
    connectionId: string;
  }): Promise<ConfiguredProvider>;

  /**
   * Create an AuthenticatedProvider — has both config AND credentials.
   * Handles automatic token refresh when credentials are expiring.
   * Use for: listAccounts, createWebhook, simulateSandboxPayment
   */
  createAuthenticatedProvider({
    connectionId,
  }: {
    connectionId: string;
  }): Promise<AuthenticatedProvider>;
}
