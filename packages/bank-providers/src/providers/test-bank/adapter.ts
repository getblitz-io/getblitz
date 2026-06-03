import { randomBytes } from "crypto";
import { z } from "zod";

import type {
  AccountConfig,
  BankCredentials,
  BankProviderBankAccount,
  BaseBankCredentials,
  ProviderConfig,
  ProviderConfigSchema,
  WebhookVerificationResult,
} from "../../types";
import { BaseBankProvider } from "../../base-provider";
import { WebhookVerificationStatus } from "../../types";

// Matches Qonto's webhook payload schema for compatibility
export const TestBankWebhookPayloadSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.object({
    id: z.string(),
    amount: z.number(),
    currency: z.string(),
    status: z.string(),
    reference: z.string().optional(),
    note: z.string().optional(),
    transaction_id: z.string().optional(),
    bank_account_id: z.string().optional(),
    side: z.enum(["debit", "credit"]),
    operation_type: z.string().optional(),
  }),
});

// Fake test accounts
const FAKE_ACCOUNTS: BankProviderBankAccount[] = [
  {
    id: "test-acc-001",
    name: "Test Business Account",
    iban: "TEST1234567890123456",
    currency: "EUR",
    bic: "TESTBICXXX",
    bankIdentifierName: "Test Bank",
  },
  {
    id: "test-acc-002",
    name: "Test Savings Account",
    iban: "TEST9876543210987654",
    currency: "EUR",
    bic: "TESTBICXXX",
    bankIdentifierName: "Test Bank",
  },
  {
    id: "test-acc-003",
    name: "Test EUR Account",
    iban: "TEST5555666677778888",
    currency: "EUR",
    bic: "TESTBICXXX",
    bankIdentifierName: "Test Bank",
  },
];

const TestBankProviderConfigSchema = z.object({
  baseUrl: z.string().optional(),
});

/**
 * Test Bank provider configuration
 */
export interface TestBankProviderConfig extends ProviderConfig {
  baseUrl: string;
}

export interface TestBankCredentials extends BaseBankCredentials {
  accessToken: string;
}

export class TestBankProvider extends BaseBankProvider {
  readonly id = "test-bank";
  readonly displayName = "Test Bank";
  readonly domain = "localhost";
  readonly authType = "oauth2" as const;
  readonly oauthFlowType = "redirect" as const;
  override readonly isTestProvider = true;

  // Provider config fields (set by applyProviderConfig)
  private _baseUrl: string | undefined;

  // Credential fields (set by applyCredentials)
  private _accessToken: string | undefined;

  // -------------------------------------------------------------------
  // Phase transition implementation
  // -------------------------------------------------------------------

  protected createInstance(): TestBankProvider {
    return new TestBankProvider();
  }

  protected applyProviderConfig(config: TestBankProviderConfig): void {
    const cfg = TestBankProviderConfigSchema.safeParse(config);
    if (!cfg.success) {
      throw new Error("Invalid Test Bank provider config");
    }
    this._baseUrl = cfg.data.baseUrl;
  }

  protected applyCredentials(credentials: TestBankCredentials): void {
    if (!credentials.accessToken) {
      throw new Error("Test Bank credentials must include accessToken");
    }
    this._accessToken = credentials.accessToken;
  }

  // -------------------------------------------------------------------
  // Config/credential accessors with guards
  // -------------------------------------------------------------------

  get baseUrl(): string {
    if (!this._baseUrl) {
      throw new Error("Test Bank provider config is missing baseUrl");
    }
    return this._baseUrl;
  }

  get accessToken(): string {
    if (!this._accessToken) {
      throw new Error(
        "TestBankProvider is not authenticated — credentials required",
      );
    }
    return this._accessToken;
  }

  getSetupGuide(): string {
    return "https://docs.getblitz.io/banks/test-bank";
  }

  getProviderConfigSchema(): ProviderConfigSchema {
    return {
      fields: [
        {
          name: "baseUrl",
          type: "string",
          label: "Base URL",
          description: "Test Bank server URL",
          required: true,
          defaultValue: "http://localhost:3003",
        },
      ],
    };
  }

