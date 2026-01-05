import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "./root";

/**
 * Inference helpers for input types
 * @example
 * type PostByIdInput = RouterInputs['post']['byId']
 *      ^? { id: number }
 */
type RouterInputs = inferRouterInputs<AppRouter>;

/**
 * Inference helpers for output types
 * @example
 * type AllPostsOutput = RouterOutputs['post']['all']
 *      ^? Post[]
 */
type RouterOutputs = inferRouterOutputs<AppRouter>;

export { type AppRouter, appRouter } from "./root";
export { createTRPCContext, type TRPCServices } from "./trpc";
export type { RouterInputs, RouterOutputs };

// Container & DI
export {
  getContainer,
  resetContainer,
  getService,
  TYPES,
  type ServiceContainer,
} from "./container";

// Interfaces and types
export type {
  // Repository interfaces
  IPaymentSessionRepository,
  IOrganizationRepository,
  IBankAccountRepository,
  IApiKeyRepository,
  ITransactionRepository,
  // Service interfaces
  IPaymentSessionService,
  IPaymentSettlementService,
  IOrganizationService,
  IApiKeyService,
  IWebhookService,
  IBankWebhookService,
  // Input/Output types
  CreatePaymentSessionInput,
  CreateBankAccountInput,
  CreateTransactionInput,
  CreateChallengeInput,
  CreateChallengeResult,
  SessionDetailsResult,
  SimulatePaymentResult,
  SettlementInput,
  SettlementResult,
  AddBankAccountInput,
  ApiKeyValidationResult,
  WebhookEventType,
  // Composite types
  PaymentSessionWithRelations,
  OrganizationWithDetails,
  ApiKeyWithOrganization,
  // Dashboard/Stats types
  DashboardStats,
  OrganizationCounts,
  PaymentSessionWithOrg,
  PaymentStatusStats,
  BankWebhookResult,
} from "./interfaces";

// Re-export database types commonly used
export { type Currency, type PaymentStatus } from "@getblitz/database";

// Utils - keep pure utility functions
export {
  generateReferenceId,
  generateSepaQrString,
  centsToEuros,
  SepaQrDataSchema,
  checkRateLimit,
  createRateLimitHeaders,
  getRateLimiter,
  logger,
  apiLogger,
  webhookLogger,
  wssLogger,
  cronLogger,
  type SepaQrData,
  type RateLimitResult,
  type Logger,
  type LogContext,
  type LogLevel,
} from "./utils";

// Redis
export {
  getRedisClient,
  getRedisPublisher,
  getRedisSubscriber,
  closeRedisConnections,
  publishPaymentEvent,
} from "@getblitz/redis";

// Types
export type { ProviderWithConnectionStatus } from "./types";
