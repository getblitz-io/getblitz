import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockDeep } from "vitest-mock-extended";

import type { Redis } from "@getblitz/redis";

import { PreviewService } from "./preview.service";

describe("PreviewService", () => {
  const redisMock = mockDeep<Redis>();

  let service: PreviewService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PreviewService(redisMock);
  });

  describe("createPreviewToken", () => {
    it("should generate a token and store it in redis", async () => {
      const params = {
        resourceType: "invoice" as const,
        resourceId: "inv_123",
        organizationId: "org_123",
        userId: "user_123",
      };

      redisMock.set.mockResolvedValue("OK");

      const token = await service.createPreviewToken(params);

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(redisMock.set).toHaveBeenCalledWith(
        `preview:${token}`,
        expect.stringContaining(params.resourceId),
        "EX",
        3600,
      );
    });

    it("should use custom expiration if provided", async () => {
      const params = {
        resourceType: "invoice" as const,
        resourceId: "inv_123",
        organizationId: "org_123",
        userId: "user_123",
        expiresInSeconds: 60,
      };

      redisMock.set.mockResolvedValue("OK");

      await service.createPreviewToken(params);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(redisMock.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        "EX",
        60,
      );
    });
  });

  describe("verifyPreviewToken", () => {
    it("should return null if token does not exist", async () => {
      redisMock.get.mockResolvedValue(null);

      const result = await service.verifyPreviewToken({
        previewToken: "invalid_token",
        userId: "user_123",
      });

      expect(result).toBeNull();
    });

    it("should return parsed data if token exists", async () => {
      const storedData = {
        resourceType: "invoice",
        resourceId: "inv_123",
        organizationId: "org_123",
        userId: "user_123",
      };

      redisMock.get.mockResolvedValue(JSON.stringify(storedData));

      const result = await service.verifyPreviewToken({
        previewToken: "valid_token",
        userId: "user_123",
      });

      expect(result).toEqual({
        ...storedData,
        organization: { id: storedData.organizationId },
      });
    });

    it("should return null if data is invalid json", async () => {
      redisMock.get.mockResolvedValue("invalid_json");

      const result = await service.verifyPreviewToken({
        previewToken: "token",
        userId: "user_123",
      });

      expect(result).toBeNull();
    });
  });
});
