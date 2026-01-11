import type { OrganizationBankConnection } from "@getblitz/database";
import { ProviderRegistry } from "@getblitz/bank-providers";

import type {
  CreateOrganizationBankConnectionInput,
  IBankConnectionService,
  ICredentialManagerService,
  IOrganizationBankConnectionRepository,
  SetupWebhookParams,
  SetupWebhookResult,
} from "../interfaces";
import { env } from "../env";
import { NotFoundError } from "../interfaces";

export class BankConnectionService implements IBankConnectionService {
  constructor(
    private readonly organizationBankConnectionRepository: IOrganizationBankConnectionRepository,
    private readonly credentialManager: ICredentialManagerService,
  ) {}

  async create({
    data,
  }: {
    data: CreateOrganizationBankConnectionInput;
  }): Promise<OrganizationBankConnection> {
    return this.organizationBankConnectionRepository.create({ data });
  }

  async findById({
    connectionId,
  }: {
    connectionId: string;
  }): Promise<OrganizationBankConnection | null> {
    return this.organizationBankConnectionRepository.findById({
      id: connectionId,
    });
  }

  async findByOrganizationAndProvider({
    organizationId,
    providerId,
  }: {
    organizationId: string;
    providerId: string;
  }): Promise<OrganizationBankConnection | null> {
    return this.organizationBankConnectionRepository.findByOrganizationIdAndProviderId(
      {
        organizationId,
        providerId,
      },
    );
  }

  async update({
    id,
    data,
  }: {
    id: string;
    data: Partial<
      Omit<
        CreateOrganizationBankConnectionInput,
        "organizationId" | "providerId"
      >
    >;
  }): Promise<OrganizationBankConnection> {
    const connection = await this.organizationBankConnectionRepository.findById(
      { id },
    );
    if (!connection)
      throw new NotFoundError("Organization bank connection not found");

    return this.organizationBankConnectionRepository.update({ id, data });
  }

  async setupWebhook({
    connectionId,
    providerId,
    credentials: providedCredentials,
  }: SetupWebhookParams): Promise<SetupWebhookResult> {
    // Get the connection to access provider config
    const connection = await this.organizationBankConnectionRepository.findById(
      { id: connectionId },
    );
    if (!connection) {
      return { success: false, error: "Connection not found" };
    }
    if (!connection.providerConfig) {
      return { success: false, error: "Connection not fully configured" };
    }

    // Decrypt provider config and create configured provider instance
    const providerConfig = this.credentialManager.decryptProviderConfig(
      connection.providerConfig,
    );
    const provider = ProviderRegistry.createProvider(
      providerId,
      providerConfig,
    );

    if (!provider.createWebhook) {
      return { success: false, error: "Provider does not support webhooks" };
    }

    try {
      // Use provided credentials or fetch valid ones via credential manager
      const credentials =
        providedCredentials ??
        (await this.credentialManager.getValidCredentials({ connectionId }))
          .credentials;

      const webhookUrl = this.buildWebhookUrl(connectionId);
      const webhookResult = await provider.createWebhook({
        credentials,
        webhookUrl,
      });

      await this.organizationBankConnectionRepository.update({
        id: connectionId,
        data: { webhookUrl, webhookSecret: webhookResult.secret },
      });

      return { success: true };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Webhook setup failed";
      console.warn("Webhook creation failed", err);
      return { success: false, error: message };
    }
  }

  private buildWebhookUrl(connectionId: string): string {
    return `${env.NEXT_PUBLIC_APP_URL}/api/webhooks/connection/${connectionId}`;
  }
}
