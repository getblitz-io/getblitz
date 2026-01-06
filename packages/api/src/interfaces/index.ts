/**
 * Service and Repository interfaces for dependency injection
 */

import type {
  BankAccount,
  Currency,
  Organization,
  OrganizationBankConnection,
  OrganizationSecretKey,
  OrganizationWebhook,
  PaymentSession,
  PaymentStatus,
  Prisma,
  Transaction,
} from "@getblitz/database";

export type { Transaction } from "@getblitz/database";

// ============================================================================
// Repository Interfaces
// ============================================================================

export interface IPaymentSessionRepository {
  findById({ id }: { id: string }): Promise<PaymentSessionWithRelations | null>;
  findByReferenceId({
    referenceId,
  }: {
    referenceId: string;
  }): Promise<PaymentSession | null>;
  create({
    data,
  }: {
    data: CreatePaymentSessionInput;
  }): Promise<PaymentSession>;
  updateStatus({
    id,
    status,
  }: {
    id: string;
    status: PaymentStatus;
  }): Promise<PaymentSession>;
  updateStatusWithToken({
    id,
    status,
    clientToken,
  }: {
    id: string;
    status: PaymentStatus;
    clientToken: string;
  }): Promise<PaymentSession>;
  expirePendingSessions(): Promise<number>;
  getStatsByOrgIds({
    orgIds,
  }: {
    orgIds: string[];
  }): Promise<PaymentStatusStats[]>;
  findByOrgIds({
    orgIds,
    options,
  }: {
    orgIds: string[];
    options?: { take?: number; orderBy?: "createdAt" };
  }): Promise<PaymentSessionWithOrg[]>;
  countPaidByOrgId({ orgId }: { orgId: string }): Promise<number>;
}

export interface IOrganizationRepository {
  findById({ id }: { id: string }): Promise<OrganizationWithDetails | null>;
  findBySlug({
    slug,
  }: {
    slug: string;
  }): Promise<OrganizationWithDetails | null>;
  findByUserId({ userId }: { userId: string }): Promise<Organization[]>;
  getCountsByOrgIds({
    orgIds,
  }: {
    orgIds: string[];
  }): Promise<OrganizationCounts[]>;
  findMemberByUserAndOrg({
    userId,
    organizationId,
  }: {
    userId: string;
    organizationId: string;
  }): Promise<{ userId: string } | null>;
}

export interface IBankAccountRepository {
  findById({
    id,
  }: {
    id: string;
  }): Promise<BankAccountWithOrganizationBankConnection | null>;
  findByOrganizationId({
    organizationId,
  }: {
    organizationId: string;
  }): Promise<BankAccountWithOrganizationBankConnection[]>;
  findDefaultByOrganizationId({
    organizationId,
  }: {
    organizationId: string;
  }): Promise<BankAccountWithOrganizationBankConnection | null>;
  create({
    data,
  }: {
    data: CreateBankAccountInput;
  }): Promise<BankAccountWithOrganizationBankConnection>;
  update({
    id,
    data,
  }: {
    id: string;
    data: Partial<CreateBankAccountInput>;
  }): Promise<BankAccountWithOrganizationBankConnection>;
  delete({ id }: { id: string }): Promise<BankAccount>;
  setDefault({
    organizationId,
    bankAccountId,
  }: {
    organizationId: string;
    bankAccountId: string;
  }): Promise<void>;
}

export interface IOrganizationWebhookRepository {
  findById({ id }: { id: string }): Promise<OrganizationWebhook | null>;
  findByOrganizationId({
    organizationId,
  }: {
    organizationId: string;
  }): Promise<OrganizationWebhook[]>;
  create({
    organizationId,
    data,
  }: {
    organizationId: string;
    data: CreateWebhookInput;
  }): Promise<OrganizationWebhook>;
  update({
    id,
    data,
  }: {
    id: string;
    data: UpdateWebhookInput;
  }): Promise<OrganizationWebhook>;
  delete({ id }: { id: string }): Promise<OrganizationWebhook>;
}

