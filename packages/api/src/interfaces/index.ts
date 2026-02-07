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
  CreateInvoiceInput,
  CreateInvoiceDbInput,
  UpdateInvoiceInput,
  UpdateInvoiceDbInput,
  InvoiceLineItem,
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
  CreateInvoiceResult,
  InvoiceDetailsResult,
  QrCodeResult,
} from "./outputs";

// Prisma composite types
export type {
  ApiKeyWithOrganization,
  BankAccountWithOrganizationBankConnection,
  OrganizationWithDetails,
  PaymentSessionWithOrg,
  PaymentSessionWithRelations,
  InvoiceWithOrg,
  InvoiceWithRelations,
} from "./prisma-types";

// Repository interfaces
export type {
  IApiKeyRepository,
  IBankAccountRepository,
  ICustomerRepository,
  IOrganizationBankConnectionRepository,
  IOrganizationRepository,
  IOrganizationWebhookRepository,
  IPaymentSessionRepository,
  ITransactionRepository,
  IInvoiceRepository,
} from "./repositories";

// Service interfaces
export type {
  CredentialManagerResult,
  IApiKeyService,
  IBankConnectionService,
  IBankWebhookService,
  ICredentialManagerService,
  ICustomerService,
  IOrganizationService,
  IPaymentSessionService,
  IPaymentSettlementService,
  IWebhookService,
  SetupWebhookParams,
  SetupWebhookResult,
  IInvoiceService,
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
