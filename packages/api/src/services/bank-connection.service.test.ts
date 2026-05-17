import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  ICredentialManagerService,
  IOrganizationBankConnectionRepository,
} from "../interfaces";
import { BankConnectionService } from "./bank-connection.service";

vi.mock("../env", () => ({
  env: {
    NEXT_PUBLIC_APP_URL: "https://app.test",
  },
}));

describe("BankConnectionService", () => {
  let service: BankConnectionService;
  const mockRepo = {
    create: vi.fn(),
    findById: vi.fn(),
    findByOrganizationIdAndProviderId: vi.fn(),
    update: vi.fn(),
    findByOrganizationId: vi.fn(),
    findDefaultByOrganizationId: vi.fn(),
    delete: vi.fn(),
  };
  const mockCredManager = {
    decryptProviderConfig: vi.fn(),
    getValidCredentials: vi.fn(),
    refreshCredentials: vi.fn(),
    isTokenExpiringSoon: vi.fn(),
    createConfiguredProvider: vi.fn(),
    createAuthenticatedProvider: vi.fn(),
  };

  beforeAll(() => {
    service = new BankConnectionService(
      mockRepo as unknown as IOrganizationBankConnectionRepository,
      mockCredManager as unknown as ICredentialManagerService,
    );
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a bank connection", async () => {
    const data = {
      organizationId: "org-1",
      providerId: "test",
      providerConfig: "cfg",
    };
    mockRepo.create.mockResolvedValue({ id: "conn-1" });

    const result = await service.create({ data });

    expect(result.id).toBe("conn-1");
    expect(mockRepo.create).toHaveBeenCalledWith({ data });
  });

  it("should setup webhook successfully", async () => {
    const connection = {
      id: "conn-123",
      providerConfig: "enc:cfg",
      providerId: "test-bank",
    };
    mockRepo.findById.mockResolvedValue(connection);
    mockCredManager.decryptProviderConfig.mockReturnValue({ some: "cfg" });

    const mockProvider = {
      createWebhook: vi.fn().mockResolvedValue({ secret: "webhook-secret" }),
    };
    mockCredManager.createAuthenticatedProvider.mockResolvedValue(mockProvider);

    const result = await service.setupWebhook({
      connectionId: "conn-123",
    });

    expect(result.success).toBe(true);
    expect(mockProvider.createWebhook).toHaveBeenCalledWith({
      webhookUrl: "https://app.test/api/webhooks/connection/conn-123",
    });
    expect(mockRepo.update).toHaveBeenCalledWith({
      id: "conn-123",
      data: {
        webhookUrl: "https://app.test/api/webhooks/connection/conn-123",
        webhookSecret: "webhook-secret",
      },
    });
  });
});