export interface IApiKeyRepository {
  findBySecretKey({
    secretKey,
  }: {
    secretKey: string;
  }): Promise<{ id: string; organizationId: string } | null>;
  create({
    organizationId,
  }: {
    organizationId: string;
  }): Promise<OrganizationSecretKey>;
  delete({ id }: { id: string }): Promise<OrganizationSecretKey>;
  updateLastUsed({ id }: { id: string }): void;
  findByIdWithOrganization({
    id,
  }: {
    id: string;
  }): Promise<ApiKeyWithOrganization | null>;
}

export interface ITransactionRepository {
  create({ data }: { data: CreateTransactionInput }): Promise<Transaction>;
  findBySessionId({ sessionId }: { sessionId: string }): Promise<Transaction[]>;
}

export interface IOrganizationBankConnectionRepository {
  findById({
    id,
    include,
  }: {
    id: string;
    include?: Prisma.OrganizationBankConnectionInclude;
  }): Promise<Prisma.OrganizationBankConnectionGetPayload<{
    include?: Prisma.OrganizationBankConnectionInclude;
  }> | null>;
  findByOrganizationIdAndProviderId({
    organizationId,
    providerId,
    include,
  }: {
    organizationId: string;
    providerId: string;
    include?: Prisma.OrganizationBankConnectionInclude;
  }): Promise<Prisma.OrganizationBankConnectionGetPayload<{
    include?: Prisma.OrganizationBankConnectionInclude;
  }> | null>;
  findByOrganizationId({
    organizationId,
  }: {
    organizationId: string;
  }): Promise<OrganizationBankConnection[]>;
  findDefaultByOrganizationId({
    organizationId,
  }: {
    organizationId: string;
  }): Promise<OrganizationBankConnection | null>;
  create({
    data,
  }: {
    data: CreateOrganizationBankConnectionInput;
  }): Promise<OrganizationBankConnection>;
  update({
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
  }): Promise<OrganizationBankConnection>;
  delete({ id }: { id: string }): Promise<OrganizationBankConnection>;
}

// ============================================================================
// Service Interfaces
// ============================================================================

export interface IPaymentSessionService {
  createChallenge({
    input,
    baseUrl,
  }: {
    input: CreateChallengeInput;
    baseUrl: string;
  }): Promise<CreateChallengeResult>;
  getSessionDetails({
    sessionId,
  }: {
    sessionId: string;
  }): Promise<SessionDetailsResult | null>;
  getSessionDetailsByReference({
    referenceId,
  }: {
    referenceId: string;
  }): Promise<SessionDetailsResult | null>;
  simulatePayment({
    sessionId,
  }: {
    sessionId: string;
  }): Promise<SimulatePaymentResult>;
  expireSessions(): Promise<number>;
  listByOrgIds({
    orgIds,
    options,
  }: {
    orgIds: string[];
    options?: { take?: number };
  }): Promise<PaymentSessionWithOrg[]>;
}

export interface IPaymentSettlementService {
  settle({ input }: { input: SettlementInput }): Promise<SettlementResult>;
}

export interface IOrganizationService {
  getById({
    id,
    userId,
  }: {
    id: string;
    userId: string;
  }): Promise<OrganizationWithDetails>;
  getBySlug({
    slug,
    userId,
  }: {
    slug: string;
    userId: string;
  }): Promise<OrganizationWithDetails>;
  generateApiKey({
    organizationId,
    userId,
  }: {
    organizationId: string;
    userId: string;
  }): Promise<OrganizationSecretKey>;
  deleteApiKey({
    keyId,
    userId,
  }: {
    keyId: string;
    userId: string;
  }): Promise<OrganizationSecretKey>;
  getPaidCount({ orgId }: { orgId: string }): Promise<number>;

