/**
 * Service and Repository interfaces for dependency injection
 */

export type { Transaction } from "@getblitz/database";

// Input types
export type {
  AddBankAccountInput,
  CreateBankAccountInput,
  CreateChallengeInput,
  CreateOrganizationBankConnectionInput,
  CreateOrganizationWebhookInput,
  CreatePaymentSessionInput,
  CreateTransactionInput,
  CreateWebhookInput,
  SettlementInput,
  UpdateOrganizationWebhookInput,
  UpdateWebhookInput,
} from "./inputs";

// Output types
export type {
  ApiKeyValidationResult,
  BankWebhookResult,
  CreateChallengeResult,
  SessionDetailsResult,
  SettlementResult,
  SimulatePaymentResult,
  WebhookEventType,
} from "./outputs";

// Prisma composite types
export type {
  ApiKeyWithOrganization,
  BankAccountWithOrganizationBankConnection,
  OrganizationWithDetails,
  PaymentSessionWithOrg,
  PaymentSessionWithRelations,
} from "./prisma-types";

// Repository interfaces
export type {
  IApiKeyRepository,
  IBankAccountRepository,
  IOrganizationBankConnectionRepository,
  IOrganizationRepository,
  IOrganizationWebhookRepository,
  IPaymentSessionRepository,
  ITransactionRepository,
} from "./repositories";

// Service interfaces
export type {
  CredentialManagerResult,
  IApiKeyService,
  IBankConnectionService,
  IBankWebhookService,
  ICredentialManagerService,
  IOrganizationService,
  IPaymentSessionService,
  IPaymentSettlementService,
  IWebhookService,
  SetupWebhookParams,
  SetupWebhookResult,
} from "./services";

// Errors
export { ConflictError, ForbiddenError, NotFoundError } from "./errors";

// Stats types
export type {
  DashboardStats,
  OrganizationCounts,
  PaymentStatusStats,
} from "./stats";

// Organization types (frontend display)
export type {
  BankConnectionWithProvider,
  ProviderWithConnectionStatus,
} from "./organization";
