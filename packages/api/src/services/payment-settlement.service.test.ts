import type { Mocked } from "vitest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { Currency } from "@getblitz/database";
import { prisma } from "@getblitz/database";
import { publishPaymentEvent } from "@getblitz/redis";

import { PaymentSettlementService } from "./payment-settlement.service";

// Mocking @getblitz/database
vi.mock("@getblitz/database", () => ({
  prisma: {
    $transaction: vi.fn(),
  },
}));

// Mocking @getblitz/redis
vi.mock("@getblitz/redis", () => ({
  publishPaymentEvent: vi.fn().mockResolvedValue(undefined),
}));

describe("PaymentSettlementService", () => {
  const mockedPrisma = prisma as Mocked<typeof prisma>;
  // Helper to mock prisma.$transaction with provided mock client

  const mockTransaction = (mockTx: unknown): void => {
    (mockedPrisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      async (cb: (tx: unknown) => Promise<unknown>) => cb(mockTx),
    );
  };
  let service: PaymentSettlementService;
  const mockWebhookService = {
    notifyMerchant: vi.fn().mockResolvedValue(undefined),
  };

  beforeAll(() => {
    service = new PaymentSettlementService(mockWebhookService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const input = {
    referenceId: "ref-123",
    txHash: "hash-456",
    amountCents: 1000,
    rawPayload: { some: "data" },
  };

  it("should settle payment successfully when full amount is paid", async () => {
    const session = {
      id: "session-123",
      referenceId: "ref-123",
      status: "PENDING",
      expiresAt: new Date(Date.now() + 10000),
      amountCents: 1000,
      currency: "EUR",
      clientToken: "test-token",
      bankAccount: {},
    };

    const mockTx = {
      paymentSession: {
        findUnique: vi.fn().mockResolvedValue(session),
        update: vi.fn().mockResolvedValue({}),
      },
      transaction: {
        findUnique: vi.fn().mockResolvedValue(null), // No existing transaction (not duplicate)
        create: vi.fn().mockResolvedValue({}),
        aggregate: vi.fn().mockResolvedValue({ _sum: { amountCents: 1000 } }), // Full amount paid
      },
    };

    mockTransaction(mockTx);

    const result = await service.settle({ input });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.sessionId).toBe("session-123");
      expect(result.clientToken).toBeDefined();
    }

    expect(mockTx.paymentSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "session-123" },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.objectContaining({
          status: "PAID",
          amountPaidCents: 1000,
        }),
      }),
    );

    expect(publishPaymentEvent).toHaveBeenCalled();
    expect(mockWebhookService.notifyMerchant).toHaveBeenCalledWith({
      sessionId: "session-123",
      event: "payment.success",
    });
  });

  it("should emit payment.partial when partial amount is paid", async () => {
    const session = {
      id: "session-123",
      referenceId: "ref-123",
      status: "PENDING",
      expiresAt: new Date(Date.now() + 10000),
      amountCents: 1000,
      currency: "EUR",
      clientToken: "test-token",
      bankAccount: {},
    };

    const partialInput = {
      referenceId: "ref-123",
      txHash: "hash-456",
      amountCents: 500, // Partial payment
      rawPayload: { some: "data" },
    };

    const mockTx = {
      paymentSession: {
        findUnique: vi.fn().mockResolvedValue(session),
        update: vi.fn().mockResolvedValue({}),
      },
      transaction: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({}),
        aggregate: vi.fn().mockResolvedValue({ _sum: { amountCents: 500 } }), // Partial
      },
    };

    mockTransaction(mockTx);

    const result = await service.settle({ input: partialInput });

    expect(result.success).toBe(true);
    expect(mockTx.paymentSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "session-123" },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.objectContaining({
          status: "PARTIAL", // Still pending
          amountPaidCents: 500,
        }),
      }),
    );

    // Redis event for partial payment should be published
    expect(publishPaymentEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "PAYMENT_PARTIAL",
        referenceId: "ref-123",
        sessionId: "session-123",
        status: "PARTIAL",
        clientToken: "test-token",
      }),
    );
    expect(mockWebhookService.notifyMerchant).toHaveBeenCalledWith({
      sessionId: "session-123",
      event: "payment.partial",
    });
  });

  it("should return success if already processed", async () => {
    const session = {
      id: "session-123",
      status: "PAID",
      clientToken: "test-token",
    };

    const mockTx = {
      paymentSession: {
        findUnique: vi.fn().mockResolvedValue(session),
      },
    };

    mockTransaction(mockTx);

    const result = await service.settle({ input });

    expect(result.success).toBe(true);
    expect(result.alreadyProcessed).toBe(true);
    expect(publishPaymentEvent).not.toHaveBeenCalled();
  });

  it("should return success if transaction already exists (idempotency)", async () => {
    const session = {
      id: "session-123",
      referenceId: "ref-123",
      status: "PENDING",
      expiresAt: new Date(Date.now() + 10000),
      amountCents: 1000,
      currency: "EUR",
      clientToken: "test-token",
      bankAccount: {},
    };

    const mockTx = {
      paymentSession: {
        findUnique: vi.fn().mockResolvedValue(session),
      },
      transaction: {
        findUnique: vi.fn().mockResolvedValue({ id: "existing-tx" }), // Already exists
      },
    };

    mockTransaction(mockTx);

    const result = await service.settle({ input });

    expect(result.success).toBe(true);
    expect(result.alreadyProcessed).toBe(true);
    expect(publishPaymentEvent).not.toHaveBeenCalled();
  });

  it("should fail if session not found", async () => {
    const mockTx = {
      paymentSession: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    };

    mockTransaction(mockTx);

    const result = await service.settle({ input });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Payment session not found");
    }
  });

  it("should fail if transaction currency mismatch", async () => {
    const session = {
      id: "session-123",
      referenceId: "ref-123",
      status: "PENDING",
      expiresAt: new Date(Date.now() + 10000),
      amountCents: 1000,
      currency: "EUR" as Currency,
      clientToken: "test-token",
      bankAccount: {},
    };

    const mismatchInput = {
      referenceId: "ref-123",
      txHash: "hash-456",
      amountCents: 1000,
      currency: "USD" as Currency, // Mismatch
      rawPayload: { some: "data" },
    };

    const mockTx = {
      paymentSession: {
        findUnique: vi.fn().mockResolvedValue(session),
      },
    };

    mockTransaction(mockTx);

    const result = await service.settle({ input: mismatchInput });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Currency mismatch");
    }
  });

  it("should fail if session expired", async () => {
    const session = {
      status: "EXPIRED",
      expiresAt: new Date(Date.now() - 10000),
      amountCents: 1000,
    };

    const mockTx = {
      paymentSession: {
        findUnique: vi.fn().mockResolvedValue(session),
      },
    };

    mockTransaction(mockTx);

    const result = await service.settle({ input });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Payment session expired");
    }
  });

  it("should handle overpayment gracefully", async () => {
    const session = {
      id: "session-123",
      referenceId: "ref-123",
      status: "PENDING",
      expiresAt: new Date(Date.now() + 10000),
      amountCents: 1000,
      currency: "EUR",
      clientToken: "test-token",
      bankAccount: {},
    };

    const overpayInput = {
      referenceId: "ref-123",
      txHash: "hash-456",
      amountCents: 1500, // Overpayment
      rawPayload: { some: "data" },
    };

    const mockTx = {
      paymentSession: {
        findUnique: vi.fn().mockResolvedValue(session),
        update: vi.fn().mockResolvedValue({}),
      },
      transaction: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({}),
        aggregate: vi.fn().mockResolvedValue({ _sum: { amountCents: 1500 } }),
      },
    };

    mockTransaction(mockTx);

    const result = await service.settle({ input: overpayInput });

    expect(result.success).toBe(true);
    expect(mockTx.paymentSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.objectContaining({
          status: "PAID", // Completed (overpayment accepted)
          amountPaidCents: 1500,
        }),
      }),
    );
    expect(publishPaymentEvent).toHaveBeenCalled();
  });

  it("should transition from PARTIAL to PAID when the remaining amount is paid", async () => {
    const session = {
      id: "session-123",
      referenceId: "ref-123",
      status: "PARTIAL", // Already explicitly partial
      expiresAt: new Date(Date.now() + 10000),
      amountCents: 1000,
      amountPaidCents: 500, // 500 already paid
      currency: "EUR",
      clientToken: "test-token",
      bankAccount: {},
    };

    const finalPaymentInput = {
      referenceId: "ref-123",
      txHash: "hash-789",
      amountCents: 500, // Remaining 500
      rawPayload: { some: "data" },
    };

    const mockTx = {
      paymentSession: {
        findUnique: vi.fn().mockResolvedValue(session),
        update: vi.fn().mockResolvedValue({}),
      },
      transaction: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({}),
        aggregate: vi.fn().mockResolvedValue({ _sum: { amountCents: 1000 } }), // 500 + 500 = 1000
      },
    };

    mockTransaction(mockTx);

    const result = await service.settle({ input: finalPaymentInput });

    expect(result.success).toBe(true);
    expect(mockTx.paymentSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "session-123" },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.objectContaining({
          status: "PAID",
          amountPaidCents: 1000,
        }),
      }),
    );

    expect(publishPaymentEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "PAYMENT_SUCCESS",
        status: "PAID",
      }),
    );
    expect(mockWebhookService.notifyMerchant).toHaveBeenCalledWith({
      sessionId: "session-123",
      event: "payment.success",
    });
  });

  it("should emit another payment.partial if a subsequent payment still does not cover the full amount", async () => {
    const session = {
      id: "session-123",
      referenceId: "ref-123",
      status: "PARTIAL",
      expiresAt: new Date(Date.now() + 10000),
      amountCents: 1000,
      amountPaidCents: 200, // 200 already paid
      currency: "EUR",
      clientToken: "test-token",
      bankAccount: {},
    };

    const nextPartialInput = {
      referenceId: "ref-123",
      txHash: "hash-890",
      amountCents: 300,
      rawPayload: { some: "data" },
    };

    const mockTx = {
      paymentSession: {
        findUnique: vi.fn().mockResolvedValue(session),
        update: vi.fn().mockResolvedValue({}),
      },
      transaction: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({}),
        aggregate: vi.fn().mockResolvedValue({ _sum: { amountCents: 500 } }), // 200 + 300 = 500 total
      },
    };

    mockTransaction(mockTx);

    const result = await service.settle({ input: nextPartialInput });

    expect(result.success).toBe(true);
    expect(mockTx.paymentSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.objectContaining({
          status: "PARTIAL",
          amountPaidCents: 500,
        }),
      }),
    );

    expect(publishPaymentEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "PAYMENT_PARTIAL",
        status: "PARTIAL",
      }),
    );
    expect(mockWebhookService.notifyMerchant).toHaveBeenCalledWith({
      sessionId: "session-123",
      event: "payment.partial",
    });
  });
});
