/**
 * Organization-related types for frontend display
 */

/**
 * Provider with connection status for an organization.
 */
export interface ProviderWithConnectionStatus {
  id: string;
  name: string;
  providerId: string;
  domain: string;
  authType: "oauth2" | "api_key" | "certificate" | "none";
  isConnected: boolean;
  connectionId: string | null;
  webhookUrl: string | null;
  webhookSecret: string | null;
}

/**
 * Bank connection with provider metadata.
 */
export interface BankConnectionWithProvider {
  // Connection fields
  id: string;
  name: string | null;
  connectionId: string;
  providerId: string;
  hasCredentials: boolean;
  webhookUrl: string | null;
  webhookSecret: string | null;
  createdAt: Date;
  updatedAt: Date;

  // Provider metadata
  providerName: string;
  providerDomain: string | null;
  providerAuthType: "oauth2" | "api_key" | "certificate" | "none";

  // Optional: decrypted providerConfig for pre-filling forms
  providerConfig?: Record<string, unknown>;
}
