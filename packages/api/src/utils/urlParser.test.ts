import { describe, expect, it, vi } from "vitest";

import { parseDeviceDetails } from "./urlParser";

// Mock environment validation
vi.mock("./env", () => ({
  env: {
    NODE_ENV: "test",
  },
  apiEnv: () => ({
    NODE_ENV: "test",
  }),
}));

// Mock the container to avoid side effects
vi.mock("./container", () => ({
  getContainer: () => ({}),
}));

describe("parseDeviceDetails", () => {
  it("should parse standard desktop user agent", () => {
    const headers = new Map();
    headers.set(
      "user-agent",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    );
    headers.set("x-forwarded-for", "127.0.0.1");

    const result = parseDeviceDetails(headers as unknown as Headers);

    expect(result).toMatchObject({
      ipAddress: "127.0.0.1",
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      deviceType: "desktop",
      deviceOs: "macOS 10.15.7",
      deviceBrowser: "Chrome 120.0.0.0",
    });
  });

  it("should parse mobile user agent", () => {
    const headers = new Map();
    headers.set(
      "user-agent",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    );

    const result = parseDeviceDetails(headers as unknown as Headers);

    expect(result).toMatchObject({
      deviceType: "mobile",
      deviceOs: "iOS 17.0",
      deviceBrowser: "Mobile Safari 17.0",
    });
  });

  it("should handle missing user agent", () => {
    const headers = new Map();

    const result = parseDeviceDetails(headers as unknown as Headers);

    expect(result).toMatchObject({
      deviceType: "desktop",
      deviceOs: "Unknown",
      deviceBrowser: "Unknown",
    });
  });

  it("should handle multiple IPs in x-forwarded-for", () => {
    const headers = new Map();
    headers.set("x-forwarded-for", "10.0.0.1, 10.0.0.2");

    const result = parseDeviceDetails(headers as unknown as Headers);

    expect(result).toMatchObject({
      ipAddress: "10.0.0.1",
    });
  });
});
