import type { OrganizationBankConnection } from "@getblitz/database";
import { BankConnectionStatus } from "@getblitz/database";

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

const EXPIRED_CONNECTIONS_MAX_AGE_HOURS = 24;

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

  async cleanupExpiredConnections() {
    const cutoffDate = new Date(
      Date.now() - EXPIRED_CONNECTIONS_MAX_AGE_HOURS * 60 * 60 * 1000,
    );

    const result = await this.organizationBankConnectionRepository.updateMany({
      where: {
        status: {
          in: [
            BankConnectionStatus.PENDING_CONFIG,
            BankConnectionStatus.PENDING_OAUTH,
          ],
        },
        createdAt: {
          lt: cutoffDate,
        },
      },
      data: {
        status: BankConnectionStatus.EXPIRED,
      },
    });

    return {
      expiredCount: result.count,
      cutoffDate,
    };
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
  }: SetupWebhookParams): Promise<SetupWebhookResult> {
    try {
      // Decrypt provider config and create authenticated provider instance
      const provider = await this.credentialManager.createAuthenticatedProvider(
        {
          connectionId,
        },
      );

      const webhookUrl = this.buildWebhookUrl(connectionId);
      const webhookResult = await provider.createWebhook({
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
