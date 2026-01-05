import type { Mocked } from "vitest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { BankProvider } from "@getblitz/bank-providers";
import { ProviderRegistry } from "@getblitz/bank-providers";
import { BankConnectionStatus } from "@getblitz/database";

import type {
  IOrganizationBankConnectionRepository,
  IOrganizationRepository,
  IPaymentSettlementService,
} from "../interfaces";
import { BankWebhookService } from "./bank-webhook.service";

vi.mock("@getblitz/bank-providers", () => ({
  ProviderRegistry: {
    getProvider: vi.fn(),
  },
}));

vi.mock("../utils/logger", () => ({
  webhookLogger: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("BankWebhookService", () => {
  const mockedRegistry = ProviderRegistry as Mocked<typeof ProviderRegistry>;
  let service: BankWebhookService;
  const mockOrgRepo = {
    findById: vi.fn(),
    findBySlug: vi.fn(),
    findByUserId: vi.fn(),
    getCountsByOrgIds: vi.fn(),
    findMemberByUserAndOrg: vi.fn(),
  };
  const mockConnRepo = {
    findById: vi.fn(),
    findByOrganizationIdAndProviderId: vi.fn(),
    findByOrganizationId: vi.fn(),
    findDefaultByOrganizationId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const mockSettlement = {
    settle: vi.fn(),
    postSettle: vi.fn(),
  };

  beforeAll(() => {
    service = new BankWebhookService(
      mockOrgRepo as unknown as IOrganizationRepository,
      mockConnRepo as unknown as IOrganizationBankConnectionRepository,
      mockSettlement as unknown as IPaymentSettlementService,
    );
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should process webhook successfully", async () => {
    const connection = {
      id: "conn-123",
      providerId: "test-bank",
      status: BankConnectionStatus.CONNECTED,
      webhookSecret: "secret",
    };
    mockConnRepo.findById.mockResolvedValue(connection);

    const mockProvider = {
      verifyAndParseWebhook: vi.fn().mockResolvedValue({
        valid: true,
        referenceId: "ref-1",
        txHash: "hash-1",
        amountCents: 1000,
        rawPayload: {},
      }),
    };
    mockedRegistry.getProvider.mockReturnValue(
      mockProvider as unknown as BankProvider,
    );

    mockSettlement.settle.mockResolvedValue({ success: true });

    const request = new Request("https://test.com", { method: "POST" });
    const result = await service.processWebhookByConnectionId({
      connectionId: "conn-123",
      request,
    });

    expect(result.success).toBe(true);
    expect(mockSettlement.settle).toHaveBeenCalledWith({
      input: {
        referenceId: "ref-1",
        txHash: "hash-1",
        amountCents: 1000,
        rawPayload: {},
      },
    });
  });

  it("should fail if connection not found", async () => {
    mockConnRepo.findById.mockResolvedValue(null);

    const result = await service.processWebhookByConnectionId({
      connectionId: "unknown",
      request: new Request("https://test.com"),
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("NOT_FOUND");
  });

  it("should fail if connection not connected", async () => {
    mockConnRepo.findById.mockResolvedValue({
      status: BankConnectionStatus.DISCONNECTED,
    });

    const result = await service.processWebhookByConnectionId({
      connectionId: "conn-123",
      request: new Request("https://test.com"),
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("not connected");
  });

  it("should fail if signature verification fails", async () => {
    mockConnRepo.findById.mockResolvedValue({
      status: BankConnectionStatus.CONNECTED,
      providerId: "test",
    });

    const mockProvider = {
      verifyAndParseWebhook: vi.fn().mockResolvedValue({
        valid: false,
        error: "Invalid signature",
      }),
    };
    mockedRegistry.getProvider.mockReturnValue(
      mockProvider as unknown as BankProvider,
    );

    const result = await service.processWebhookByConnectionId({
      connectionId: "conn-123",
      request: new Request("https://test.com"),
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("INVALID_SIGNATURE");
  });
});