  // Bank account methods
  addBankAccount({
    input,
    userId,
  }: {
    input: AddBankAccountInput;
    userId: string;
  }): Promise<BankAccount>;
  deleteBankAccount({
    bankAccountId,
    userId,
  }: {
    bankAccountId: string;
    userId: string;
  }): Promise<BankAccount>;
  setDefaultBankAccount({
    bankAccountId,
    userId,
  }: {
    bankAccountId: string;
    userId: string;
  }): Promise<void>;

  // Webhook methods (multi-webhook support)
  createWebhook({
    input,
    userId,
  }: {
    input: CreateOrganizationWebhookInput;
    userId: string;
  }): Promise<OrganizationWebhook>;
  updateWebhook({
    input,
    userId,
  }: {
    input: UpdateOrganizationWebhookInput;
    userId: string;
  }): Promise<OrganizationWebhook>;
  deleteWebhook({
    webhookId,
    userId,
  }: {
    webhookId: string;
    userId: string;
  }): Promise<OrganizationWebhook>;
}

export interface IApiKeyService {
  validate({
    authHeader,
  }: {
    authHeader: string | null;
  }): Promise<ApiKeyValidationResult>;
}

export interface IWebhookService {
  notifyMerchant({
    sessionId,
    event,
  }: {
    sessionId: string;
    event: WebhookEventType;
  }): Promise<void>;
}

export interface IBankWebhookService {
  /** Process webhook by connection ID */
  processWebhookByConnectionId({
    connectionId,
    request,
  }: {
    connectionId: string;
    request: Request;
  }): Promise<BankWebhookResult>;
}

// ============================================================================
// Input/Output Types
// ============================================================================

export interface CreatePaymentSessionInput {
  organizationId: string;
  bankAccountId?: string;
  referenceId: string;
  amountCents: number;
  currency: Currency;
  expiresAt: Date;
}

export interface CreateBankAccountInput {
  organizationBankConnectionId: string;
  accountName: string;
  accountIban: string;
  accountBic: string;
}

export interface CreateWebhookInput {
  webhookUrl: string;
  webhookSecret: string;
  notifyPaymentSuccess?: boolean;
  notifyPaymentFailed?: boolean;
  notifyPaymentExpired?: boolean;
}

export interface UpdateWebhookInput {
  webhookUrl?: string;
  webhookSecret?: string;
  notifyPaymentSuccess?: boolean;
  notifyPaymentFailed?: boolean;
  notifyPaymentExpired?: boolean;
}

export interface CreateTransactionInput {
  paymentSessionId: string;
  txHash: string;
  rawPayload?: unknown;
}

export interface CreateChallengeInput {
  organizationId: string;
  amount: number;
  currency: Currency;
  bankAccountId?: string;
}

export interface CreateChallengeResult {
  sessionId: string;
  referenceId: string;
  paymentUrl: string;
  expiresAt: string;
  connectionId: string;
}

export interface SessionDetailsResult {
  sessionId: string;
  referenceId: string;
  amountCents: number;
  currency: Currency;
  status: PaymentStatus;
  expiresAt: string;
  organization: {
    name: string;
  };
  bankAccount: {
    organizationBankConnection: {
      id: string;
      providerId: string;
    };
    accountName: string;
    iban?: string;
    walletAddressEvm?: string;
  } | null;
  provider: {
    id: string;
    displayName: string;
    domain: string;
  } | null;
  sepaQrString: string | null;
}

export interface SimulatePaymentResult {
  success: boolean;
  message?: string;
  error?: string;
  sessionId?: string;
}

export interface SettlementInput {
  referenceId: string;
  txHash: string;
  amountCents: number;
  rawPayload?: unknown;
}

export interface SettlementResult {
  success: boolean;
  error?: string;
  alreadyProcessed?: boolean;
  sessionId?: string;
  clientToken?: string;
}

