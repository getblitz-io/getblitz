import { beforeAll, describe, expect, it, vi } from "vitest";

import type { IApiKeyRepository } from "../interfaces";
import { ApiKeyService } from "./api-key.service";

describe("ApiKeyService", () => {
  let service: ApiKeyService;
  const mockApiKeyRepository = {
    findBySecretKey: vi.fn(),
    updateLastUsed: vi.fn(),
  };

  beforeAll(() => {
    service = new ApiKeyService(
      mockApiKeyRepository as unknown as IApiKeyRepository,
    );
  });

  it("should validate a valid API key", async () => {
    const authHeader = "Bearer sk_test_123";
    mockApiKeyRepository.findBySecretKey.mockResolvedValue({
      id: "key-1",
      organizationId: "org-1",
    });

    const result = await service.validate({ authHeader });

    expect(result.valid).toBe(true);
    expect(result.organizationId).toBe("org-1");
    expect(result.keyId).toBe("key-1");
    expect(mockApiKeyRepository.findBySecretKey).toHaveBeenCalledWith({
      secretKey: "sk_test_123",
    });
    expect(mockApiKeyRepository.updateLastUsed).toHaveBeenCalledWith({
      id: "key-1",
    });
  });

  it("should return invalid for missing auth header", async () => {
    const result = await service.validate({ authHeader: null });

    expect(result.valid).toBe(false);
    expect(result.error).toBe("Missing or invalid Authorization header");
  });

  it("should return invalid for non-bearer auth header", async () => {
    const result = await service.validate({ authHeader: "Basic something" });

    expect(result.valid).toBe(false);
    expect(result.error).toBe("Missing or invalid Authorization header");
  });

  it("should return invalid for unknown API key", async () => {
    const authHeader = "Bearer sk_unknown";
    mockApiKeyRepository.findBySecretKey.mockResolvedValue(null);

    const result = await service.validate({ authHeader });

    expect(result.valid).toBe(false);
    expect(result.error).toBe("Invalid API key");
  });
});
