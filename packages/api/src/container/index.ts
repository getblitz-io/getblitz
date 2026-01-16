import type { PrismaClient } from "@getblitz/database";
// Bank Providers
import {
  ProviderRegistry,
  QontoProvider,
  RevolutProvider,
  TestBankProvider,
} from "@getblitz/bank-providers";
import { prisma } from "@getblitz/database";

import { ApiKeyRepository } from "../repositories/api-key.repository";
import { BankAccountRepository } from "../repositories/bank-account.repository";
import { OrganizationBankConnectionRepository } from "../repositories/organization-bank.repository";
import { OrganizationWebhookRepository } from "../repositories/organization-webhook.repository";
import { OrganizationRepository } from "../repositories/organization.repository";
// Repositories
import { PaymentSessionRepository } from "../repositories/payment-session.repository";
import { TransactionRepository } from "../repositories/transaction.repository";
import { ApiKeyService } from "../services/api-key.service";
import { BankConnectionService } from "../services/bank-connection.service";
import { BankWebhookService } from "../services/bank-webhook.service";
import { CredentialCacheService } from "../services/credential-cache.service";
import { CredentialManagerService } from "../services/credential-manager.service";
import { OrganizationService } from "../services/organization.service";
// Services
import { PaymentSessionService } from "../services/payment-session.service";
import { PaymentSettlementService } from "../services/payment-settlement.service";
import { SecurityService } from "../services/security.service";
import { WebhookService } from "../services/webhook.service";
import { TYPES } from "./types";

/**
 * Service container for dependency injection
 * Uses singleton pattern for all services and repositories
 */
export interface ServiceContainer {
  // Core
  prisma: PrismaClient;

  // Repositories
  paymentSessionRepository: PaymentSessionRepository;
  organizationRepository: OrganizationRepository;
  apiKeyRepository: ApiKeyRepository;
  transactionRepository: TransactionRepository;
  bankAccountRepository: BankAccountRepository;
  organizationWebhookRepository: OrganizationWebhookRepository;
  organizationBankConnectionRepository: OrganizationBankConnectionRepository;

  // Services
  paymentSessionService: PaymentSessionService;
  paymentSettlementService: PaymentSettlementService;
  organizationService: OrganizationService;
  apiKeyService: ApiKeyService;
  webhookService: WebhookService;
  securityService: SecurityService;
  credentialCacheService: CredentialCacheService;
  bankWebhookService: BankWebhookService;
  credentialManagerService: CredentialManagerService;
  bankConnectionService: BankConnectionService;
}

let container: ServiceContainer | null = null;

/**
 * Initialize bank providers (register provider classes)
 */
function initProviders() {
  ProviderRegistry.register(QontoProvider);
  ProviderRegistry.register(RevolutProvider);
  ProviderRegistry.register(TestBankProvider);
}

/**
 * Create and configure the service container
 */
function createContainer(): ServiceContainer {
  initProviders();

  // Create repositories (depend on Prisma)
  const paymentSessionRepository = new PaymentSessionRepository(prisma);
  const organizationRepository = new OrganizationRepository(prisma);
  const apiKeyRepository = new ApiKeyRepository(prisma);
  const transactionRepository = new TransactionRepository(prisma);
  const bankAccountRepository = new BankAccountRepository(prisma);
  const organizationWebhookRepository = new OrganizationWebhookRepository(
    prisma,
  );
  const organizationBankConnectionRepository =
    new OrganizationBankConnectionRepository(prisma);

  // Create services (depend on repositories)
  const securityService = new SecurityService();
  const webhookService = new WebhookService(paymentSessionRepository);
  const paymentSettlementService = new PaymentSettlementService(webhookService);
  const credentialManagerService = new CredentialManagerService(
    organizationBankConnectionRepository,
    securityService,
  );
  const paymentSessionService = new PaymentSessionService(
    paymentSessionRepository,
    bankAccountRepository,
    paymentSettlementService,
    credentialManagerService,
  );
  const organizationService = new OrganizationService(
    organizationRepository,
    apiKeyRepository,
    paymentSessionRepository,
    bankAccountRepository,
    organizationWebhookRepository,
    organizationBankConnectionRepository,
  );
  const apiKeyService = new ApiKeyService(apiKeyRepository);
  const credentialCacheService = new CredentialCacheService();
  const bankWebhookService = new BankWebhookService(
    organizationBankConnectionRepository,
    paymentSettlementService,
    credentialManagerService,
  );
  const bankConnectionService = new BankConnectionService(
    organizationBankConnectionRepository,
    credentialManagerService,
  );

  return {
    prisma,
    paymentSessionRepository,
    organizationRepository,
    apiKeyRepository,
    transactionRepository,
    bankAccountRepository,
    organizationWebhookRepository,
    organizationBankConnectionRepository,
    paymentSessionService,
    paymentSettlementService,
    organizationService,
    apiKeyService,
    webhookService,
    securityService,
    credentialCacheService,
    bankWebhookService,
    credentialManagerService,
    bankConnectionService,
  };
}

/**
 * Get or create the singleton container instance
 */
export function getContainer(): ServiceContainer {
  return (container ??= createContainer());
}

/**
 * Reset container (useful for testing)
 */
export function resetContainer(): void {
  container = null;
}

/**
 * Type-safe getter for container services
 */
export function getService<K extends keyof ServiceContainer>(
  key: K,
): ServiceContainer[K] {
  return getContainer()[key];
}

export { TYPES };