export interface AddBankAccountInput {
  organizationId: string;
  providerId: string;
  accountName: string;
  accountIban: string;
  accountBic: string;
  isDefault?: boolean;
}

export interface CreateOrganizationWebhookInput {
  organizationId: string;
  webhookUrl: string;
  webhookSecret: string;
  notifyPaymentSuccess?: boolean;
  notifyPaymentFailed?: boolean;
  notifyPaymentExpired?: boolean;
}

export interface UpdateOrganizationWebhookInput {
  webhookId: string;
  webhookUrl?: string;
  webhookSecret?: string;
  notifyPaymentSuccess?: boolean;
  notifyPaymentFailed?: boolean;
  notifyPaymentExpired?: boolean;
}

export interface ApiKeyValidationResult {
  valid: boolean;
  organizationId?: string;
  keyId?: string;
  error?: string;
}

export type WebhookEventType =
  | "payment.success"
  | "payment.failed"
  | "payment.expired";

export interface BankWebhookResult {
  success: boolean;
  error?: string;
  errorCode?:
    | "NOT_FOUND"
    | "INVALID_SIGNATURE"
    | "SETTLEMENT_FAILED"
    | "INTERNAL_ERROR";
  alreadyProcessed?: boolean;
  referenceId?: string;
}

// ============================================================================
// Composite Types with Relations
// ============================================================================

export type PaymentSessionWithRelations = Prisma.PaymentSessionGetPayload<{
  include: {
    organization: {
      include: {
        webhooks: true;
      };
    };
    bankAccount: {
      include: {
        organizationBankConnection: true;
      };
    };
  };
}>;

export type OrganizationWithDetails = Prisma.OrganizationGetPayload<{
  include: {
    secretKeys: {
      orderBy: { createdAt: "desc" };
    };
    organizationBankConnections: {
      orderBy: { createdAt: "desc" };
      select: {
        id: true;
        providerId: true;
        providerConfig: true;
        isDefault: true;
        credentials: true;
        webhookUrl: true;
        webhookSecret: true;
        status: true;
        expiresAt: true;
        createdAt: true;
        updatedAt: true;
        bankAccounts: {
          select: {
            id: true;
            accountName: true;
            accountIban: true;
            accountBic: true;
            isDefault: true;
          };
          orderBy: { createdAt: "desc" };
        };
      };
    };
    webhooks: {
      orderBy: { createdAt: "desc" };
      select: {
        id: true;
        webhookUrl: true;
        webhookSecret: true;
        notifyPaymentSuccess: true;
        notifyPaymentFailed: true;
        notifyPaymentExpired: true;
        notifyPaymentAbandoned: true;
      };
    };
    _count: {
      select: {
        paymentSessions: true;
        members: true;
        organizationBankConnections: true;
        webhooks: true;
      };
    };
  };
}>;

export type ApiKeyWithOrganization = Prisma.OrganizationSecretKeyGetPayload<{
  include: {
    organization: true;
  };
}>;

export interface PaymentStatusStats {
  status: PaymentStatus;
  _count: number;
}

export type PaymentSessionWithOrg = Prisma.PaymentSessionGetPayload<{
  include: {
    organization: { select: { id: true; name: true } };
    bankAccount: true;
  };
}>;

export interface OrganizationCounts {
  organizationId: string;
  secretKeyCount: number;
  bankAccountCount: number;
  paymentCount: number;
}

export interface DashboardStats {
  totalPayments: number;
  paidPayments: number;
  pendingPayments: number;
}

export interface CreateOrganizationBankConnectionInput {
  organizationId: string;
  providerId: string;
  providerConfig: string; // Encrypted provider configuration
  credentials?: string | null; // Encrypted OAuth credentials (null until OAuth complete)
  webhookUrl?: string | null;
  webhookSecret?: string | null;
}

export type BankAccountWithOrganizationBankConnection =
  Prisma.BankAccountGetPayload<{
    include: {
      organizationBankConnection: true;
    };
  }>;
