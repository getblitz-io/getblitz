import type {
  BankAccount,
  OrganizationSecretKey,
  OrganizationWebhook,
} from "@getblitz/database";
import { BankConnectionStatus } from "@getblitz/database";

import type {
  AddBankAccountInput,
  CreateOrganizationWebhookInput,
  DashboardStats,
  IApiKeyRepository,
  IBankAccountRepository,
  IOrganizationBankConnectionRepository,
  IOrganizationRepository,
  IOrganizationService,
  IOrganizationWebhookRepository,
  IPaymentSessionRepository,
  OrganizationCounts,
  OrganizationWithDetails,
  UpdateOrganizationWebhookInput,
} from "../interfaces";

export class ForbiddenError extends Error {
  override name = "ForbiddenError" as const;
}

export class NotFoundError extends Error {
  override name = "NotFoundError" as const;
}

export class ConflictError extends Error {
  override name = "ConflictError" as const;
}

export class OrganizationService implements IOrganizationService {
  constructor(
    private readonly organizationRepository: IOrganizationRepository,
    private readonly apiKeyRepository: IApiKeyRepository,
    private readonly paymentSessionRepository: IPaymentSessionRepository,
    private readonly bankAccountRepository: IBankAccountRepository,
    private readonly organizationWebhookRepository: IOrganizationWebhookRepository,
    private readonly organizationBankConnectionRepository: IOrganizationBankConnectionRepository,
  ) {}

  /**
   * Get organization by ID with access check
   */
  async getById({
    id,
    userId,
  }: {
    id: string;
    userId: string;
  }): Promise<OrganizationWithDetails> {
    const organization = await this.organizationRepository.findById({ id });

    if (!organization) {
      throw new NotFoundError("Organization not found");
    }

    // Verify user has access
    const member = await this.organizationRepository.findMemberByUserAndOrg({
      userId,
      organizationId: id,
    });

    if (!member) {
      throw new ForbiddenError("You don't have access to this organization");
    }

    return organization;
  }

  /**
   * Get organization by slug with access check
   */
  async getBySlug({
    slug,
    userId,
  }: {
    slug: string;
    userId: string;
  }): Promise<OrganizationWithDetails> {
    const organization = await this.organizationRepository.findBySlug({ slug });

    if (!organization) {
      throw new NotFoundError("Organization not found");
    }

    // Verify user has access
    const member = await this.organizationRepository.findMemberByUserAndOrg({
      userId,
      organizationId: organization.id,
    });

    if (!member) {
      throw new ForbiddenError("You don't have access to this organization");
    }

    return organization;
  }

  /**
   * Generate a new API key for an organization
   */
  async generateApiKey({
    organizationId,
    userId,
  }: {
    organizationId: string;
    userId: string;
  }): Promise<OrganizationSecretKey> {
    // Verify user has access
    const member = await this.organizationRepository.findMemberByUserAndOrg({
      userId,
      organizationId,
    });

    if (!member) {
      throw new ForbiddenError("You don't have access to this organization");
    }

    return this.apiKeyRepository.create({ organizationId });
  }

  /**
   * Delete an API key
   */
  async deleteApiKey({
    keyId,
    userId,
  }: {
    keyId: string;
    userId: string;
  }): Promise<OrganizationSecretKey> {
    const key = await this.apiKeyRepository.findByIdWithOrganization({
      id: keyId,
    });

    if (!key) {
      throw new NotFoundError("API key not found");
    }

    // Verify user has access
    const member = await this.organizationRepository.findMemberByUserAndOrg({
      userId,
      organizationId: key.organizationId,
    });

    if (!member) {
      throw new ForbiddenError("You don't have access to this organization");
    }

    return this.apiKeyRepository.delete({ id: keyId });
  }

  /**
   * Add a bank account to an organization
   */
  async addBankAccount({
    input,
    userId,
  }: {
    input: AddBankAccountInput;
    userId: string;
  }): Promise<BankAccount> {
    // Verify user has access
    const member = await this.organizationRepository.findMemberByUserAndOrg({
      userId,
      organizationId: input.organizationId,
    });

    if (!member) {
      throw new ForbiddenError("You don't have access to this organization");
    }

    const organizationBankConnection =
      await this.organizationBankConnectionRepository.findByOrganizationIdAndProviderId(
        { organizationId: input.organizationId, providerId: input.providerId },
      );
    if (
      !organizationBankConnection ||
      organizationBankConnection.status !== BankConnectionStatus.CONNECTED
    ) {
      throw new NotFoundError(
        "Organization bank connection not found or not connected",
      );
    }

    const bankAccount = await this.bankAccountRepository.create({
      data: {
        organizationBankConnectionId: organizationBankConnection.id,
        accountName: input.accountName,
        accountIban: input.accountIban,
        accountBic: input.accountBic,
      },
    });

    if (input.isDefault) {
      await this.bankAccountRepository.setDefault({
        organizationId: input.organizationId,
        bankAccountId: bankAccount.id,
      });
    }

    return bankAccount;
  }

