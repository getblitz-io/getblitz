import { createHmac, randomBytes } from "crypto";
import { z } from "zod";

import type {
  AccountConfig,
  BankCredentials,
  ProviderConfig,
  ProviderConfigSchema,
  WebhookVerificationResult,
} from "../../types";
import { BaseBankProvider } from "../../base-provider";

export const QontoWebhookPayloadSchema = z.object({
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

/**
 * Qonto provider configuration
 */
export interface QontoProviderConfig extends ProviderConfig {
  clientId: string;
  clientSecret: string;
  sandboxMode: boolean;
  sandboxToken?: string;
  oauthBaseUrl: string;
  thirdPartyBaseUrl: string;
}

export class QontoProvider extends BaseBankProvider {
  readonly id = "qonto";
  readonly displayName = "Qonto";
  readonly domain = "qonto.com";
  readonly authType = "oauth2" as const;
  readonly oauthFlowType = "redirect" as const;

  private clientId: string;
  private clientSecret: string;
  private sandboxMode: boolean;
  private sandboxToken?: string;
  private oauthBaseUrl: string;
  private thirdPartyBaseUrl: string;

  constructor(config?: ProviderConfig) {
    super();
    const cfg = config as QontoProviderConfig | undefined;

    // When no config provided (template instance), use empty values
    // Actual API calls require a configured instance
    this.clientId = cfg?.clientId ?? "";
    this.clientSecret = cfg?.clientSecret ?? "";
    this.sandboxMode = cfg?.sandboxMode ?? false;
    this.sandboxToken = cfg?.sandboxToken;
    this.oauthBaseUrl =
      cfg?.oauthBaseUrl ??
      (this.sandboxMode
        ? "https://oauth-sandbox.staging.qonto.co"
        : "https://oauth.qonto.com");
    this.thirdPartyBaseUrl =
      cfg?.thirdPartyBaseUrl ??
      (this.sandboxMode
        ? "https://thirdparty-sandbox.staging.qonto.co"
        : "https://thirdparty.qonto.com");
  }

  getSetupGuide(): string {
    return "https://github.com/getblitz-io/getblitz/blob/main/docs/banks/qonto.md";
  }

  getProviderConfigSchema(): ProviderConfigSchema {
    return {
      fields: [
        {
          name: "clientId",
          type: "string",
          label: "Client ID",
          description: "OAuth2 Client ID from Qonto developer portal",
          required: true,
          secret: false,
        },
        {
          name: "clientSecret",
          type: "string",
          label: "Client Secret",
          description: "OAuth2 Client Secret from Qonto developer portal",
          required: true,
          secret: true,
        },
        {
          name: "sandboxMode",
          type: "boolean",
          label: "Sandbox Mode",
          description: "Enable sandbox/staging environment for testing",
          required: false,
          defaultValue: false,
        },
        {
          name: "sandboxToken",
          type: "string",
          label: "Sandbox Token",
          description: "X-Qonto-Staging-Token for sandbox API access",
          required: false,
          secret: true,
          dependsOn: { field: "sandboxMode", value: true },
        },
        {
          name: "oauthBaseUrl",
          type: "string",
          label: "OAuth Base URL",
          description: "Qonto OAuth2 endpoint URL",
          required: true,
          secret: false,
        },
        {
          name: "thirdPartyBaseUrl",
          type: "string",
          label: "API Base URL",
          description: "Qonto Third-Party API endpoint URL",
          required: true,
          secret: false,
        },
      ],
    };
  }

  getDefaultConfig(sandboxMode = false): QontoProviderConfig {
    return {
      clientId: "",
      clientSecret: "",
      sandboxMode,
      sandboxToken: "",
      oauthBaseUrl: sandboxMode
        ? "https://oauth-sandbox.staging.qonto.co"
        : "https://oauth.qonto.com",
      thirdPartyBaseUrl: sandboxMode
        ? "https://thirdparty-sandbox.staging.qonto.co"
        : "https://thirdparty.qonto.com",
    };
  }

  private ensureConfigured(): void {
    if (!this.clientId || !this.clientSecret) {
      throw new Error(
        "QontoProvider is not configured. Create a configured instance using ProviderRegistry.createProvider()",
      );
    }
  }

  getCredentialSchema() {
    return z.object({
      accessToken: z.string(),
      refreshToken: z.string(),
      expiresAt: z.date(),
      organizationId: z.string().optional(),
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
    secret,
  }: {
    request: Request;
    secret?: string;
  }): Promise<WebhookVerificationResult> {
    const rawBody = await request.text();

    // Verify signature if secret is provided
    if (secret) {
      const signatureHeader = request.headers.get("x-qonto-signature");
      if (!signatureHeader) {
        return { valid: false, error: "Missing x-qonto-signature header" };
      }

      // Parse t={timestamp},v1={signature} format
      const parts = Object.fromEntries(
        signatureHeader.split(",").map((part) => {
          const [key, ...rest] = part.split("=");
          return [key, rest.join("=")];
        }),
      ) as Record<string, string>;

      const timestamp = parts.t;
      const signature = parts.v1;

      if (!timestamp || !signature) {
        return { valid: false, error: "Invalid signature header format" };
      }

      // Verify timestamp is within 5 minutes
      const timestampAge =
        Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
      if (timestampAge > 300) {
        return { valid: false, error: "Webhook timestamp too old" };
      }

      // Recreate signed payload: {timestamp}.{raw_request_body}
      const signedPayload = `${timestamp}.${rawBody}`;
      const expectedSignature = createHmac("sha256", secret)
        .update(signedPayload)
        .digest("hex");

      if (signature !== expectedSignature) {
        return { valid: false, error: "Invalid webhook signature" };
      }
    }

    // Parse payload
    const payload = JSON.parse(rawBody) as unknown;
    const parsed = QontoWebhookPayloadSchema.safeParse(payload);

    if (!parsed.success) {
      return {
        valid: false,
        error: `Invalid Qonto webhook payload: ${parsed.error.message}`,
      };
    }

    const { data } = parsed.data;

    // Extract reference from note or reference field
    const referenceId =
      this.extractReferenceId(data.note) ??
      this.extractReferenceId(data.reference);

    if (!referenceId) {
      return {
        valid: false,
        error: "No valid reference ID in Qonto transaction",
      };
    }

    return {
      valid: true,
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
    credentials: BankCredentials;
    account: AccountConfig;
  }): Promise<boolean> {
    // We would verify the account exists in Qonto
    return !!account.accountId && !!account.iban;
  }

  getAuthUrl({
    redirectUri,
    state,
  }: {
    redirectUri: string;
    state: string;
  }): string {
    this.ensureConfigured();

    const scopes = ["organization.read", "webhook"].join(" ");
    return `${this.oauthBaseUrl}/oauth2/auth?response_type=code&client_id=${this.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${state}`;
  }

  async exchangeCode({
    code,
    redirectUri,
  }: {
    code: string;
    redirectUri?: string;
  }): Promise<BankCredentials> {
    this.ensureConfigured();
    if (!redirectUri) {
      throw new Error("redirectUri is required for Qonto authentication");
    }

    const response = await fetch(`${this.oauthBaseUrl}/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        ...this.getTestingHeader(),
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange Qonto code: ${error}`);
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

  async listAccounts({
    credentials,
  }: {
    credentials: BankCredentials;
  }): Promise<
    { id: string; name: string; iban: string; currency: string; bic: string }[]
  > {
    this.ensureConfigured();
    const response = await fetch(`${this.thirdPartyBaseUrl}/v2/bank_accounts`, {
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        ...this.getTestingHeader(),
        ...this.getSignatureHeader(),
      },
    });

    if (!response.ok) {
      const error = await response.text();
      // Try fallback to just /v2/bank_accounts if org specific fails?
      // But let's assume this path for now or maybe just "https://thirdparty.qonto.com/v2/bank_accounts"
      // The docs for "List bank accounts" usually is "GET /v2/bank_accounts"
      throw new Error(`Failed to list Qonto accounts: ${error}`);
    }

    const data = (await response.json()) as {
      bank_accounts: {
        id: string;
        name: string;
        iban: string;
        currency: string;
        bic: string;
      }[];
    };

    return data.bank_accounts.map((acc) => ({
      id: acc.id,
      name: acc.name,
      iban: acc.iban,
      currency: acc.currency,
      bic: acc.bic,
    }));
  }

  async createWebhook({
    credentials,
    webhookUrl,
  }: {
    credentials: BankCredentials;
    webhookUrl: string;
  }): Promise<{ id: string; secret: string }> {
    this.ensureConfigured();
    const secret = randomBytes(32).toString("hex");
    const body = JSON.stringify({
      callback_url: webhookUrl,
      types: ["v1/transactions"],
      secret,
      description: "GetBlitz Transactions",
    });
    const response = await fetch(
      `${this.thirdPartyBaseUrl}/v2/webhook_subscriptions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          "Content-Type": "application/json",
          ...this.getTestingHeader(),
          ...this.getSignatureHeader(body),
        },
        body,
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create Qonto webhook: ${error}`);
    }

    const data = (await response.json()) as { id: string };
    return { id: data.id, secret };
  }

  async refreshToken({
    refreshToken,
  }: {
    refreshToken: string;
    callbackUrl?: string;
  }): Promise<BankCredentials> {
    this.ensureConfigured();
    const response = await fetch(`${this.oauthBaseUrl}/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        ...this.getTestingHeader(),
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to refresh Qonto token: ${error}`);
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

  private getTestingHeader(): Record<string, string> {
    return this.sandboxMode && this.sandboxToken
      ? { "X-Qonto-Staging-Token": this.sandboxToken }
      : {};
  }

  private getSignatureHeader(body = ""): Record<string, string> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signedPayload = `${timestamp}.${body}`;
    const signature = createHmac("sha256", this.clientSecret)
      .update(signedPayload)
      .digest("hex");

    return {
      "X-Qonto-Signature": `t=${timestamp},v1=${signature}`,
    };
  }
}
