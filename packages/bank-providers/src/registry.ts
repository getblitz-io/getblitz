import type { BaseBankProvider } from "./base-provider";
import type {
  AuthenticatedProvider,
  BankCredentials,
  BankProvider,
  ConfiguredProvider,
  ProviderConfig,
  ProviderMetadata,
} from "./types";

/**
 * Provider constructor type — creates a template (unconfigured) instance
 */
export type ProviderConstructor = new () => BaseBankProvider;

export class ProviderRegistry {
  // Template instances for metadata/schema access
  private static providers: Map<string, BankProvider> = new Map<
    string,
    BankProvider
  >();
  // Constructors for creating configured instances
  private static constructors: Map<string, ProviderConstructor> = new Map<
    string,
    ProviderConstructor
  >();

  /**
   * Register a provider class with a template instance
   */
  static register(ProviderClass: ProviderConstructor) {
    // Create a template instance for metadata access (no config needed for metadata)
    const template = new ProviderClass();
    ProviderRegistry.providers.set(template.id, template);
    ProviderRegistry.constructors.set(template.id, ProviderClass);
  }

  /**
   * Get the template provider instance (for metadata and schema access)
   */
  static getProvider(id: string): BankProvider | undefined {
    return ProviderRegistry.providers.get(id);
  }

  /**
   * Create a ConfiguredProvider — has provider config, can do auth flows.
   * Use for: getAuthUrl, exchangeCode, refreshToken, verifyAndParseWebhook
   */
  static createConfiguredProvider({
    id,
    config,
  }: {
    id: string;
    config: ProviderConfig;
  }): ConfiguredProvider {
    const template = ProviderRegistry.providers.get(id);
    if (!template) {
      throw new Error(`Provider not found: ${id}`);
    }
    return template.withProviderConfig(config);
  }

  /**
   * Create an AuthenticatedProvider — has both config and credentials.
   * Use for: listAccounts, createWebhook, simulateSandboxPayment
   */
  static createAuthenticatedProvider({
    id,
    config,
    credentials,
  }: {
    id: string;
    config: ProviderConfig;
    credentials: BankCredentials;
  }): AuthenticatedProvider {
    const template = ProviderRegistry.providers.get(id);
    if (!template) {
      throw new Error(`Provider not found: ${id}`);
    }
    return template.withCredentials(config, credentials);
  }

  /**
   * Get all registered providers
   */
  static getAllProviders(): BankProvider[] {
    return Array.from(ProviderRegistry.providers.values());
  }

  /**
   * Get metadata for all providers (for UI dropdown)
   */
  static getAllProviderMetadata(): ProviderMetadata[] {
    return Array.from(ProviderRegistry.providers.values()).map((provider) => ({
      id: provider.id,
      displayName: provider.displayName,
      domain: provider.domain,
      authType: provider.authType,
      oauthFlowType: provider.oauthFlowType,
      setupGuideUrl: provider.getSetupGuide(),
      isTestProvider: provider.isTestProvider,
      customConfigComponentId: provider.getCustomConfigComponentId(),
    }));
  }
}
