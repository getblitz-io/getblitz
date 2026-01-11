import type { BankProvider, ProviderConfig, ProviderMetadata } from "./types";

/**
 * Provider constructor type for creating instances with config
 */
export type ProviderConstructor = new (config?: ProviderConfig) => BankProvider;

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
   * Create a new provider instance with the given configuration
   */
  static createProvider(id: string, config: ProviderConfig): BankProvider {
    const Constructor = ProviderRegistry.constructors.get(id);
    if (!Constructor) {
      throw new Error(`Provider not found: ${id}`);
    }
    return new Constructor(config);
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
    }));
  }
}
