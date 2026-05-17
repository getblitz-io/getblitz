import bcrypt from "bcryptjs";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { Prisma } from "@getblitz/database";
import type { MockPrismaClient } from "@getblitz/database/mocked";
import type { CreateInvoiceInput } from "@getblitz/validators";
import { Currency } from "@getblitz/database";
import { createMockPrismaClient } from "@getblitz/database/mocked";

import type {
  ICustomerService,
  IInvoiceRepository,
  IPaymentSessionService,
} from "../interfaces";
import { InvoiceService } from "./invoice.service";

const mockConsume = vi.fn();
const mockGet = vi.fn();

vi.mock("rate-limiter-flexible", () => {
  return {
    RateLimiterRedis: class {
      consume = mockConsume;
      get = mockGet;
    },
  };
});

vi.mock("@getblitz/redis", () => ({
  getRedisClient: vi.fn().mockReturnValue({}),
}));

vi.mock("../env", () => ({
  env: {
    ENCRYPTION_KEY: "mock-encryption-key-must-be-at-least-32-chars-long",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  },
}));

describe("InvoiceService", () => {
  let service: InvoiceService;
  let mockPrisma: MockPrismaClient;

  const mockInvoiceRepo = {
    create: vi.fn(),
    findById: vi.fn(),
    findByReferenceId: vi.fn(),
    findByOrgIds: vi.fn(),
  };

  const mockPaymentSessionService = {
    createChallenge: vi.fn(),
    getSessionDetails: vi.fn(),
  };

  const mockCustomerService = {
    getOrCreateCustomer: vi.fn(),
  };

  beforeAll(() => {
    mockPrisma = createMockPrismaClient();
    // Mock the $transaction to pass through the callback with a mock tx client
    mockPrisma.$transaction.mockImplementation(
      async (callback: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
        callback(mockPrisma),
    );

    service = new InvoiceService(
      mockInvoiceRepo as unknown as IInvoiceRepository,
      mockPaymentSessionService as unknown as IPaymentSessionService,
      mockCustomerService as unknown as ICustomerService,
      mockPrisma,
    );
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset transaction mock after clearAllMocks
    mockPrisma.$transaction.mockImplementation(
      async (callback: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
        callback(mockPrisma),
    );
  });

  it("should create invoice in transaction", async () => {
    const input: CreateInvoiceInput = {
      slug: "test-org",
      amountCents: 1000,
      currency: Currency.EUR,
      customerEmail: "test@example.com",
      description: "Test Invoice",
      dueDate: new Date(),
      invoiceNumber: "INV-001",
      lineItems: [
        {
          description: "Test Item",
          quantity: 1,
          unitPriceCents: 1000,
        },
      ],
      subtotalCents: 1000,
      taxRateBps: 0,
      taxAmountCents: 0,
      discountCents: 0,
      bankAccountId: "bank-1",
    };

    mockCustomerService.getOrCreateCustomer.mockResolvedValue({
      id: "cust-1",
      email: "test@example.com",
    });

    mockPaymentSessionService.createChallenge.mockResolvedValue({
      sessionId: "sess-1",
      paymentUrl: "https://pay.test/sess-1",
      expiresAt: new Date().toISOString(),
    });

    mockInvoiceRepo.create.mockResolvedValue({
      id: "inv-1",
      referenceId: "INV-RND",
    });

    const result = await service.createInvoice({
      input,
      organizationId: "org-1",
      baseUrl: "https://pay.test",
    });

    expect(result.invoiceId).toBe("inv-1");

    // Verify transaction usage
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockPrisma.$transaction).toHaveBeenCalled();

    // Verify services called with tx (mockPrisma in this test)
    expect(mockCustomerService.getOrCreateCustomer).toHaveBeenCalledWith(
      expect.anything(),
      mockPrisma,
    );
    expect(mockInvoiceRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tx: mockPrisma,
      }),
    );
  });

  describe("getInvoiceByReference", () => {
    const mockDeviceDetails = {
      ipAddress: "127.0.0.1",
      userAgent: "test-agent",
      deviceType: "desktop",
      deviceOs: "mac",
      deviceBrowser: "chrome",
    };

    it("should allow access with correct password", async () => {
      const password = "password123";
      const hashedPassword = await bcrypt.hash(password, 10);

      mockInvoiceRepo.findByReferenceId.mockResolvedValue({
        id: "inv-1",
        referenceId: "INV-RND",
        passwordHash: hashedPassword,
        organization: { name: "Test Org" },
        bankAccount: {
          organizationBankConnection: { providerId: "prov-1" },
          accountName: "Test Account",
          accountIban: "DE123",
        },
        status: "FINALIZED",
        paymentSession: {
          id: "sess-1",
          referenceId: "ref-1",
          amountCents: 1000,
          currency: "EUR",
          status: "PENDING",
        },
      });

      mockPaymentSessionService.getSessionDetails.mockResolvedValue({
        sessionId: "sess-1",
        referenceId: "ref-1",
        amountCents: 1000,
        amountPaidCents: 0,
        currency: Currency.EUR,
        status: "PENDING",
        organization: { name: "Test Org", logo: null },
        bankAccount: {
          organizationBankConnection: { id: "conn-1", providerId: "prov-1" },
          accountName: "Test Account",
          iban: "DE123",
        },
        provider: null,
        sepaQrString: null,
        clientToken: "mock-token",
        merchantReferenceId: null,
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        transactions: [],
      });

      // Mock rate limiter to allow
      mockGet.mockResolvedValue(null);

      const result = await service.getInvoiceByReference({
        referenceId: "INV-RND",
        password,
        mode: "public",
        deviceDetails: mockDeviceDetails,
      });

      expect(result).toBeDefined();
      expect(result?.invoiceId).toBe("inv-1");
    });

    it("should consume point and throw error on incorrect password", async () => {
      const password = "password123";
      const hashedPassword = await bcrypt.hash(password, 10);

      mockInvoiceRepo.findByReferenceId.mockResolvedValue({
        id: "inv-1",
        referenceId: "INV-RND",
        passwordHash: hashedPassword,
        organization: { name: "Test Org" },
        bankAccount: {
          organizationBankConnection: { providerId: "prov-1" },
          accountName: "Test Account",
          accountIban: "DE123",
        },
        status: "FINALIZED",
        paymentSession: {
          id: "sess-1",
          referenceId: "ref-1",
          amountCents: 1000,
          currency: "EUR",
          status: "PENDING",
        },
      });

      mockGet.mockResolvedValue(null);
      mockConsume.mockResolvedValue({});

      await expect(
        service.getInvoiceByReference({
          referenceId: "INV-RND",
          password: "wrong-password",
          mode: "public",
          deviceDetails: mockDeviceDetails,
        }),
      ).rejects.toThrow("Invalid password");

      expect(mockConsume).toHaveBeenCalled();
    });

    it("should throw TOO_MANY_REQUESTS when blocked", async () => {
      mockInvoiceRepo.findByReferenceId.mockResolvedValue({
        id: "inv-1",
        referenceId: "INV-RND",
        passwordHash: "some-hash",
        organization: { name: "Test Org" },
        bankAccount: {
          organizationBankConnection: { providerId: "prov-1" },
          accountName: "Test Account",
          accountIban: "DE123",
        },
        status: "FINALIZED",
        paymentSession: {
          id: "sess-1",
          referenceId: "ref-1",
          amountCents: 1000,
          currency: "EUR",
          status: "PENDING",
        },
      });

      mockGet.mockResolvedValue({
        remainingPoints: 0,
        msBeforeNext: 10000,
      });

      await expect(
        service.getInvoiceByReference({
          referenceId: "INV-RND",
          password: "any-password",
          mode: "public",
          deviceDetails: mockDeviceDetails,
        }),
      ).rejects.toThrow("Too many failed attempts");

      // Should not verify password if blocked
      // We can't easily spy on bcrypt.compare here without mocking it, but verifying functionality via error code is good.
    });
  });
});
