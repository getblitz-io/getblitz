import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { Redis } from "@getblitz/redis";

import { CredentialCacheService } from "./credential-cache.service";

describe("CredentialCacheService", () => {
  let service: CredentialCacheService;
  const mockRedis = {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  };

  beforeAll(() => {
    service = new CredentialCacheService(mockRedis as unknown as Redis);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should get credentials from cache", async () => {
    mockRedis.get.mockResolvedValue('{"accessToken":"abc"}');
    const result = await service.getCredentials({ sessionId: "session1" });
    expect(result).toEqual({ accessToken: "abc" });
    expect(mockRedis.get).toHaveBeenCalledWith(
      expect.stringContaining("session1"),
    );
  });

  it("should return null if not in cache", async () => {
    mockRedis.get.mockResolvedValue(null);
    const result = await service.getCredentials({ sessionId: "session1" });
    expect(result).toBeNull();
  });

  it("should set credentials in cache", async () => {
    await service.storeCredentials({
      sessionId: "session1",
      credentials: { accessToken: "abc" },
      ttlSeconds: 300,
    });
    expect(mockRedis.set).toHaveBeenCalledWith(
      expect.stringContaining("session1"),
      '{"accessToken":"abc"}',
      "EX",
      300,
    );
  });

  it("should delete credentials from cache", async () => {
    await service.deleteCredentials({ sessionId: "session1" });
    expect(mockRedis.del).toHaveBeenCalledWith(
      expect.stringContaining("session1"),
    );
  });
});
