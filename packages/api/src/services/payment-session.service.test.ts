import type { Mocked } from "vitest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { BankProvider } from "@getblitz/bank-providers";
import { ProviderRegistry } from "@getblitz/bank-providers";
import { Currency } from "@getblitz/database";

import type {
  CreateChallengeInput,
  IBankAccountRepository,
  IPaymentSessionRepository,
  IPaymentSettlementService,
} from "../interfaces";
import { PaymentSessionService } from "./payment-session.service";

vi.mock("@getblitz/bank-providers", () => ({
  ProviderRegistry: {
    getProvider: vi.fn(),
  },
}));

describe("PaymentSessionService", () => {
  const mockedRegistry = ProviderRegistry as Mocked<typeof ProviderRegistry>;
  let service: PaymentSessionService;
  const mockSessionRepo = {
    create: vi.fn(),
    findById: vi.fn(),
    findByReferenceId: vi.fn(),
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

  beforeAll(() => {
    service = new PaymentSessionService(
      mockSessionRepo as unknown as IPaymentSessionRepository,
      mockBankRepo as unknown as IBankAccountRepository,
      mockSettlement as unknown as IPaymentSettlementService,
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

    const result = await service.createChallenge({
      input,
      baseUrl: "https://pay.test",
    });

    expect(result.sessionId).toBe("session-1");
    expect(result.paymentUrl).toBe("https://pay.test/pay/session-1");
  });

  it("should get session details and expire if needed", async () => {
    const session = {
      id: "session-1",
      referenceId: "ref-1",
      amountCents: 1000,
      currency: Currency.EUR,
      status: "PENDING",
      expiresAt: new Date(Date.now() - 1000), // Expired
      organization: { name: "Test Org" },
      bankAccount: {
        accountIban: "FR123",
        accountName: "Test Account",
        organizationBankConnection: { id: "conn-1", providerId: "qonto" },
      },
    };
    mockSessionRepo.findById.mockResolvedValue(session);
    mockedRegistry.getProvider.mockReturnValue({
      id: "qonto",
      displayName: "Qonto",
      domain: "qonto.com",
    } as unknown as BankProvider);

    const result = await service.getSessionDetails({ sessionId: "session-1" });

    expect(result?.status).toBe("EXPIRED");
    expect(mockSessionRepo.updateStatus).toHaveBeenCalledWith({
      id: "session-1",
      status: "EXPIRED",
    });
  });

  it("should simulate payment", async () => {
    const session = {
      id: "session-1",
      referenceId: "ref-1",
      amountCents: 1000,
      status: "PENDING",
    };
    mockSessionRepo.findById.mockResolvedValue(session);
    mockSettlement.settle.mockResolvedValue({ success: true });

    const result = await service.simulatePayment({ sessionId: "session-1" });

    expect(result.success).toBe(true);
    expect(mockSettlement.settle).toHaveBeenCalled();
  });
});