  /**
   * Delete a bank account
   */
  async deleteBankAccount({
    bankAccountId,
    userId,
  }: {
    bankAccountId: string;
    userId: string;
  }): Promise<BankAccount> {
    const bankAccount = await this.bankAccountRepository.findById({
      id: bankAccountId,
    });
    if (!bankAccount) throw new NotFoundError("Bank account not found");

    const member = await this.organizationRepository.findMemberByUserAndOrg({
      userId,
      organizationId: bankAccount.organizationBankConnection.organizationId,
    });
    if (!member) throw new ForbiddenError("Access denied");

    return this.bankAccountRepository.delete({ id: bankAccountId });
  }

  /**
   * Set a bank account as default
   */
  async setDefaultBankAccount({
    bankAccountId,
    userId,
  }: {
    bankAccountId: string;
    userId: string;
  }): Promise<void> {
    const bankAccount = await this.bankAccountRepository.findById({
      id: bankAccountId,
    });
    if (!bankAccount) throw new NotFoundError("Bank account not found");

    const member = await this.organizationRepository.findMemberByUserAndOrg({
      userId,
      organizationId: bankAccount.organizationBankConnection.organizationId,
    });
    if (!member) throw new ForbiddenError("Access denied");

    await this.bankAccountRepository.setDefault({
      organizationId: bankAccount.organizationBankConnection.organizationId,
      bankAccountId,
    });
  }

  /**
   * Create a new organization webhook
   */
  async createWebhook({
    input,
    userId,
  }: {
    input: CreateOrganizationWebhookInput;
    userId: string;
  }): Promise<OrganizationWebhook> {
    const member = await this.organizationRepository.findMemberByUserAndOrg({
      userId,
      organizationId: input.organizationId,
    });
    if (!member) throw new ForbiddenError("Access denied");

    return this.organizationWebhookRepository.create({
      organizationId: input.organizationId,
      data: {
        webhookUrl: input.webhookUrl,
        webhookSecret: input.webhookSecret,
        notifyPaymentSuccess: input.notifyPaymentSuccess,
        notifyPaymentFailed: input.notifyPaymentFailed,
        notifyPaymentExpired: input.notifyPaymentExpired,
      },
    });
  }

  /**
   * Update an existing webhook
   */
  async updateWebhook({
    input,
    userId,
  }: {
    input: UpdateOrganizationWebhookInput;
    userId: string;
  }): Promise<OrganizationWebhook> {
    const webhook = await this.organizationWebhookRepository.findById({
      id: input.webhookId,
    });
    if (!webhook) throw new NotFoundError("Webhook not found");

    const member = await this.organizationRepository.findMemberByUserAndOrg({
      userId,
      organizationId: webhook.organizationId,
    });
    if (!member) throw new ForbiddenError("Access denied");

    return this.organizationWebhookRepository.update({
      id: input.webhookId,
      data: {
        webhookUrl: input.webhookUrl,
        webhookSecret: input.webhookSecret,
        notifyPaymentSuccess: input.notifyPaymentSuccess,
        notifyPaymentFailed: input.notifyPaymentFailed,
        notifyPaymentExpired: input.notifyPaymentExpired,
      },
    });
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook({
    webhookId,
    userId,
  }: {
    webhookId: string;
    userId: string;
  }): Promise<OrganizationWebhook> {
    const webhook = await this.organizationWebhookRepository.findById({
      id: webhookId,
    });
    if (!webhook) throw new NotFoundError("Webhook not found");

    const member = await this.organizationRepository.findMemberByUserAndOrg({
      userId,
      organizationId: webhook.organizationId,
    });
    if (!member) throw new ForbiddenError("Access denied");

    return this.organizationWebhookRepository.delete({ id: webhookId });
  }

  /**
   * Get dashboard stats for given organizations
   */
  async getDashboardStats({
    orgIds,
  }: {
    orgIds: string[];
  }): Promise<DashboardStats> {
    const stats = await this.paymentSessionRepository.getStatsByOrgIds({
      orgIds,
    });

    const totalPayments = stats.reduce((sum, s) => sum + s._count, 0);
    const paidPayments = stats.find((s) => s.status === "PAID")?._count ?? 0;
    const pendingPayments =
      stats.find((s) => s.status === "PENDING")?._count ?? 0;

    return {
      totalPayments,
      paidPayments,
      pendingPayments,
    };
  }

  /**
   * Get counts for multiple organizations
   */
  async getOrganizationCounts({
    orgIds,
  }: {
    orgIds: string[];
  }): Promise<OrganizationCounts[]> {
    return this.organizationRepository.getCountsByOrgIds({ orgIds });
  }

  /**
   * Get paid payment count for a specific organization
   */
  async getPaidCount({ orgId }: { orgId: string }): Promise<number> {
    return this.paymentSessionRepository.countPaidByOrgId({ orgId });
  }
}
