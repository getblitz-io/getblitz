import { createHmac } from "crypto";
import { assert, beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthenticatedProvider, ConfiguredProvider } from "../../types";
import type { QontoBankCredentials } from "./types";
import { WebhookVerificationStatus } from "../../types";
import { QontoProvider } from "./adapter";

// Mock fetch globally
global.fetch = vi.fn();

describe("QontoProvider", () => {
  const providerConfig = {
    clientId: "test-client-id",
    clientSecret: "test-client-secret",
    sandboxMode: false,
  };

  const sandboxProviderConfig = {
    ...providerConfig,
    sandboxMode: true,
    sandboxToken: "test-sandbox-token",
  };

  const credentials = {
    accessToken: "token-123",
    refreshToken: "refresh-123",
    expiresAt: new Date(Date.now() + 3600 * 1000),
  };

  const template = new QontoProvider();
  let configuredProvider: ConfiguredProvider;
  let authenticatedProvider: AuthenticatedProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    configuredProvider = template.withProviderConfig(providerConfig);
    authenticatedProvider = template.withCredentials(
      providerConfig,
      credentials,
    );
  });

  describe("initialization", () => {
    it("should use production URLs by default", () => {
      const p = template.withProviderConfig(providerConfig);
      // Access via getAuthUrl to verify URL is computed correctly
      const authUrl = p.getAuthUrl({
        redirectUri: "https://example.com/callback",
        state: "test",
      });
      expect(authUrl).toContain("https://oauth.qonto.com");
    });

    it("should use sandbox URLs when sandboxMode is true", () => {
      const p = template.withProviderConfig(sandboxProviderConfig);
      // Access via getAuthUrl to verify URL is computed correctly
      const authUrl = p.getAuthUrl({
        redirectUri: "https://example.com/callback",
        state: "test",
      });
      expect(authUrl).toContain("https://oauth-sandbox.staging.qonto.co");
    });
  });

  describe("getProviderConfigSchema", () => {
    it("should return the correct configuration schema", () => {
      const schema = template.getProviderConfigSchema();
      expect(schema.fields).toBeDefined();
      expect(schema.fields.some((f) => f.name === "clientId")).toBe(true);
      expect(schema.fields.some((f) => f.name === "clientSecret")).toBe(true);
    });
  });

  describe("getAuthUrl", () => {
    it("should construct the correct OAuth URL", () => {
      const redirectUri = "https://example.com/callback";
      const state = "test-state";
      const url = configuredProvider.getAuthUrl({ redirectUri, state });

      expect(url).toContain("https://oauth.qonto.com/oauth2/auth");
      expect(url).toContain("client_id=test-client-id");
      expect(url).toContain(`redirect_uri=${encodeURIComponent(redirectUri)}`);
      expect(url).toContain(`state=${state}`);
    });

    it("should throw if not configured", () => {
      expect(() =>
        template.getAuthUrl({ redirectUri: "x", state: "y" }),
      ).toThrow("QontoProvider is not properly configured");
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

      const creds = (await configuredProvider.exchangeCode({
        code: "test-code",
        redirectUri: "https://example.com/callback",
      })) as QontoBankCredentials;

      expect(creds.accessToken).toBe("access-123");
      expect(creds.refreshToken).toBe("refresh-123");
      expect(creds.expiresAt).toBeInstanceOf(Date);
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
        configuredProvider.exchangeCode({
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
            main: true,
            authorized_balance_cents: 1000,
            current_balance_cents: 2000,
            is_external_account: true,
            status: "active",
          },
        ],
      };

      const mockOrganization = {
        organization: {
          id: "org-1",
          name: "Org 1",
          legal_name: "Org 1 Legal",
          slug: "org-1-slug",
          status: "active",
          created_at: "2022-01-01T00:00:00Z",
          updated_at: "2022-01-01T00:00:00Z",
          bank_accounts: [],
        },
      };

      vi.mocked(global.fetch).mockImplementation(async (req) => {
        if (req === "https://thirdparty.qonto.com/v2/organization") {
          return {
            ok: true,
            // eslint-disable-next-line @typescript-eslint/require-await
            json: async () => mockOrganization,
          } as unknown as Promise<Response>;
        } else if (req === "https://thirdparty.qonto.com/v2/bank_accounts") {
          return {
            ok: true,
            // eslint-disable-next-line @typescript-eslint/require-await
            json: async () => mockAccounts,
          } as unknown as Promise<Response>;
        }
        return {
          ok: false,
          // eslint-disable-next-line @typescript-eslint/require-await
          text: async () => "Not found",
        } as unknown as Response;
      });

      const accounts = await authenticatedProvider.listAccounts();

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

      const result = await configuredProvider.verifyAndParseWebhook({
        request,
        secret,
      });

      expect(result.status).toBe(WebhookVerificationStatus.Success);
      if (result.status === WebhookVerificationStatus.Success) {
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

      const result = await configuredProvider.verifyAndParseWebhook({
        request,
        secret,
      });
      expect(result.status).toBe(WebhookVerificationStatus.Error);
      if (result.status === WebhookVerificationStatus.Error) {
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

      const result = await configuredProvider.verifyAndParseWebhook({
        request,
        secret,
      });
      expect(result.status).toBe(WebhookVerificationStatus.Error);
      if (result.status === WebhookVerificationStatus.Error) {
        expect(result.error).toContain("Webhook timestamp too old");
      }
    });

    it("should ignore invalid transaction reference", async () => {
      const invalidReferences = [
        "not a valid reference",
        "",
        "GB-123456",
        "GB1234567",
      ];

      for (const reference of invalidReferences) {
        const mewData = { ...payload, data: { ...payload.data, reference } };
        const body = JSON.stringify(mewData);
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

        const result = await configuredProvider.verifyAndParseWebhook({
          request,
          secret,
        });
        expect(result.status).toBe(WebhookVerificationStatus.Ignore);
        if (result.status === WebhookVerificationStatus.Ignore) {
          expect(result.reason).toContain(
            "No valid reference ID in Qonto transaction",
          );
        }
      }
    });
  });
});
