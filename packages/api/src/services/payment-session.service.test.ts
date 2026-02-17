import type { Mock, Mocked } from "vitest";
import { jwtVerify } from "jose";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  AuthenticatedProvider,
  BankProvider,
} from "@getblitz/bank-providers";
import { ProviderRegistry } from "@getblitz/bank-providers";
import { Currency } from "@getblitz/database";

import type {
  CreateChallengeInput,
  IBankAccountRepository,
  ICredentialManagerService,
  IOrganizationRepository,
  IPaymentSessionRepository,
  IPaymentSettlementService,
} from "../interfaces";
import { PaymentSessionService } from "./payment-session.service";

// Mock env
vi.mock("../env", () => ({
  env: {
    ENCRYPTION_KEY: "test-encryption-key-min-32-chars!!",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  },
}));

// Mock ProviderRegistry
vi.mock("@getblitz/bank-providers", () => ({
  ProviderRegistry: {
    getProvider: vi.fn(),
    createProvider: vi.fn(),
    createConfiguredProvider: vi.fn(),
    createAuthenticatedProvider: vi.fn(),
  },
}));

// Mock jose
// Mock jose
vi.mock("jose", () => ({
  SignJWT: class {
    constructor() {
      /* empty */
    }
    setProtectedHeader() {
      return this;
    }
    setIssuedAt() {
      return this;
    }
    setExpirationTime() {
      return this;
    }
    sign() {
      return Promise.resolve("mock-token");
    }
  },
  jwtVerify: vi.fn(),
}));

