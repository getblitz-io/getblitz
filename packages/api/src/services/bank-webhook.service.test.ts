import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { WebhookVerificationStatus } from "@getblitz/bank-providers";
import { BankConnectionStatus } from "@getblitz/database";

import type {
  ICredentialManagerService,
  IOrganizationBankConnectionRepository,
} from "../interfaces";
import { BankWebhookService } from "./bank-webhook.service";

vi.mock("@getblitz/bank-providers", async (importOriginal) => ({
  ...(await importOriginal()),
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
  let service: BankWebhookService;

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
  const mockCredentialManager = {
    decryptCredentials: vi.fn().mockReturnValue({ accessToken: "test-token" }),
    encryptCredentials: vi.fn(),
    decryptProviderConfig: vi.fn(),
    encryptProviderConfig: vi.fn(),
    isTokenExpiringSoon: vi.fn(),
    createConfiguredProvider: vi.fn(),
    createAuthenticatedProvider: vi.fn(),
  };

  beforeAll(() => {
    service = new BankWebhookService(
      mockConnRepo as unknown as IOrganizationBankConnectionRepository,
      mockSettlement,
      mockCredentialManager as unknown as ICredentialManagerService,
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
      webhookUrl: "https://app.test/api/webhooks/connection/conn-123",
      webhookSecret: "secret",
      credentials: "encrypted-credentials",
    };
    mockConnRepo.findById.mockResolvedValue(connection);

    const mockProvider = {
      verifyAndParseWebhook: vi.fn().mockResolvedValue({
        status: WebhookVerificationStatus.Success,
        referenceId: "ref-1",
        txHash: "hash-1",
        amountCents: 1000,
        rawPayload: {},
      }),
    };
    mockCredentialManager.createAuthenticatedProvider.mockReturnValue(
      mockProvider,
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

  it("should process webhook successfully if connection is in NEEDS_REAUTH status", async () => {
    const connection = {
      id: "conn-123",
      providerId: "test-bank",
      status: BankConnectionStatus.NEEDS_REAUTH,
      webhookUrl: "https://app.test/api/webhooks/connection/conn-123",
      webhookSecret: "secret",
      credentials: "encrypted-credentials",
    };
    mockConnRepo.findById.mockResolvedValue(connection);

    const mockProvider = {
      verifyAndParseWebhook: vi.fn().mockResolvedValue({
        status: WebhookVerificationStatus.Success,
        referenceId: "ref-1",
        txHash: "hash-1",
        amountCents: 1000,
        rawPayload: {},
      }),
    };
    mockCredentialManager.createAuthenticatedProvider.mockReturnValue(
      mockProvider,
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

  it("should process webhook when merchant secret is empty (RSA providers e.g. Wise)", async () => {
    mockConnRepo.findById.mockResolvedValue({
      id: "conn-wise",
      status: BankConnectionStatus.CONNECTED,
      providerId: "wise",
      webhookUrl: "https://app.test/api/webhooks/connection/conn-wise",
      webhookSecret: "",
      credentials: "encrypted-credentials",
    });

    const mockProvider = {
      verifyAndParseWebhook: vi.fn().mockResolvedValue({
        status: WebhookVerificationStatus.Success,
        referenceId: "GB-TESTREF1",
        txHash: "occ-1",
        amountCents: 5000,
        rawPayload: {},
      }),
    };
    mockCredentialManager.createAuthenticatedProvider.mockReturnValue(
      mockProvider,
    );
    mockSettlement.settle.mockResolvedValue({ success: true });

    const result = await service.processWebhookByConnectionId({
      connectionId: "conn-wise",
      request: new Request("https://test.com", { method: "POST" }),
    });

    expect(result.success).toBe(true);
    expect(mockProvider.verifyAndParseWebhook).toHaveBeenCalledWith({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      request: expect.any(Request),
      secret: undefined,
    });
  });

  it("should fail if webhook URL is not configured", async () => {
    mockConnRepo.findById.mockResolvedValue({
      status: BankConnectionStatus.CONNECTED,
      providerId: "wise",
      webhookUrl: null,
      webhookSecret: "",
    });

    const result = await service.processWebhookByConnectionId({
      connectionId: "conn-123",
      request: new Request("https://test.com"),
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("webhook is not configured");
  });

  it("should fail if signature verification fails", async () => {
    mockConnRepo.findById.mockResolvedValue({
      status: BankConnectionStatus.CONNECTED,
      providerId: "test",
      webhookUrl: "https://app.test/api/webhooks/connection/conn-123",
      webhookSecret: "secret",
    });

    const mockProvider = {
      verifyAndParseWebhook: vi.fn().mockResolvedValue({
        status: "error",
        error: "Invalid signature",
      }),
    };
    mockCredentialManager.createAuthenticatedProvider.mockReturnValue(
      mockProvider,
    );

    const result = await service.processWebhookByConnectionId({
      connectionId: "conn-123",
      request: new Request("https://test.com"),
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("INVALID_SIGNATURE");
  });

  it("should ignore if webhook is ignored", async () => {
    mockConnRepo.findById.mockResolvedValue({
      status: BankConnectionStatus.CONNECTED,
      providerId: "test",
      webhookUrl: "https://app.test/api/webhooks/connection/conn-123",
      webhookSecret: "secret",
    });

    const mockProvider = {
      verifyAndParseWebhook: vi.fn().mockResolvedValue({
        status: "ignore",
        reason: "Already processed",
      }),
    };
    mockCredentialManager.createAuthenticatedProvider.mockReturnValue(
      mockProvider,
    );

    const result = await service.processWebhookByConnectionId({
      connectionId: "conn-123",
      request: new Request("https://test.com"),
    });

    expect(result.success).toBe(true);
    expect(result.errorCode).toBe("IGNORE");
    expect(result.error).toBe("Already processed");
  });
});
