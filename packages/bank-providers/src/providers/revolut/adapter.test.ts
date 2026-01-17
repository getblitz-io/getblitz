import { createHmac } from "crypto";
import { assert, beforeEach, describe, expect, it, vi } from "vitest";

import type { BankCredentials } from "../../types";
import { RevolutProvider } from "./adapter";

// Mock fetch globally
global.fetch = vi.fn();

describe("RevolutProvider", () => {
  // Actually I need a real RSA key for createSign to work.
  // Let me use a shorter one generated properly.
  const realDummyPrivateKey = `-----BEGIN PRIVATE KEY-----
MIIBUwIBADANBgkqhkiG9w0BAQEFAASCAT0wggE5AgEAAkEA1RYK+QSY365JJhLv
5S7McioyzcG1xExt4NSakNLnnZxLyq7lgAUXtLSbnRfMqnQ+HYwjHUX339wy9riU
XvdQbwIDAQABAkEAnw+iRzp4R1iZP/OY4dJqSLpZTCBSZ+LJjrAFZSAaRxpc42wu
PcUKhLIkzDvUCurq0Ubhp4/p1IjfK/D4ApUCcQIhAO/ySuVVne168e024UkHNYcJ
HDyASFTOeaSRqq6Q+DWXAiEA41eyaEe7aIe88tgOpfjket5nSwPcpYUSI13eZg47
BukCHw4PJFRLr/U6PvKnRIwC4CAJaJ4i5hoR/w6lelrAI8sCICInrMAJ9tfvfK2n
VBwPVpQ3EaGthNrBMUZq9dyzSp7xAiAk4SDhlyrJjNGBkJYvBfOOkJB6MztlVYPi
8fMmOzUuBg==
-----END PRIVATE KEY-----`;

  const config = {
    clientId: "test-client-id",
    privateKeyPem: realDummyPrivateKey,
    sandboxMode: false,
  };

  const sandboxConfig = {
    ...config,
    sandboxMode: true,
  };

  let provider: RevolutProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new RevolutProvider(config);
  });

  describe("initialization", () => {
    it("should use production URLs by default", () => {
      const p = new RevolutProvider(config);
      // @ts-expect-error - testing private fields
      expect(p.baseUrl).toBe("https://b2b.revolut.com");
    });

    it("should use sandbox URLs when sandboxMode is true", () => {
      const p = new RevolutProvider(sandboxConfig);
      // @ts-expect-error - testing private fields
      expect(p.baseUrl).toBe("https://sandbox-b2b.revolut.com");
    });
  });

  describe("getProviderConfigSchema", () => {
    it("should return the correct configuration schema", () => {
      const schema = provider.getProviderConfigSchema();
      expect(schema.fields).toBeDefined();
      expect(schema.fields.some((f) => f.name === "clientId")).toBe(true);
      expect(schema.fields.some((f) => f.name === "privateKeyPem")).toBe(true);
    });
  });

  describe("getAuthUrl", () => {
    it("should construct the correct OAuth URL", () => {
      const redirectUri = "https://example.com/callback";
      const state = "test-state";
      const url = provider.getAuthUrl({ redirectUri, state });

      expect(url).toContain("https://b2b.revolut.com/app-confirm");
      expect(url).toContain("client_id=test-client-id");
      expect(url).toContain(`redirect_uri=${encodeURIComponent(redirectUri)}`);
      expect(url).toContain(`state=${state}`);
    });

    it("should throw if not configured", () => {
      const unconfiguredProvider = new RevolutProvider();
      expect(() =>
        unconfiguredProvider.getAuthUrl({ redirectUri: "x", state: "y" }),
      ).toThrow("RevolutProvider is not configured");
    });
  });

  describe("exchangeCode", () => {
    it("should exchange code for tokens", async () => {
      const mockResponse = {
        access_token: "access-123",
        refresh_token: "refresh-123",
        expires_in: 3600,
        token_type: "Bearer",
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
        "https://b2b.revolut.com/api/1.0/auth/token",
        expect.objectContaining({
          method: "POST",
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          body: expect.any(URLSearchParams),
        }),
      );
    });
  });

  describe("listAccounts", () => {
    it("should return a list of accounts with bank details", async () => {
      const mockAccounts = [
        {
          id: "acc-1",
          name: "Main",
          currency: "EUR",
          state: "active",
        },
      ];

      const mockBankDetails = [
        {
          iban: "IBAN123",
          bic: "BIC123",
          beneficiary: "GetBlitz Business",
        },
      ];

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          // eslint-disable-next-line @typescript-eslint/require-await
          json: async () => mockAccounts,
        } as unknown as Response)
        .mockResolvedValueOnce({
          ok: true,
          // eslint-disable-next-line @typescript-eslint/require-await
          json: async () => mockBankDetails,
        } as unknown as Response);

      const accounts = await provider.listAccounts({
        credentials: { accessToken: "token-123" } as unknown as BankCredentials,
      });

      expect(accounts).toHaveLength(1);
      assert(accounts[0]);
      expect(accounts[0].id).toBe("acc-1");
      expect(accounts[0].iban).toBe("IBAN123");
      expect(accounts[0].bic).toBe("BIC123");
    });
  });

  describe("verifyAndParseWebhook", () => {
    const secret = "webhook-secret";
    const transactionId = "revolut-tx-id";
    const reference = "GB-ABC12345";

    const mockTransaction = {
      id: transactionId,
      type: "topup",
      state: "completed",
      legs: [
        {
          amount: 10.5,
          currency: "EUR",
          description: `Payment for ${reference}`,
        },
      ],
    };

    it("should validate a correctly signed TransactionCreated webhook", async () => {
      const payload = {
        event: "TransactionCreated",
        timestamp: new Date().toISOString(),
        data: mockTransaction,
      };

      const body = JSON.stringify(payload);
      const timestamp = Date.now().toString();
      const signedPayload = `v1.${timestamp}.${body}`;
      const signature = createHmac("sha256", secret)
        .update(signedPayload)
        .digest("hex");

      const request = new Request("https://webhook.url", {
        method: "POST",
        headers: {
          "Revolut-Signature": `v1=${signature}`,
          "Revolut-Request-Timestamp": timestamp,
        },
        body,
      });

      const result = await provider.verifyAndParseWebhook({ request, secret });

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.referenceId).toBe(reference);
        expect(result.amountCents).toBe(1050);
        expect(result.txHash).toBe(transactionId);
      }
    });

    it("should handle TransactionStateChanged by fetching full transaction", async () => {
      const payload = {
        event: "TransactionStateChanged",
        timestamp: new Date().toISOString(),
        data: {
          id: transactionId,
          new_state: "completed",
          old_state: "pending",
        },
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        // eslint-disable-next-line @typescript-eslint/require-await
        json: async () => mockTransaction,
      } as unknown as Response);

      const body = JSON.stringify(payload);
      const timestamp = Date.now().toString();
      const signedPayload = `v1.${timestamp}.${body}`;
      const signature = createHmac("sha256", secret)
        .update(signedPayload)
        .digest("hex");

      const request = new Request("https://webhook.url", {
        method: "POST",
        headers: {
          "Revolut-Signature": `v1=${signature}`,
          "Revolut-Request-Timestamp": timestamp,
        },
        body,
      });

      const result = await provider.verifyAndParseWebhook({
        request,
        secret,
        credentials: { accessToken: "token-123" } as unknown as BankCredentials,
      });

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.referenceId).toBe(reference);
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining(`/api/1.0/transaction/${transactionId}`),
          expect.anything(),
        );
      }
    });

    it("should fail on invalid signature", async () => {
      const payload = { event: "TransactionCreated", data: mockTransaction };
      const body = JSON.stringify(payload);
      const timestamp = Date.now().toString();

      const request = new Request("https://webhook.url", {
        method: "POST",
        headers: {
          "Revolut-Signature": "v1=wrong-signature",
          "Revolut-Request-Timestamp": timestamp,
        },
        body,
      });

      const result = await provider.verifyAndParseWebhook({ request, secret });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toContain("Invalid webhook signature");
      }
    });
  });

  describe("refreshToken", () => {
    it("should refresh access token", async () => {
      const mockResponse = {
        access_token: "new-access-123",
        expires_in: 3600,
        token_type: "Bearer",
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        // eslint-disable-next-line @typescript-eslint/require-await
        json: async () => mockResponse,
      } as unknown as Response);

      const credentials = await provider.refreshToken({
        refreshToken: "old-refresh-123",
        callbackUrl: "https://example.com/callback",
      });

      expect(credentials.accessToken).toBe("new-access-123");
      expect(credentials.refreshToken).toBe("old-refresh-123"); // Revolut keeps the same refresh token
      expect(global.fetch).toHaveBeenCalledWith(
        "https://b2b.revolut.com/api/1.0/auth/token",
        expect.objectContaining({
          method: "POST",
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          body: expect.any(URLSearchParams),
        }),
      );
    });
  });

  describe("simulateSandboxPayment", () => {
    it("should call topup API in sandbox mode", async () => {
      const p = new RevolutProvider(sandboxConfig);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        // eslint-disable-next-line @typescript-eslint/require-await
        json: async () => ({ id: "sim-123" }),
      } as unknown as Response);

      const result = await p.simulateSandboxPayment({
        credentials: { accessToken: "token-123" } as unknown as BankCredentials,
        accountId: "acc-123",
        amount: 50.0,
        currency: "EUR",
        reference: "GB-REF123",
      });

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        "https://sandbox-b2b.revolut.com/api/1.0/sandbox/topup",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            account_id: "acc-123",
            amount: 50.0,
            currency: "EUR",
            reference: "GB-REF123",
            state: "completed",
          }),
        }),
      );
    });

    it("should fail if not in sandbox mode", async () => {
      const result = await provider.simulateSandboxPayment({
        credentials: { accessToken: "token-123" } as unknown as BankCredentials,
        accountId: "acc-123",
        amount: 50.0,
        currency: "EUR",
        reference: "GB-REF123",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        "Sandbox simulation only available in sandbox mode",
      );
    });
  });

  describe("metadata and support", () => {
    it("should return the correct setup guide URL", () => {
      expect(provider.getSetupGuide()).toContain("revolut.md");
    });

    it("should return the correct default config", () => {
      const config = provider.getDefaultConfig(true);
      expect(config.sandboxMode).toBe(true);
      expect(config.clientId).toBe("");
    });

    it("should return schemas", () => {
      expect(provider.getCredentialSchema()).toBeDefined();
      expect(provider.getAccountSchema()).toBeDefined();
    });

    it("should validate account", async () => {
      const valid = await provider.validateAccount({
        credentials: {} as unknown as BankCredentials,
        account: { accountId: "acc-123" },
      });
      expect(valid).toBe(true);

      const invalid = await provider.validateAccount({
        credentials: {} as unknown as BankCredentials,
        account: {},
      });
      expect(invalid).toBe(false);
    });

    it("should report support features", () => {
      expect(provider.supportsTokenRefresh()).toBe(true);

      const prodProvider = new RevolutProvider(config);
      expect(prodProvider.supportsSandboxSimulation()).toBe(false);

      const sbProvider = new RevolutProvider(sandboxConfig);
      expect(sbProvider.supportsSandboxSimulation()).toBe(true);
    });
  });
});