describe("PaymentSessionService", () => {
  const mockedRegistry = ProviderRegistry as Mocked<typeof ProviderRegistry>;
  let service: PaymentSessionService;

  const mockSessionRepo = {
    create: vi.fn(),
    findById: vi.fn(),
    findByReferenceId: vi.fn(),
    findByMerchantReferenceId: vi.fn(),
    updateStatus: vi.fn(),
    expirePendingSessions: vi.fn(),
    updateStatusWithToken: vi.fn(),
    getStatsByOrgIds: vi.fn(),
    findByOrgIds: vi.fn(),
    countPaidByOrgId: vi.fn(),
  };

  const mockBankRepo = {
    findById: vi.fn(),
    findDefaultByOrganizationId: vi.fn(),
    findByOrganizationId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    setDefault: vi.fn(),
  };

  const mockSettlement = {
    settle: vi.fn(),
    postSettle: vi.fn(),
  };

  const mockCredentialManager = {
    getValidCredentials: vi.fn(),
    decryptProviderConfig: vi.fn(),
    decryptCredentials: vi.fn(),
    encryptCredentials: vi.fn(),
    encryptProviderConfig: vi.fn(),
    isTokenExpiringSoon: vi.fn(),
    createConfiguredProvider: vi.fn(),
    createAuthenticatedProvider: vi.fn(),
  };

  const mockOrganizationRepo = {
    findById: vi.fn(),
    findBySlug: vi.fn(),
    findByUserId: vi.fn(),
    getCountsByOrgIds: vi.fn(),
    findMemberByUserAndOrg: vi.fn(),
    update: vi.fn(),
  };

  beforeAll(() => {
    service = new PaymentSessionService(
      mockSessionRepo as unknown as IPaymentSessionRepository,
      mockBankRepo as unknown as IBankAccountRepository,
      mockSettlement as unknown as IPaymentSettlementService,
      mockCredentialManager as unknown as ICredentialManagerService,
      mockOrganizationRepo as unknown as IOrganizationRepository,
    );
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a challenge", async () => {
    const input: CreateChallengeInput = {
      organizationId: "org-1",
      amount: 1000,
      currency: Currency.EUR,
    };
    const bankAccount = {
      id: "bank-1",
      organizationBankConnection: { id: "conn-1" },
    };
    mockBankRepo.findDefaultByOrganizationId.mockResolvedValue(bankAccount);
    mockSessionRepo.create.mockResolvedValue({
      id: "session-1",
      referenceId: "ref-1",
      expiresAt: new Date(),
    });
    // Valid organization check is done in createChallenge
    mockOrganizationRepo.findById.mockResolvedValue({ id: "org-1" });

    const result = await service.createChallenge({
      input,
      baseUrl: "https://pay.test",
    });

    expect(result.sessionId).toBe("session-1");
    expect(result.paymentUrl).toBe("https://pay.test/pay/session-1");
  });

  it("should create a challenge with merchantReferenceId", async () => {
    const input: CreateChallengeInput = {
      organizationId: "org-1",
      amount: 1000,
      currency: Currency.EUR,
      merchantReferenceId: "order-123",
    };
    const bankAccount = {
      id: "bank-1",
      organizationBankConnection: { id: "conn-1" },
    };
    mockSessionRepo.findByMerchantReferenceId.mockResolvedValue(null);
    mockBankRepo.findDefaultByOrganizationId.mockResolvedValue(bankAccount);
    mockSessionRepo.create.mockResolvedValue({
      id: "session-1",
      referenceId: "ref-1",
      merchantReferenceId: "order-123",
      expiresAt: new Date(),
    });
    mockOrganizationRepo.findById.mockResolvedValue({ id: "org-1" });

    const result = await service.createChallenge({
      input,
      baseUrl: "https://pay.test",
    });

    expect(result.sessionId).toBe("session-1");
    expect(result.merchantReferenceId).toBe("order-123");
  });

  it("should throw error for duplicate merchantReferenceId", async () => {
    const input: CreateChallengeInput = {
      organizationId: "org-1",
      amount: 1000,
      currency: Currency.EUR,
      merchantReferenceId: "order-123",
    };
    mockSessionRepo.findByMerchantReferenceId.mockResolvedValue({
      id: "existing-session",
    });

    await expect(
      service.createChallenge({ input, baseUrl: "https://pay.test" }),
    ).rejects.toThrow(
      'A payment with merchantReferenceId "order-123" already exists for this organization',
    );
  });

  it("should get session details and expire if needed", async () => {
    const session = {
      id: "session-1",
      referenceId: "ref-1",
      amountCents: 1000,
      currency: Currency.EUR,
      status: "PENDING",
      expiresAt: new Date(Date.now() - 1000), // Expired
      organizationId: "org-1",
      organization: { name: "Test Org" },
      bankAccount: {
        accountIban: "FR123",
        accountName: "Test Account",
        organizationBankConnection: { id: "conn-1", providerId: "qonto" },
      },
      paymentSession: { id: "session-1" },
    };
    mockSessionRepo.findById.mockResolvedValue(session);
    mockedRegistry.getProvider.mockReturnValue({
      id: "qonto",
      displayName: "Qonto",
      domain: "qonto.com",
    } as unknown as BankProvider);
    // Needed for generateClientToken
    // But getSessionDetails calls generateClientToken which is private.
    // Assuming signatures don't fail in tests easily without mocking jose.
    // Mock jose sign returned "mock-token"

    // We mocked SignJWT so it should work.

    const result = await service.getSessionDetails({ sessionId: "session-1" });

    expect(result?.status).toBe("EXPIRED");
    expect(mockSessionRepo.updateStatus).toHaveBeenCalledWith({
      id: "session-1",
      status: "EXPIRED",
    });
  });

  it("should simulate payment (fallback without sandbox)", async () => {
    const session = {
      id: "session-1",
      referenceId: "ref-1",
      amountCents: 1000,
      currency: "EUR",
      status: "PENDING",
      bankAccount: {
        externalAccountId: "ext-acc-1",
        organizationBankConnection: {
          id: "conn-1",
          providerId: "qonto",
          providerConfig: null, // No config = fallback to local simulation
          credentials: null,
        },
      },
    };
    mockSessionRepo.findById.mockResolvedValue(session);
    mockSettlement.settle.mockResolvedValue({ success: true });

    const result = await service.simulatePayment({ sessionId: "session-1" });

    expect(result.success).toBe(true);
    expect(mockSettlement.settle).toHaveBeenCalled();
  });

  it("should simulate payment via provider sandbox when supported", async () => {
    const session = {
      id: "session-1",
      referenceId: "ref-1",
      amountCents: 1000,
      currency: "EUR",
      status: "PENDING",
      bankAccount: {
        externalAccountId: "ext-acc-1",
        organizationBankConnection: {
          id: "conn-1",
          providerId: "revolut",
          providerConfig: "encrypted-config",
          credentials: "encrypted-creds",
        },
      },
    };
    mockSessionRepo.findById.mockResolvedValue(session);
    mockCredentialManager.decryptProviderConfig.mockReturnValue({
      some: "config",
    });
    mockCredentialManager.getValidCredentials.mockResolvedValue({
      credentials: { accessToken: "token" },
    });

    const mockProvider = {
      supportsSandboxSimulation: vi.fn().mockReturnValue(true),
      simulateSandboxPayment: vi.fn().mockResolvedValue({ success: true }),
    };
    mockCredentialManager.createAuthenticatedProvider.mockResolvedValue(
      mockProvider as unknown as AuthenticatedProvider,
    );

    const result = await service.simulatePayment({ sessionId: "session-1" });

    expect(result.success).toBe(true);
    expect(result.message).toContain("via provider sandbox API");
    expect(mockProvider.simulateSandboxPayment).toHaveBeenCalledWith({
      accountId: "ext-acc-1",
      amount: 10,
      currency: "EUR",
      reference: "ref-1",
    });
    expect(mockSettlement.settle).not.toHaveBeenCalled();
  });

  describe("verifySessionAccess", () => {
    const mockedJwtVerify = jwtVerify as Mock;

    it("should verify successfully with valid token and allowed origin", async () => {
      const sessionId = "session-1";
      const orgId = "org-1";
      const origin = "https://merchant.com";

      mockedJwtVerify.mockResolvedValue({
        payload: { sessionId, organizationId: orgId },
        protectedHeader: { alg: "HS256" },
      });

      mockOrganizationRepo.findById.mockResolvedValue({
        id: orgId,
        allowedOrigins: [origin],
      });

      await expect(
        service.verifySessionAccess({
          sessionId,
          clientToken: "valid-token",
          origin,
        }),
      ).resolves.not.toThrow();
    });

    it("should verify successfully with valid token and app URL origin", async () => {
      const sessionId = "session-1";
      const orgId = "org-1";
      const origin = "http://localhost:3000"; // Default app URL in env.ts

      mockedJwtVerify.mockResolvedValue({
        payload: { sessionId, organizationId: orgId },
        protectedHeader: { alg: "HS256" },
      });

      mockOrganizationRepo.findById.mockResolvedValue({
        id: orgId,
        allowedOrigins: ["https://other.com"],
      });

      await expect(
        service.verifySessionAccess({
          sessionId,
          clientToken: "valid-token",
          origin,
        }),
      ).resolves.not.toThrow();
    });

    it("should throw error if token validation fails", async () => {
      mockedJwtVerify.mockRejectedValue(new Error("Invalid signature"));

      await expect(
        service.verifySessionAccess({
          sessionId: "session-1",
          clientToken: "invalid-token",
          origin: "https://any.com",
        }),
      ).rejects.toThrow("Session verification failed");
    });

    it("should throw error if session ID mismatches", async () => {
      mockedJwtVerify.mockResolvedValue({
        payload: { sessionId: "other-session", organizationId: "org-1" },
        protectedHeader: { alg: "HS256" },
      });

      await expect(
        service.verifySessionAccess({
          sessionId: "session-1",
          clientToken: "valid-token",
          origin: "https://merchant.com",
        }),
      ).rejects.toThrow("Session verification failed");
    });

    it("should throw error if organization not found", async () => {
      mockedJwtVerify.mockResolvedValue({
        payload: { sessionId: "session-1", organizationId: "org-1" },
        protectedHeader: { alg: "HS256" },
      });

      mockOrganizationRepo.findById.mockResolvedValue(null);

      await expect(
        service.verifySessionAccess({
          sessionId: "session-1",
          clientToken: "valid-token",
          origin: "https://merchant.com",
        }),
      ).rejects.toThrow("Session verification failed");
    });

    it("should throw error if origin is not allowed", async () => {
      const sessionId = "session-1";
      const orgId = "org-1";
      const origin = "https://hacker.com";

      mockedJwtVerify.mockResolvedValue({
        payload: { sessionId, organizationId: orgId },
        protectedHeader: { alg: "HS256" },
      });

      mockOrganizationRepo.findById.mockResolvedValue({
        id: orgId,
        allowedOrigins: ["https://merchant.com"],
      });

      await expect(
        service.verifySessionAccess({
          sessionId,
          clientToken: "valid-token",
          origin,
        }),
      ).rejects.toThrow(
        "Session verification failed: Origin https://hacker.com is not allowed",
      );
    });
  });
});
