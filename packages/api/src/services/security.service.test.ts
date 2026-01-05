import { describe, expect, it, vi } from "vitest";

import { SecurityService } from "./security.service";

// Mock env before importing SecurityService
vi.mock("../env", () => ({
  env: {
    ENCRYPTION_KEY: "0".repeat(64), // 32-byte hex key
  },
}));

describe("SecurityService", () => {
  it("should encrypt and decrypt text correctly", () => {
    const service = new SecurityService();
    const text = "hello-world";

    const encrypted = service.encrypt({ text });
    expect(encrypted).toBeDefined();
    expect(encrypted).not.toBe(text);
    expect(encrypted.split(":").length).toBe(3);

    const decrypted = service.decrypt({ text: encrypted });
    expect(decrypted).toBe(text);
  });

  it("should throw error if ENCRYPTION_KEY is invalid", () => {
    expect(() => new SecurityService("too-short")).toThrow(
      "ENCRYPTION_KEY must be a 32-byte hex string (64 characters)",
    );
  });

  it("should throw error for invalid encrypted format", () => {
    const service = new SecurityService();
    expect(() => service.decrypt({ text: "invalid-format" })).toThrow(
      "Invalid encrypted text format",
    );
  });
});
