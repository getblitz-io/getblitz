import type {
  AuthenticatedProvider,
  BankCredentials,
  ConfiguredProvider,
  ProviderConfig,
} from "@getblitz/bank-providers";
import { ProviderRegistry } from "@getblitz/bank-providers";

import type {
  ICredentialManagerService,
  IOrganizationBankConnectionRepository,
} from "../interfaces";
import type { SecurityService } from "./security.service";

export class CredentialManagerService implements ICredentialManagerService {
  constructor(
    private readonly organizationBankConnectionRepository: IOrganizationBankConnectionRepository,
    private readonly securityService: SecurityService,
  ) {}

  /**
   * Encrypt provider configuration for storage
   */
  encryptProviderConfig(config: ProviderConfig): string {
    const json = JSON.stringify(config);
    return this.securityService.encrypt({ text: json });
  }

  /**
   * Decrypt provider configuration from storage
   */
  decryptProviderConfig(encrypted: string): ProviderConfig {
    const json = this.securityService.decrypt({ text: encrypted });
    return JSON.parse(json) as ProviderConfig;
  }

  /**
   * Encrypt credentials for storage
   */
  encryptCredentials(credentials: BankCredentials): string {
    const json = JSON.stringify(credentials);
    return this.securityService.encrypt({ text: json });
  }

  /**
   * Decrypt credentials from storage
   */
  decryptCredentials(encrypted: string): BankCredentials {
    const json = this.securityService.decrypt({ text: encrypted });
    const parsed = JSON.parse(json) as BankCredentials;
    // Convert expiresAt string to Date if present
    if ("expiresAt" in parsed && typeof parsed.expiresAt === "string") {
      parsed.expiresAt = new Date(parsed.expiresAt);
    }
    return parsed;
  }

  /**
   * Create a ConfiguredProvider — has provider config, can do auth flows.
   * Use for: getAuthUrl, exchangeCode, refreshToken, verifyAndParseWebhook.
   *
   * Only requires providerConfig (not credentials).
   */
  async createConfiguredProvider({
    connectionId,
  }: {
    connectionId: string;
  }): Promise<ConfiguredProvider> {
    const connection = await this.loadConnection(connectionId);

    if (!connection.providerConfig) {
      throw new Error(
        `Bank connection not fully configured: provider config missing for ${connectionId}`,
      );
    }

    const providerConfig = this.decryptProviderConfig(
      connection.providerConfig,
    );

    return ProviderRegistry.createConfiguredProvider({
      id: connection.providerId,
      config: providerConfig,
    });
  }

  /**
   * Create an AuthenticatedProvider — has both config AND credentials.
   * Use for: listAccounts, createWebhook, simulateSandboxPayment.
   *
   * Handles automatic token refresh when credentials are expiring.
   */
  async createAuthenticatedProvider({
    connectionId,
  }: {
    connectionId: string;
  }): Promise<AuthenticatedProvider> {
    const connection = await this.loadConnection(connectionId);

    // Both config and credentials are required
    if (!connection.providerConfig) {
      throw new Error(
        `Bank connection not fully configured: provider config missing for ${connectionId}`,
      );
    }
    if (!connection.credentials) {
      throw new Error(
        `Bank connection not fully configured: credentials missing for ${connectionId}`,
      );
    }

    const providerConfig = this.decryptProviderConfig(
      connection.providerConfig,
    );
    let credentials = this.decryptCredentials(connection.credentials);

    // Check if token refresh is needed
    const needsRefresh = this.isTokenExpiringSoon(credentials);

    if (needsRefresh && "refreshToken" in credentials) {
      credentials = await this.refreshCredentials({
        connectionId,
        providerId: connection.providerId,
        providerConfig,
        credentials,
        callbackUrl: connection.callbackUrl ?? undefined,
      });
    }

    return ProviderRegistry.createAuthenticatedProvider({
      id: connection.providerId,
      config: providerConfig,
      credentials,
    });
  }

  /**
   * Check if a token is expired or will expire within the buffer period.
   * Default buffer is 5 minutes to proactively refresh before expiration.
   */
  isTokenExpiringSoon(
    credentials: BankCredentials,
    bufferMinutes = 5,
  ): boolean {
    if (!("expiresAt" in credentials)) {
      // No expiration info - assume it's valid
      return false;
    }

    const expiresAt =
      credentials.expiresAt instanceof Date
        ? credentials.expiresAt
        : new Date(credentials.expiresAt);

    const bufferMs = bufferMinutes * 60 * 1000;
    const expirationThreshold = new Date(Date.now() + bufferMs);

    return expiresAt <= expirationThreshold;
  }

  // -------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------

  private async loadConnection(connectionId: string) {
    const connection = await this.organizationBankConnectionRepository.findOne({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new Error(`Bank connection not found: ${connectionId}`);
    }

    return connection;
  }

  /**
   * Perform token refresh using a ConfiguredProvider (only needs provider config).
   * Persists the new credentials to the database and returns them.
   */
  private async refreshCredentials({
    connectionId,
    providerId,
    providerConfig,
    credentials,
    callbackUrl,
  }: {
    connectionId: string;
    providerId: string;
    providerConfig: ProviderConfig;
    credentials: BankCredentials;
    callbackUrl?: string;
  }): Promise<BankCredentials> {
    // Check the provider actually supports refresh
    const providerTemplate = ProviderRegistry.getProvider(providerId);

    if (!providerTemplate) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    if (!providerTemplate.supportsTokenRefresh()) {
      throw new Error("Provider does not support token refresh");
    }

    if (!("refreshToken" in credentials)) {
      throw new Error("No refresh token available for token refresh");
    }

    // Create a ConfiguredProvider (only needs config) for the refresh call
    const configuredProvider = ProviderRegistry.createConfiguredProvider({
      id: providerId,
      config: providerConfig,
    });

    const newCredentials = await configuredProvider.refreshToken({
      refreshToken: credentials.refreshToken,
      callbackUrl,
    });

    // Persist refreshed credentials
    const encryptedCredentials = this.encryptCredentials(newCredentials);
    await this.organizationBankConnectionRepository.update({
      id: connectionId,
      data: { credentials: encryptedCredentials },
    });

    return newCredentials;
  }
}
