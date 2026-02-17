import type { Mocked } from "vitest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  AuthenticatedProvider,
  BankCredentials,
  BankProvider,
  ConfiguredProvider,
} from "@getblitz/bank-providers";
import { ProviderRegistry } from "@getblitz/bank-providers";

import type { IOrganizationBankConnectionRepository } from "../interfaces";
import type { SecurityService } from "./security.service";
import { CredentialManagerService } from "./credential-manager.service";

vi.mock("@getblitz/bank-providers", () => ({
  ProviderRegistry: {
    getProvider: vi.fn(),
    createConfiguredProvider: vi.fn(),
    createAuthenticatedProvider: vi.fn(),
  },
}));

describe("CredentialManagerService", () => {
  const mockedRegistry = ProviderRegistry as Mocked<typeof ProviderRegistry>;
  let service: CredentialManagerService;
  const mockRepo = {
    findById: vi.fn(),
    findOne: vi.fn(),
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
    const creds = {
      accessToken: "abc",
      expiresAt: new Date("2025-01-01"),
      refreshToken: "ref-123",
    };
    const encrypted = service.encryptCredentials(creds);
    expect(mockSecurity.encrypt).toHaveBeenCalled();

    const decrypted = service.decryptCredentials(encrypted) as {
      accessToken: string;
      expiresAt: Date;
      refreshToken: string;
    };
    expect(decrypted.accessToken).toBe("abc");
    expect(decrypted.expiresAt).toBeInstanceOf(Date);
    expect(decrypted.refreshToken).toBe("ref-123");
  });

  it("should check if token is expiring soon", () => {
    const expired = {
      expiresAt: new Date(Date.now() - 1000),
    } as unknown as BankCredentials;
    const soon = {
      expiresAt: new Date(Date.now() + 2 * 60 * 1000),
    } as unknown as BankCredentials; // 2 mins from now
    const far = {
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    } as unknown as BankCredentials; // 10 mins from now

    expect(service.isTokenExpiringSoon(expired)).toBe(true);
    expect(service.isTokenExpiringSoon(soon)).toBe(true); // default buffer 5 mins
    expect(service.isTokenExpiringSoon(far)).toBe(false);
  });

  it("should create a configured provider", async () => {
    const connection = {
      id: "conn-123",
      providerConfig: 'enc:{"clientId":"cid"}',
      providerId: "test-bank",
    };
    mockRepo.findOne.mockResolvedValue(connection);

    const mockConfiguredProvider = {
      getAuthUrl: vi.fn(),
    };
    mockedRegistry.createConfiguredProvider.mockReturnValue(
      mockConfiguredProvider as unknown as ConfiguredProvider,
    );

    const result = await service.createConfiguredProvider({
      connectionId: "conn-123",
    });

    expect(result).toBe(mockConfiguredProvider);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockedRegistry.createConfiguredProvider).toHaveBeenCalledWith({
      id: "test-bank",
      config: { clientId: "cid" },
    });
  });

  it("should create an authenticated provider without refresh when token is valid", async () => {
    const connection = {
      id: "conn-123",
      credentials: `enc:{"accessToken":"valid","expiresAt":"${new Date(Date.now() + 60 * 60 * 1000).toISOString()}"}`,
      providerConfig: 'enc:{"clientId":"cid"}',
      providerId: "test-bank",
    };
    mockRepo.findOne.mockResolvedValue(connection);

    const mockAuthenticatedProvider = {
      listAccounts: vi.fn(),
    };
    mockedRegistry.createAuthenticatedProvider.mockReturnValue(
      mockAuthenticatedProvider as unknown as AuthenticatedProvider,
    );

    const result = await service.createAuthenticatedProvider({
      connectionId: "conn-123",
    });

    expect(result).toBe(mockAuthenticatedProvider);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockedRegistry.createAuthenticatedProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "test-bank",
        config: { clientId: "cid" },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        credentials: expect.objectContaining({ accessToken: "valid" }),
      }),
    );
  });

  it("should refresh credentials if expiring", async () => {
    const connection = {
      id: "conn-123",
      credentials: `enc:{"accessToken":"old","refreshToken":"ref-123","expiresAt":"${new Date(Date.now() + 1000).toISOString()}"}`,
      providerConfig: 'enc:{"clientId":"cid"}',
      providerId: "test-bank",
    };
    mockRepo.findOne.mockResolvedValue(connection);

    const mockProviderTemplate = {
      supportsTokenRefresh: () => true,
    };
    const mockConfiguredProvider = {
      refreshToken: vi
        .fn()
        .mockResolvedValue({ accessToken: "new", refreshToken: "ref-123" }),
    };
    const mockAuthenticatedProvider = {
      listAccounts: vi.fn(),
    };

    mockedRegistry.getProvider.mockReturnValue(
      mockProviderTemplate as unknown as BankProvider,
    );
    mockedRegistry.createConfiguredProvider.mockReturnValue(
      mockConfiguredProvider as unknown as ConfiguredProvider,
    );
    mockedRegistry.createAuthenticatedProvider.mockReturnValue(
      mockAuthenticatedProvider as unknown as AuthenticatedProvider,
    );

    const result = await service.createAuthenticatedProvider({
      connectionId: "conn-123",
    });

    expect(result).toBe(mockAuthenticatedProvider);
    expect(mockConfiguredProvider.refreshToken).toHaveBeenCalledWith({
      refreshToken: "ref-123",
      callbackUrl: undefined,
    });
    expect(mockRepo.update).toHaveBeenCalledWith({
      id: "conn-123",
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      data: { credentials: expect.stringContaining("new") },
    });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockedRegistry.createAuthenticatedProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "test-bank",
        config: { clientId: "cid" },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        credentials: expect.objectContaining({ accessToken: "new" }),
      }),
    );
  });
});
