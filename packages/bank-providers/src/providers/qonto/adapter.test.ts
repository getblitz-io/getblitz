import { createHmac } from "crypto";
import { assert, beforeEach, describe, expect, it, vi } from "vitest";

import { QontoProvider } from "./adapter";

// Mock fetch globally
global.fetch = vi.fn();

describe("QontoProvider", () => {
  const config = {
    clientId: "test-client-id",
    clientSecret: "test-client-secret",
    sandboxMode: false,
    oauthBaseUrl: "https://oauth.qonto.com",
    thirdPartyBaseUrl: "https://thirdparty.qonto.com",
  };

  const sandboxConfig = {
    ...config,
    sandboxMode: true,
    sandboxToken: "test-sandbox-token",
    oauthBaseUrl: "https://oauth-sandbox.staging.qonto.co",
    thirdPartyBaseUrl: "https://thirdparty-sandbox.staging.qonto.co",
  };

  let provider: QontoProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new QontoProvider(config);
  });

  describe("initialization", () => {
    it("should use production URLs by default", () => {
      const p = new QontoProvider(config);
      // @ts-expect-error - testing private fields
      expect(p.oauthBaseUrl).toBe("https://oauth.qonto.com");
      // @ts-expect-error - testing private fields
      expect(p.thirdPartyBaseUrl).toBe("https://thirdparty.qonto.com");
    });

    it("should use sandbox URLs when sandboxMode is true", () => {
      const p = new QontoProvider(sandboxConfig);
      // @ts-expect-error - testing private fields
      expect(p.oauthBaseUrl).toBe("https://oauth-sandbox.staging.qonto.co");
      // @ts-expect-error - testing private fields
      expect(p.thirdPartyBaseUrl).toBe(
        "https://thirdparty-sandbox.staging.qonto.co",
      );
    });
  });

  describe("getProviderConfigSchema", () => {
    it("should return the correct configuration schema", () => {
      const schema = provider.getProviderConfigSchema();
      expect(schema.fields).toBeDefined();
      expect(schema.fields.some((f) => f.name === "clientId")).toBe(true);
      expect(schema.fields.some((f) => f.name === "clientSecret")).toBe(true);
    });
  });

  describe("getAuthUrl", () => {
    it("should construct the correct OAuth URL", () => {
      const redirectUri = "https://example.com/callback";
      const state = "test-state";
      const url = provider.getAuthUrl({ redirectUri, state });

      expect(url).toContain("https://oauth.qonto.com/oauth2/auth");
      expect(url).toContain("client_id=test-client-id");
      expect(url).toContain(`redirect_uri=${encodeURIComponent(redirectUri)}`);
      expect(url).toContain(`state=${state}`);
    });

    it("should throw if not configured", () => {
      const unconfiguredProvider = new QontoProvider();
      expect(() =>
        unconfiguredProvider.getAuthUrl({ redirectUri: "x", state: "y" }),
      ).toThrow("QontoProvider is not configured");
    });
  });

  describe("exchangeCode", () => {
    it("should exchange code for tokens", async () => {
      const mockResponse = {
        access_token: "access-123",
        refresh_token: "refresh-123",
        expires_in: 3600,
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        // eslint-disable-next-line @typescript-eslint/require-await
        json: async () => mockResponse,
      } as unknown as Response);

      const credentials = await provider.exchangeCode({
        code: "test-code",
        redirectUri: "https://example.com/callback",
      });

      expect(credentials.accessToken).toBe("access-123");
      expect(credentials.refreshToken).toBe("refresh-123");
      expect(credentials.expiresAt).toBeInstanceOf(Date);
      expect(global.fetch).toHaveBeenCalledWith(
        "https://oauth.qonto.com/oauth2/token",
        expect.objectContaining({
          method: "POST",
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          body: expect.any(URLSearchParams),
        }),
      );
    });

    it("should throw on failure", async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        // eslint-disable-next-line @typescript-eslint/require-await
        text: async () => "Invalid code",
      } as unknown as Response);

      await expect(
        provider.exchangeCode({
          code: "bad-code",
          redirectUri: "x",
        }),
      ).rejects.toThrow("Failed to exchange Qonto code: Invalid code");
    });
  });

  describe("listAccounts", () => {
    it("should return a list of accounts", async () => {
      const mockAccounts = {
        bank_accounts: [
          {
            id: "acc-1",
            name: "Main",
            iban: "IBAN1",
            currency: "EUR",
            bic: "BIC1",
          },
        ],
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        // eslint-disable-next-line @typescript-eslint/require-await
        json: async () => mockAccounts,
      } as unknown as Response);

      const accounts = await provider.listAccounts({
        credentials: { accessToken: "token-123" },
      });

      expect(accounts).toHaveLength(1);

      assert(accounts[0]);
      expect(accounts[0].id).toBe("acc-1");
      expect(global.fetch).toHaveBeenCalledWith(
        "https://thirdparty.qonto.com/v2/bank_accounts",
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          headers: expect.objectContaining({
            Authorization: "Bearer token-123",
          }),
        }),
      );
    });
  });

  describe("verifyAndParseWebhook", () => {
    const secret = "webhook-secret";
    const payload = {
      id: "webhook-1",
      type: "v1/transactions",
      data: {
        id: "tx-1",
        amount: 10.5,
        currency: "EUR",
        status: "completed",
        reference: "GB-ABC12345",
        side: "credit",
        transaction_id: "tx-hash-123",
      },
    };

    it("should valid a correctly signed webhook", async () => {
      const body = JSON.stringify(payload);
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signedPayload = `${timestamp}.${body}`;
      const signature = createHmac("sha256", secret)
        .update(signedPayload)
        .digest("hex");

      const request = new Request("https://webhook.url", {
        method: "POST",
        headers: {
          "x-qonto-signature": `t=${timestamp},v1=${signature}`,
        },
        body,
      });

      const result = await provider.verifyAndParseWebhook({ request, secret });

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.referenceId).toBe("GB-ABC12345");
        expect(result.amountCents).toBe(1050);
        expect(result.txHash).toBe("tx-hash-123");
      }
    });

    it("should fail on invalid signature", async () => {
      const body = JSON.stringify(payload);
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const request = new Request("https://webhook.url", {
        method: "POST",
        headers: {
          "x-qonto-signature": `t=${timestamp},v1=wrong`,
        },
        body,
      });

      const result = await provider.verifyAndParseWebhook({ request, secret });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toContain("Invalid webhook signature");
      }
    });

    it("should fail on old timestamp", async () => {
      const body = JSON.stringify(payload);
      const oldTimestamp = (Math.floor(Date.now() / 1000) - 600).toString(); // 10 mins ago

      const request = new Request("https://webhook.url", {
        method: "POST",
        headers: {
          "x-qonto-signature": `t=${oldTimestamp},v1=some-sig`,
        },
        body,
      });

      const result = await provider.verifyAndParseWebhook({ request, secret });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toContain("Webhook timestamp too old");
      }
    });
  });

  describe("extractReferenceId", () => {
    it("should extract valid reference IDs", () => {
      // @ts-expect-error - testing private method
      expect(provider.extractReferenceId("Payment for GB-ABC12345")).toBe(
        "GB-ABC12345",
      );
      // @ts-expect-error - testing private method
      expect(provider.extractReferenceId("gb-abc12345 lowercase")).toBe(
        "GB-ABC12345",
      );
      // @ts-expect-error - testing private method
      expect(provider.extractReferenceId("No reference here")).toBeNull();
    });
  });
});
