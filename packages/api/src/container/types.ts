/**
 * Symbol identifiers for dependency injection
 * These are kept for backward compatibility but the container now uses
 * direct property access instead of symbols
 */
export const TYPES = {
  // Core
  PrismaClient: Symbol.for("PrismaClient"),

  // Repositories
  PaymentSessionRepository: Symbol.for("PaymentSessionRepository"),
  OrganizationRepository: Symbol.for("OrganizationRepository"),
  WalletRepository: Symbol.for("WalletRepository"),
  ApiKeyRepository: Symbol.for("ApiKeyRepository"),
  TransactionRepository: Symbol.for("TransactionRepository"),

  // Services
  PaymentSessionService: Symbol.for("PaymentSessionService"),
  PaymentSettlementService: Symbol.for("PaymentSettlementService"),
  OrganizationService: Symbol.for("OrganizationService"),
  ApiKeyService: Symbol.for("ApiKeyService"),
  WebhookService: Symbol.for("WebhookService"),
} as const;

export type TYPES = typeof TYPES;
