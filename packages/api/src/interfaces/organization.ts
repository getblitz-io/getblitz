/**
 * Organization-related types for frontend display
 */

import type { OAuthAuthType, OAuthFlowType } from "@getblitz/bank-providers";
import type { BankConnectionStatus } from "@getblitz/database";

/**
 * Provider with connection status for an organization.
 */
export interface ProviderWithConnectionStatus {
  id: string;
  name: string;
  providerId: string;
  domain: string;
  authType: OAuthAuthType;
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
  status: BankConnectionStatus;
  webhookUrl: string | null;
  webhookSecret: string | null;
  callbackUrl: string;
  createdAt: Date;
  updatedAt: Date;

  // Provider metadata
  providerName: string;
  providerDomain: string | null;
  providerAuthType: OAuthAuthType;
  providerOAuthFlowType: OAuthFlowType;
  providerSetupGuideUrl: string | null;

  // Optional: decrypted providerConfig for pre-filling forms
  providerConfig?: Record<string, unknown>;
}