  getDefaultConfig(): TestBankProviderConfig {
    return {
      baseUrl: "http://localhost:3003",
    };
  }

  getCredentialSchema() {
    return z.object({
      accessToken: z.string(),
      refreshToken: z.string(),
      expiresAt: z.date(),
    });
  }

  getAccountSchema() {
    return z.object({
      iban: z.string(),
      accountId: z.string(),
    });
  }

  async verifyAndParseWebhook({
    request,
  }: {
    request: Request;
    secret?: string;
  }): Promise<WebhookVerificationResult> {
    // Test bank always accepts webhooks - no signature verification needed
    const payload = await request.json();
    const parsed = TestBankWebhookPayloadSchema.safeParse(payload);

    if (!parsed.success) {
      return {
        status: WebhookVerificationStatus.Error,
        error: `Invalid Test Bank webhook payload: ${parsed.error.message}`,
      };
    }

    const { data } = parsed.data;

    // Extract reference from note or reference field
    const referenceId =
      this.extractReferenceId(data.note) ??
      this.extractReferenceId(data.reference);

    if (!referenceId) {
      return {
        status: WebhookVerificationStatus.Ignore,
        reason: "No valid reference ID in Test Bank transaction",
      };
    }

    return {
      status: WebhookVerificationStatus.Success,
      referenceId,
      txHash: data.transaction_id ?? data.id,
      amountCents: Math.round(data.amount * 100),
      currency: data.currency,
      rawPayload: payload,
    };
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async validateAccount({
    account,
  }: {
    account: AccountConfig;
  }): Promise<boolean> {
    // Test bank always validates accounts
    return !!account.accountId && !!account.iban;
  }

  getAuthUrl({
    redirectUri,
    state,
  }: {
    redirectUri: string;
    state: string;
  }): string {
    const params = new URLSearchParams({
      redirect_uri: redirectUri,
      state,
      response_type: "code",
      client_id: "test-client",
    });
    return `${this.baseUrl}/oauth/authorize?${params.toString()}`;
  }

  async exchangeCode({
    code,
    redirectUri,
  }: {
    code: string;
    redirectUri?: string;
  }): Promise<BankCredentials> {
    // Call the test bank's token endpoint
    const response = await fetch(`${this.baseUrl}/api/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: "test-client",
        client_secret: "test-secret",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange Test Bank code: ${error}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  async listAccounts(): Promise<BankProviderBankAccount[]> {
    // Call the test bank's accounts endpoint
    const response = await fetch(`${this.baseUrl}/api/accounts`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      // Fallback to static accounts if endpoint fails
      return FAKE_ACCOUNTS;
    }

    const data = (await response.json()) as {
      accounts: {
        id: string;
        name: string;
        iban: string;
        currency: string;
        bic: string;
        bankIdentifierName: string;
      }[];
    };

    return data.accounts;
  }

  async createWebhook({
    webhookUrl,
  }: {
    webhookUrl: string;
  }): Promise<{ id: string; secret: string }> {
    // Call the test bank's webhooks endpoint
    const response = await fetch(`${this.baseUrl}/api/webhooks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        callback_url: webhookUrl,
        types: ["v1/transactions"],
      }),
    });

    if (!response.ok) {
      // Fallback to dummy webhook
      return {
        id: `wh_test_${randomBytes(8).toString("hex")}`,
        secret: `test_secret_${randomBytes(16).toString("hex")}`,
      };
    }

    const data = (await response.json()) as { id: string; secret: string };
    return data;
  }

  async refreshToken({
    refreshToken,
  }: {
    refreshToken: string;
    callbackUrl?: string;
  }): Promise<BankCredentials> {
    // Call the test bank's token refresh endpoint
    const response = await fetch(`${this.baseUrl}/api/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: "test-client",
        client_secret: "test-secret",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to refresh Test Bank token: ${error}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  private extractReferenceId(text: string | undefined): string | null {
    if (!text) return null;
    const match = /GB-[A-Z0-9]{8}/i.exec(text);
    return match ? match[0].toUpperCase() : null;
  }
}
