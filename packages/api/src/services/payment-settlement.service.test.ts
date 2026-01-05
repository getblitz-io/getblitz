import type { Mocked } from "vitest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@getblitz/database";
import { publishPaymentEvent } from "@getblitz/redis";

import type { IWebhookService } from "../interfaces";
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
    service = new PaymentSettlementService(
      mockWebhookService as unknown as IWebhookService,
    );
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

  it("should settle payment successfully", async () => {
    const session = {
      id: "session-123",
      referenceId: "ref-123",
      status: "PENDING",
      expiresAt: new Date(Date.now() + 10000),
      amountCents: 1000,
      clientToken: "test-token",
      bankAccount: {},
    };

    const mockTx = {
      paymentSession: {
        findUnique: vi.fn().mockResolvedValue(session),
        update: vi.fn().mockResolvedValue({}),
      },
      transaction: {
        create: vi.fn().mockResolvedValue({}),
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
        data: expect.objectContaining({ status: "PAID" }),
      }),
    );

    expect(publishPaymentEvent).toHaveBeenCalled();
    expect(mockWebhookService.notifyMerchant).toHaveBeenCalledWith({
      sessionId: "session-123",
      event: "payment.success",
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

  it("should fail if amount mismatch", async () => {
    const session = {
      status: "PENDING",
      expiresAt: new Date(Date.now() + 10000),
      amountCents: 2000,
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
      expect(result.error).toContain("Amount mismatch");
    }
  });
});
