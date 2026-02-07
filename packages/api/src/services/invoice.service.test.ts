import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { Prisma } from "@getblitz/database";
import type { MockPrismaClient } from "@getblitz/database/mocked";
import { Currency } from "@getblitz/database";
import { createMockPrismaClient } from "@getblitz/database/mocked";

import type {
  CreateInvoiceInput,
  ICustomerService,
  IInvoiceRepository,
  IPaymentSessionService,
} from "../interfaces";
import { InvoiceService } from "./invoice.service";

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
  };

  const mockCustomerService = {
    getOrCreateCustomer: vi.fn(),
  };

  beforeAll(() => {
    mockPrisma = createMockPrismaClient();
    // Mock the $transaction to pass through the callback with a mock tx client
    mockPrisma.$transaction.mockImplementation(
      async (callback: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
        callback(mockPrisma as unknown as Prisma.TransactionClient),
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
        callback(mockPrisma as unknown as Prisma.TransactionClient),
    );
  });

  it("should create invoice in transaction", async () => {
    const input: CreateInvoiceInput = {
      organizationId: "org-1",
      amountCents: 1000,
      currency: Currency.EUR,
      customerEmail: "test@example.com",
      description: "Test Invoice",
      dueDate: new Date(),
      invoiceNumber: "INV-001",
      lineItems: [],
      subtotalCents: 1000,
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
    expect(mockPaymentSessionService.createChallenge).toHaveBeenCalledWith(
      expect.anything(),
      mockPrisma,
    );
    expect(mockInvoiceRepo.create).toHaveBeenCalledWith(
      expect.anything(),
      mockPrisma,
    );
  });
});
