/* eslint-disable @typescript-eslint/require-await */
import { createSign, generateKeyPairSync } from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthenticatedProvider, ConfiguredProvider } from "../../types";
import { WebhookVerificationStatus } from "../../types";
import { WiseProvider } from "./adapter";

// Mock fetch globally
global.fetch = vi.fn();

// Generate a real RSA key pair for RSA-SHA256 signature tests
const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

const PUBLIC_KEY_PEM = publicKey;
const PRIVATE_KEY = privateKey;

function signBody(body: string): string {
  const sign = createSign("RSA-SHA256");
  sign.update(body);
  return sign.sign(PRIVATE_KEY, "base64");
}

describe("WiseProvider", () => {
  const providerConfig = {
    apiToken: "test-wise-api-token",
    profileId: "12345678",
    sandboxMode: false,
  };

  const sandboxProviderConfig = {
    ...providerConfig,
    sandboxMode: true,
  };

  const credentials = {
    apiToken: "test-wise-api-token",
    profileId: "12345678",
  };

  const template = new WiseProvider();
  let configuredProvider: ConfiguredProvider;
  let authenticatedProvider: AuthenticatedProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the static public key cache between tests
    // @ts-expect-error - accessing private static
    WiseProvider._cachedPublicKeyBySandbox.clear();

    configuredProvider = template.withProviderConfig(providerConfig);
    authenticatedProvider = template.withCredentials(
      providerConfig,
      credentials,
    );
  });

  // -------------------------------------------------------------------------
  // Metadata
  // -------------------------------------------------------------------------

  describe("metadata", () => {
    it("should have the correct provider ID and display name", () => {
      expect(template.id).toBe("wise");
      expect(template.displayName).toBe("Wise");
      expect(template.domain).toBe("wise.com");
    });

    it("should report api_key auth type and no oauth flow", () => {
      expect(template.authType).toBe("api_key");
      expect(template.oauthFlowType).toBe("none");
    });

    it("should return the wise-profile-selector custom component ID", () => {
      expect(template.getCustomConfigComponentId()).toBe(
        "wise-profile-selector",
      );
    });

    it("should require api token and sandbox before the custom profile step", () => {
      expect(template.getFieldNamesBeforeCustomStep()).toEqual([
        "apiToken",
        "sandboxMode",
      ]);
    });

    it("should not be a test provider", () => {
      expect(template.isTestProvider).toBe(false);
    });

    it("should not support token refresh", () => {
      expect(template.supportsTokenRefresh()).toBe(false);
    });

    it("should support sandbox simulation in sandbox mode", () => {
      const sandbox = template.withCredentials(
        sandboxProviderConfig,
        credentials,
      );
      expect(sandbox.supportsSandboxSimulation()).toBe(true);
    });

    it("should not support sandbox simulation in production mode", () => {
      expect(authenticatedProvider.supportsSandboxSimulation()).toBe(false);
    });

    it("should return a setup guide URL", () => {
      expect(template.getSetupGuide()).toContain("wise.md");
    });
  });

  // -------------------------------------------------------------------------
  // Config schema
  // -------------------------------------------------------------------------

  describe("getProviderConfigSchema", () => {
    it("should include apiToken and sandboxMode fields", () => {
      const schema = template.getProviderConfigSchema();
      expect(schema.fields.some((f) => f.name === "apiToken")).toBe(true);
      expect(schema.fields.some((f) => f.name === "sandboxMode")).toBe(true);
    });

    it("should mark apiToken as required and secret", () => {
      const schema = template.getProviderConfigSchema();
      const tokenField = schema.fields.find((f) => f.name === "apiToken");
      expect(tokenField?.required).toBe(true);
      expect(tokenField?.secret).toBe(true);
    });

    it("should hide profileId from generic forms (injected by profile selector)", () => {
      const schema = template.getProviderConfigSchema();
      const profileField = schema.fields.find((f) => f.name === "profileId");
      expect(profileField?.hidden).toBe(true);
    });
  });

  describe("getCredentialsFromSavedConfig", () => {
    it("should return apiToken + profileId for persistence (no OAuth exchange)", () => {
      expect(
        template.getCredentialsFromSavedConfig({
          apiToken: "  tok  ",
          profileId: "  99 ",
          sandboxMode: true,
        }),
      ).toEqual({ apiToken: "tok", profileId: "99" });
    });

    it("should return null when token or profile id missing", () => {
      expect(
        template.getCredentialsFromSavedConfig({
          apiToken: "",
          profileId: "1",
          sandboxMode: false,
        }),
      ).toBeNull();
      expect(
        template.getCredentialsFromSavedConfig({
          apiToken: "x",
          profileId: "",
          sandboxMode: false,
        }),
      ).toBeNull();
    });
  });

  describe("preSaveConfigHook", () => {
    it("should no-op when credentials are null", async () => {
      await expect(
        template.preSaveConfigHook({
          config: { apiToken: "tok", sandboxMode: false },
          credentials: null,
        }),
      ).resolves.toBeUndefined();
    });

    it("should verify profile belongs to token when credentials are present", async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => [
          { id: 12345678, type: "business", details: { name: "Acme" } },
        ],
      } as unknown as Response);

      await expect(
        template.preSaveConfigHook({
          config: { apiToken: "test-token", sandboxMode: false },
          credentials: { apiToken: "test-token", profileId: "12345678" },
        }),
      ).resolves.toBeUndefined();
    });

    it("should reject invalid profile ids", async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => [
          { id: 111, type: "personal", details: { firstName: "Jane" } },
        ],
      } as unknown as Response);

      await expect(
        template.preSaveConfigHook({
          config: { apiToken: "test-token", sandboxMode: false },
          credentials: { apiToken: "test-token", profileId: "999" },
        }),
      ).rejects.toThrow(
        "Selected profile is not accessible with the provided API token",
      );
    });
  });

  // -------------------------------------------------------------------------
  // Default config & credential schema
  // -------------------------------------------------------------------------

  describe("getDefaultConfig", () => {
    it("should return empty strings in production mode", () => {
      const cfg = template.getDefaultConfig(false);
      expect(cfg.apiToken).toBe("");
      expect(cfg.sandboxMode).toBe(false);
    });

    it("should return sandboxMode=true when requested", () => {
      const cfg = template.getDefaultConfig(true);
      expect(cfg.sandboxMode).toBe(true);
    });
  });

  describe("getCredentialSchema", () => {
    it("should return a defined Zod schema", () => {
      const schema = template.getCredentialSchema();
      expect(schema).toBeDefined();
      // Validate that the schema accepts valid credentials
      const result = schema.safeParse({
        apiToken: "tok_abc",
        profileId: "12345",
      });
      expect(result.success).toBe(true);
    });

    it("should reject credentials missing profileId", () => {
      const schema = template.getCredentialSchema();
      const result = schema.safeParse({ apiToken: "tok" });
      expect(result.success).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // URL / Auth
  // -------------------------------------------------------------------------

  describe("base URL", () => {
    it("should use production URL by default", () => {
      const p = template.withProviderConfig(providerConfig) as WiseProvider;
      // @ts-expect-error - testing private getter
      expect(p.baseUrl).toBe("https://api.wise.com");
    });

    it("should use sandbox URL in sandbox mode", () => {
      const p = template.withProviderConfig(
        sandboxProviderConfig,
      ) as WiseProvider;
      // @ts-expect-error - testing private getter
      expect(p.baseUrl).toBe("https://api.wise-sandbox.com");
    });
  });

  describe("getAuthUrl", () => {
    it("should throw — Wise uses API key auth", () => {
      expect(() =>
        configuredProvider.getAuthUrl({
          redirectUri: "https://example.com/callback",
          state: "test-state",
        }),
      ).toThrow("does not use OAuth2");
    });
  });

  describe("exchangeCode", () => {
    it("should throw — Wise uses API key auth", async () => {
      await expect(
        configuredProvider.exchangeCode({ code: "test-code" }),
      ).rejects.toThrow("does not use authorization code");
    });
  });

  describe("refreshToken", () => {
    it("should throw — Wise tokens do not expire", async () => {
      await expect(
        configuredProvider.refreshToken({ refreshToken: "token" }),
      ).rejects.toThrow("do not expire");
    });
  });

  // -------------------------------------------------------------------------
  // listAccounts
  // -------------------------------------------------------------------------

  describe("listAccounts", () => {
    it("should map Wise balances with IBAN to BankProviderBankAccount[]", async () => {
      const mockBalances = [
        {
          id: 111,
          currency: "EUR",
          type: "STANDARD",
          amount: { value: 500, currency: "EUR" },
          bankDetails: {
            iban: "DE89370400440532013000",
            bic: "COBADEFFXXX",
            accountHolderName: "Acme GmbH",
            bankName: "Commerzbank",
          },
        },
        {
          id: 222,
          currency: "USD",
          type: "STANDARD",
          amount: { value: 100, currency: "USD" },
          bankDetails: null,
        },
      ];

      const mockAccountDetails = [
        {
          currency: { code: "USD", name: "US Dollar" },
          receiveOptions: [
            {
              type: "LOCAL",
              details: [
                { type: "IBAN", body: "GB33 BUKB 2020 1555 5555 55" },
                { type: "SWIFT_CODE", body: "BUKBGB22" },
                { type: "ACCOUNT_HOLDER", body: "USD Holder" },
              ],
            },
          ],
        },
      ];

      vi.mocked(global.fetch).mockImplementation(async (input: unknown) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.toString()
              : input &&
                  typeof input === "object" &&
                  "url" in input &&
                  typeof (input as { url: string }).url === "string"
                ? (input as { url: string }).url
                : "";
        if (url.includes("/balances")) {
          return {
            ok: true,
            json: async () => mockBalances,
          } as Response;
        }
        if (url.includes("/account-details")) {
          return {
            ok: true,
            json: async () => mockAccountDetails,
          } as Response;
        }
        throw new Error(`unexpected fetch: ${url}`);
      });

      const accounts = await authenticatedProvider.listAccounts();

      expect(accounts).toHaveLength(2);
      expect(accounts[0]?.id).toBe("111");
      expect(accounts[0]?.iban).toBe("DE89370400440532013000");
      expect(accounts[0]?.bic).toBe("COBADEFFXXX");
      expect(accounts[0]?.currency).toBe("EUR");
      expect(accounts[0]?.name).toBe("Acme GmbH");

      expect(accounts[1]?.id).toBe("222");
      expect(accounts[1]?.iban).toBe("GB33BUKB20201555555555");
      expect(accounts[1]?.bic).toBe("BUKBGB22");
      expect(accounts[1]?.name).toBe("USD Holder");

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(
          `/v4/profiles/${providerConfig.profileId}/balances`,
        ),
        expect.anything(),
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(
          `/v1/profiles/${providerConfig.profileId}/account-details`,
        ),
        expect.anything(),
      );
    });

    it("should omit balances without a valid IBAN", async () => {
      const mockBalances = [
        {
          id: 999,
          currency: "CHF",
          type: "STANDARD",
          bankDetails: null,
        },
      ];

      vi.mocked(global.fetch).mockImplementation(async (input: unknown) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.toString()
              : input &&
                  typeof input === "object" &&
                  "url" in input &&
                  typeof (input as { url: string }).url === "string"
                ? (input as { url: string }).url
                : "";
        if (url.includes("/balances")) {
          return { ok: true, json: async () => mockBalances } as Response;
        }
        if (url.includes("/account-details")) {
          return { ok: true, json: async () => [] } as Response;
        }
        throw new Error(`unexpected fetch: ${url}`);
      });

      const accounts = await authenticatedProvider.listAccounts();
      expect(accounts).toHaveLength(0);
    });

    it("should throw on API error", async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        text: async () => "Unauthorized",
      } as unknown as Response);

      await expect(authenticatedProvider.listAccounts()).rejects.toThrow(
        "Failed to list Wise balances",
      );
    });
  });

  // -------------------------------------------------------------------------
  // createWebhook
  // -------------------------------------------------------------------------

  describe("createWebhook", () => {
    it("should call the correct endpoint and return the subscription ID", async () => {
      const mockResponse = {
        id: "sub-abc-123",
        name: "GetBlitz Payment Notifications",
        trigger_on: "balances#credit",
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as unknown as Response);

      const result = await authenticatedProvider.createWebhook({
        webhookUrl: "https://example.com/webhook",
      });

      expect(result.id).toBe("sub-abc-123");
      // Wise uses RSA public key — no per-merchant secret
      expect(result.secret).toBe("");

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/v1/webhook-subscriptions"),
        expect.objectContaining({
          method: "POST",
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          body: expect.stringContaining("balances#credit"),
        }),
      );
    });

    it("should throw on API error", async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        text: async () => "Forbidden",
      } as unknown as Response);

      await expect(
        authenticatedProvider.createWebhook({
          webhookUrl: "https://example.com/webhook",
        }),
      ).rejects.toThrow("Failed to create Wise webhook");
    });
  });

  // -------------------------------------------------------------------------
  // validateAccount
  // -------------------------------------------------------------------------

  describe("validateAccount", () => {
    it("should return true when accountId is present", async () => {
      const result = await authenticatedProvider.validateAccount({
        account: { accountId: "111" },
      });
      expect(result).toBe(true);
    });

    it("should return false when accountId is missing", async () => {
      const result = await authenticatedProvider.validateAccount({
        account: {},
      });
      expect(result).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // verifyAndParseWebhook
  // -------------------------------------------------------------------------

  describe("verifyAndParseWebhook", () => {
    const reference = "GB-TESTREF1";

    const creditPayload = {
      subscription_id: "sub-123",
      profile_id: 12345678,
      event_type: "balances#credit",
      schema_version: "2.0.0",
      data: {
        resource: { id: 1, profile_id: 12345678, type: "balance" },
        amount: 42.5,
        currency: "EUR",
        transaction_type: "CREDIT",
        post_transaction_balance_amount: 542.5,
        occurrence_id: "occ-xyz",
        reference,
      },
    };

    function makeRequest(body: string, signature: string): Request {
      return new Request("https://webhook.example.com", {
        method: "POST",
        headers: {
          "x-wise-signature": signature,
          "content-type": "application/json",
        },
        body,
      });
    }

    it("should successfully verify a valid balances#credit webhook", async () => {
      const body = JSON.stringify(creditPayload);
      const sig = signBody(body);

      // Mock public key fetch
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => PUBLIC_KEY_PEM,
      } as unknown as Response);

      const result = await configuredProvider.verifyAndParseWebhook({
        request: makeRequest(body, sig),
      });

      expect(result.status).toBe(WebhookVerificationStatus.Success);
      if (result.status === WebhookVerificationStatus.Success) {
        expect(result.referenceId).toBe(reference);
        expect(result.amountCents).toBe(4250);
        expect(result.currency).toBe("EUR");
        expect(result.txHash).toBe("occ-xyz");
      }
    });

    it("should return Error when x-wise-signature header is missing", async () => {
      const body = JSON.stringify(creditPayload);
      const request = new Request("https://webhook.example.com", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
      });

      const result = await configuredProvider.verifyAndParseWebhook({
        request,
      });
      expect(result.status).toBe(WebhookVerificationStatus.Error);
      if (result.status === WebhookVerificationStatus.Error) {
        expect(result.error).toContain("x-wise-signature");
      }
    });

    it("should return Error for an invalid RSA signature", async () => {
      const body = JSON.stringify(creditPayload);

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => PUBLIC_KEY_PEM,
      } as unknown as Response);

      const result = await configuredProvider.verifyAndParseWebhook({
        request: makeRequest(body, "bm90YXJlYWxzaWduYXR1cmU="), // not a real sig
      });
      expect(result.status).toBe(WebhookVerificationStatus.Error);
      if (result.status === WebhookVerificationStatus.Error) {
        expect(result.error).toContain("signature");
      }
    });

    it("should return Ignore for non-credit event types", async () => {
      const debitPayload = { ...creditPayload, event_type: "balances#debit" };
      const body = JSON.stringify(debitPayload);
      const sig = signBody(body);

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => PUBLIC_KEY_PEM,
      } as unknown as Response);

      const result = await configuredProvider.verifyAndParseWebhook({
        request: makeRequest(body, sig),
      });
      expect(result.status).toBe(WebhookVerificationStatus.Ignore);
    });

    it("should return Ignore when no reference ID is found", async () => {
      const noRefPayload = {
        ...creditPayload,
        data: {
          ...creditPayload.data,
          reference: undefined,
          occurrence_id: undefined,
        },
      };
      const body = JSON.stringify(noRefPayload);
      const sig = signBody(body);

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          text: async () => PUBLIC_KEY_PEM,
        } as unknown as Response)
        // Fallback activities API call — returns no matching reference
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ activities: [] }),
        } as unknown as Response);

      const result = await authenticatedProvider.verifyAndParseWebhook({
        request: makeRequest(body, sig),
      });
      expect(result.status).toBe(WebhookVerificationStatus.Ignore);
    });
  });

  // -------------------------------------------------------------------------
  // simulateSandboxPayment
  // -------------------------------------------------------------------------

  describe("simulateSandboxPayment", () => {
    it("should call the topup simulation endpoint in sandbox mode", async () => {
      const sandboxAuth = template.withCredentials(
        sandboxProviderConfig,
        credentials,
      );

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      } as unknown as Response);

      const result = await sandboxAuth.simulateSandboxPayment({
        accountId: "111",
        amount: 25.0,
        currency: "EUR",
        reference: "GB-SIM00001",
      });

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/v1/simulation/balance/topup"),
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("should fail when not in sandbox mode", async () => {
      const result = await authenticatedProvider.simulateSandboxPayment({
        accountId: "111",
        amount: 25.0,
        currency: "EUR",
        reference: "GB-SIM00001",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("sandbox mode");
    });
  });

  // -------------------------------------------------------------------------
  // listProfiles
  // -------------------------------------------------------------------------

  describe("listProfiles", () => {
    it("should return mapped profiles from the Wise API", async () => {
      const mockProfiles = [
        {
          id: 1001,
          type: "personal",
          details: { firstName: "Jane", lastName: "Doe" },
        },
        {
          id: 2002,
          type: "business",
          details: { name: "Acme Corp" },
        },
      ];

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockProfiles,
      } as unknown as Response);

      const profiles = await (configuredProvider as WiseProvider).listProfiles({
        apiToken: "test-token",
        sandboxMode: false,
      });

      expect(profiles).toHaveLength(2);
      expect(profiles[0]?.id).toBe(1001);
      expect(profiles[0]?.type).toBe("personal");
      expect(profiles[0]?.fullName).toBe("Jane Doe");
      expect(profiles[1]?.fullName).toBe("Acme Corp");
    });

    it("should accept uppercase type and missing details (Wise response quirks)", async () => {
      const mockProfiles = [
        { id: "3", type: "BUSINESS" },
        { id: 4, type: "personal", details: undefined },
      ];

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockProfiles,
      } as unknown as Response);

      const profiles = await (configuredProvider as WiseProvider).listProfiles({
        apiToken: "test-token",
        sandboxMode: false,
      });

      expect(profiles).toHaveLength(2);
      expect(profiles[0]?.id).toBe(3);
      expect(profiles[0]?.type).toBe("business");
      expect(profiles[1]?.type).toBe("personal");
      expect(profiles[1]?.fullName).toBe("Profile 4");
    });

    it("should throw on API error", async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        text: async () => "Unauthorized",
      } as unknown as Response);

      await expect(
        (configuredProvider as WiseProvider).listProfiles({
          apiToken: "bad-token",
          sandboxMode: false,
        }),
      ).rejects.toThrow("Failed to list Wise profiles");
    });
  });

  describe("assertProfileBelongsToToken", () => {
    it("should pass when profile id is returned for the token", async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => [
          { id: 12345678, type: "business", details: { name: "Acme" } },
        ],
      } as unknown as Response);

      await expect(
        (configuredProvider as WiseProvider).assertProfileBelongsToToken({
          apiToken: "test-token",
          profileId: "12345678",
          sandboxMode: false,
        }),
      ).resolves.toBeUndefined();
    });

    it("should reject profile ids not accessible with the token", async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => [
          { id: 111, type: "personal", details: { firstName: "Jane" } },
        ],
      } as unknown as Response);

      await expect(
        (configuredProvider as WiseProvider).assertProfileBelongsToToken({
          apiToken: "test-token",
          profileId: "99999",
          sandboxMode: false,
        }),
      ).rejects.toThrow("not accessible with the provided API token");
    });
  });
});
