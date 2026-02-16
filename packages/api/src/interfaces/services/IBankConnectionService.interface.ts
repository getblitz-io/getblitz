import type { OrganizationBankConnection } from "@getblitz/database";

import type { CreateOrganizationBankConnectionInput } from "..";

export interface SetupWebhookParams {
  connectionId: string;
}

export interface SetupWebhookResult {
  success: boolean;
  error?: string;
}

export interface IBankConnectionService {
  create(params: {
    data: CreateOrganizationBankConnectionInput;
  }): Promise<OrganizationBankConnection>;
  findById(params: {
    connectionId: string;
  }): Promise<OrganizationBankConnection | null>;
  findByOrganizationAndProvider(params: {
    organizationId: string;
    providerId: string;
  }): Promise<OrganizationBankConnection | null>;
  update(params: {
    id: string;
    data: Partial<
      Omit<
        CreateOrganizationBankConnectionInput,
        "organizationId" | "providerId"
      >
    >;
  }): Promise<OrganizationBankConnection>;
  setupWebhook(params: SetupWebhookParams): Promise<SetupWebhookResult>;
  cleanupExpiredConnections(): Promise<{
    expiredCount: number;
    cutoffDate: Date;
  }>;
}
