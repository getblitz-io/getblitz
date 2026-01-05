import type { Mocked } from "vitest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { BankProvider } from "@getblitz/bank-providers";
import { ProviderRegistry } from "@getblitz/bank-providers";

import type { IOrganizationBankConnectionRepository } from "../interfaces";
import type { SecurityService } from "./security.service";
import { CredentialManagerService } from "./credential-manager.service";

vi.mock("@getblitz/bank-providers", () => ({
  ProviderRegistry: {
    getProvider: vi.fn(),
    createProvider: vi.fn(),
  },
}));

describe("CredentialManagerService", () => {
  const mockedRegistry = ProviderRegistry as Mocked<typeof ProviderRegistry>;
  let service: CredentialManagerService;
  const mockRepo = {
    findById: vi.fn(),
    update: vi.fn(),
    findByOrganizationIdAndProviderId: vi.fn(),
    findByOrganizationId: vi.fn(),
    findDefaultByOrganizationId: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  };
  const mockSecurity = {
    encrypt: vi.fn(({ text }) => `enc:${text}`),
    decrypt: vi.fn(({ text }: { text: string }) => text.replace("enc:", "")),
  };

  beforeAll(() => {
    service = new CredentialManagerService(
      mockRepo as unknown as IOrganizationBankConnectionRepository,
      mockSecurity as unknown as SecurityService,
    );
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should encrypt and decrypt provider config", () => {
    const config = { some: "config" };
    const encrypted = service.encryptProviderConfig(config);
    expect(encrypted).toBe('enc:{"some":"config"}');

    const decrypted = service.decryptProviderConfig(encrypted);
    expect(decrypted).toEqual(config);
  });

  it("should encrypt and decrypt credentials", () => {
    const creds = { accessToken: "abc", expiresAt: new Date("2025-01-01") };
    const encrypted = service.encryptCredentials(creds);
    expect(mockSecurity.encrypt).toHaveBeenCalled();

    const decrypted = service.decryptCredentials(encrypted);
    expect(decrypted.accessToken).toBe("abc");
    expect(decrypted.expiresAt).toBeInstanceOf(Date);
  });

  it("should check if token is expiring soon", () => {
    const expired = { expiresAt: new Date(Date.now() - 1000) };
    const soon = { expiresAt: new Date(Date.now() + 2 * 60 * 1000) }; // 2 mins from now
    const far = { expiresAt: new Date(Date.now() + 10 * 60 * 1000) }; // 10 mins from now

    expect(service.isTokenExpiringSoon(expired)).toBe(true);
    expect(service.isTokenExpiringSoon(soon)).toBe(true); // default buffer 5 mins
    expect(service.isTokenExpiringSoon(far)).toBe(false);
  });

  it("should get valid credentials without refresh if still valid", async () => {
    const connection = {
      id: "conn-123",
      credentials: 'enc:{"accessToken":"valid"}',
      providerConfig: "enc:{}",
      providerId: "test-bank",
    };
    mockRepo.findById.mockResolvedValue(connection);
    mockedRegistry.getProvider.mockReturnValue({
      supportsTokenRefresh: () => true,
    } as unknown as BankProvider);

    const result = await service.getValidCredentials({
      connectionId: "conn-123",
    });

    expect(result.credentials.accessToken).toBe("valid");
    expect(result.wasRefreshed).toBe(false);
  });

  it("should refresh credentials if expiring", async () => {
    const connection = {
      id: "conn-123",
      credentials: `enc:{"accessToken":"old","refreshToken":"ref-123","expiresAt":"${new Date(Date.now() + 1000).toISOString()}"}`,
      providerConfig: "enc:{}",
      providerId: "test-bank",
    };
    mockRepo.findById.mockResolvedValue(connection);

    const mockProviderTemplate = {
      supportsTokenRefresh: () => true,
    };
    const mockProviderInstance = {
      refreshToken: vi
        .fn()
        .mockResolvedValue({ accessToken: "new", refreshToken: "ref-123" }),
    };

    mockedRegistry.getProvider.mockReturnValue(
      mockProviderTemplate as unknown as BankProvider,
    );
    mockedRegistry.createProvider.mockReturnValue(
      mockProviderInstance as unknown as BankProvider,
    );

    const result = await service.getValidCredentials({
      connectionId: "conn-123",
    });

    expect(result.credentials.accessToken).toBe("new");
    expect(result.wasRefreshed).toBe(true);
    expect(mockRepo.update).toHaveBeenCalledWith({
      id: "conn-123",
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      data: { credentials: expect.stringContaining("new") },
    });
  });
});
