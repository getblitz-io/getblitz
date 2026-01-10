import type { BankCredentials, ProviderConfig } from "@getblitz/bank-providers";
import { ProviderRegistry } from "@getblitz/bank-providers";

import type {
  CredentialManagerResult,
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
    if (parsed.expiresAt && typeof parsed.expiresAt === "string") {
      parsed.expiresAt = new Date(parsed.expiresAt);
    }
    return parsed;
  }

  /**
   * Get valid credentials for a bank connection, refreshing if needed.
   * This is the primary method to use before making any provider API calls.
   */
  async getValidCredentials({
    connectionId,
  }: {
    connectionId: string;
  }): Promise<CredentialManagerResult> {
    // 1. Load connection from database
    const connection = await this.organizationBankConnectionRepository.findById(
      {
        id: connectionId,
      },
    );

    if (!connection) {
      throw new Error(`Bank connection not found: ${connectionId}`);
    }

    // 2. Check credentials exist (null means OAuth not yet completed)
    if (!connection.credentials) {
      throw new Error(
        `Bank connection not fully configured: credentials missing for ${connectionId}`,
      );
    }

    // 3. Decrypt stored credentials and provider config
    const credentials = this.decryptCredentials(connection.credentials);
    const providerConfig = this.decryptProviderConfig(
      connection.providerConfig,
    );

    // 4. Get provider template to check if it supports token refresh
    const providerTemplate = ProviderRegistry.getProvider(
      connection.providerId,
    );

    if (!providerTemplate) {
      throw new Error(`Provider not found: ${connection.providerId}`);
    }

    // 5. Check if refresh is needed and supported
    const needsRefresh = this.isTokenExpiringSoon(credentials);
    const supportsRefresh = providerTemplate.supportsTokenRefresh();

    if (!needsRefresh || !supportsRefresh) {
      return { credentials, wasRefreshed: false };
    }

    // 6. Validate we have a refresh token
    if (!credentials.refreshToken) {
      throw new Error("No refresh token available for token refresh");
    }

    // 7. Create a configured provider instance for the refresh operation
    const configuredProvider = ProviderRegistry.createProvider(
      connection.providerId,
      providerConfig,
    );

    if (!configuredProvider.refreshToken) {
      throw new Error("Provider refresh token implementation is missing");
    }

    // 8. Refresh the token
    const newCredentials = await configuredProvider.refreshToken({
      refreshToken: credentials.refreshToken,
    });

    // 9. Encrypt and persist new credentials to database
    const encryptedCredentials = this.encryptCredentials(newCredentials);
    await this.organizationBankConnectionRepository.update({
      id: connectionId,
      data: { credentials: encryptedCredentials },
    });

    return { credentials: newCredentials, wasRefreshed: true };
  }

  /**
   * Check if a token is expired or will expire within the buffer period.
   * Default buffer is 5 minutes to proactively refresh before expiration.
   */
  isTokenExpiringSoon(
    credentials: BankCredentials,
    bufferMinutes = 5,
  ): boolean {
    if (!credentials.expiresAt) {
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
}
