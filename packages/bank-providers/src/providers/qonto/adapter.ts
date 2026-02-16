import { createHmac, randomBytes } from "crypto";
import { z } from "zod";

import type {
  AccountConfig,
  BankProviderBankAccount,
  ProviderConfig,
  ProviderConfigSchema,
  WebhookVerificationResult,
} from "../../types";
import type { QontoBankCredentials, QontoProviderConfig } from "./types";
import { BaseBankProvider } from "../../base-provider";
import { WebhookVerificationStatus } from "../../types";
import {
  QontoBankAccountSchema,
  QontoOrganizationSchema,
  QontoProviderConfigSchema,
  QontoWebhookPayloadSchema,
} from "./types";

export class QontoProvider extends BaseBankProvider {
  readonly id = "qonto";
  readonly displayName = "Qonto";
  readonly domain = "qonto.com";
  readonly authType = "oauth2" as const;
  readonly oauthFlowType = "redirect" as const;

  // Provider config fields (set by applyProviderConfig)
  private _clientId: string | undefined;
  private _clientSecret: string | undefined;
  private _sandboxMode: boolean | undefined;
  private _sandboxToken: string | undefined;

  // Credential fields (set by applyCredentials)
  private _accessToken: string | undefined;

  // -------------------------------------------------------------------
  // Phase transition implementation
  // -------------------------------------------------------------------

  protected createInstance(): QontoProvider {
    return new QontoProvider();
  }

  protected applyProviderConfig(config: ProviderConfig): void {
    const cfg = QontoProviderConfigSchema.safeParse(config);
    if (!cfg.success) {
      throw new Error("Invalid Qonto provider config");
    }
    this._clientId = cfg.data.clientId;
    this._clientSecret = cfg.data.clientSecret;
    this._sandboxMode = cfg.data.sandboxMode;
    this._sandboxToken = cfg.data.sandboxToken;
  }

  protected applyCredentials(credentials: QontoBankCredentials): void {
    if (!credentials.accessToken) {
      throw new Error("Qonto credentials must include accessToken");
    }
    this._accessToken = credentials.accessToken;
  }

  // -------------------------------------------------------------------
  // Config/credential accessors with guards
  // -------------------------------------------------------------------

  private get accessToken(): string {
    if (!this._accessToken) {
      throw new Error(
        "QontoProvider is not authenticated — credentials required",
      );
    }
    return this._accessToken;
  }

  private get clientId(): string {
    if (!this._clientId) {
      throw new Error("QontoProvider is not properly configured");
    }
    return this._clientId;
  }

  private get clientSecret(): string {
    if (!this._clientSecret) {
      throw new Error("QontoProvider is not properly configured");
    }
    return this._clientSecret;
  }

  private get sandboxMode(): boolean {
    return this._sandboxMode ?? false;
  }

  private get sandboxToken(): string {
    if (!this._sandboxToken) {
      throw new Error(
        "QontoProvider is not configured — sandboxToken required",
      );
    }
    return this._sandboxToken;
  }

  private get oauthBaseUrl(): string {
    return this.sandboxMode
      ? "https://oauth-sandbox.staging.qonto.co"
      : "https://oauth.qonto.com";
  }

  private get thirdPartyBaseUrl(): string {
    return this.sandboxMode
      ? "https://thirdparty-sandbox.staging.qonto.co"
      : "https://thirdparty.qonto.com";
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
      ],
    };
  }

  getDefaultConfig(sandboxMode = false): QontoProviderConfig {
    return {
      clientId: "",
      clientSecret: "",
      sandboxMode,
      sandboxToken: "",
    };
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
        return {
          status: WebhookVerificationStatus.Error,
          error: "Missing x-qonto-signature header",
        };
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
        return {
          status: WebhookVerificationStatus.Error,
          error: "Invalid signature header format",
        };
      }

      // Verify timestamp is within 5 minutes
      const timestampAge =
        Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
      if (timestampAge > 300) {
        return {
          status: WebhookVerificationStatus.Error,
          error: "Webhook timestamp too old",
        };
      }

      // Recreate signed payload: {timestamp}.{raw_request_body}
      const signedPayload = `${timestamp}.${rawBody}`;
      const expectedSignature = createHmac("sha256", secret)
        .update(signedPayload)
        .digest("hex");

      if (signature !== expectedSignature) {
        return {
          status: WebhookVerificationStatus.Error,
          error: "Invalid webhook signature",
        };
      }
    }

    // Parse payload
    const payload = JSON.parse(rawBody) as unknown;
    const parsed = QontoWebhookPayloadSchema.safeParse(payload);

    if (!parsed.success) {
      return {
        status: WebhookVerificationStatus.Error,
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
        status: WebhookVerificationStatus.Ignore,
        reason: "No valid reference ID in Qonto transaction",
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
    const scopes = ["organization.read", "webhook"].join(" ");
    return `${this.oauthBaseUrl}/oauth2/auth?response_type=code&client_id=${this.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${state}`;
  }

  async exchangeCode({
    code,
    redirectUri,
  }: {
    code: string;
    redirectUri?: string;
  }): Promise<QontoBankCredentials> {
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

  async listAccounts(): Promise<BankProviderBankAccount[]> {
    try {
      const [bankAccounts, organizationDetails] = await Promise.all([
        this.getBankAccounts(),
        this.getOrganizationDetails(),
      ]);

      return bankAccounts.bank_accounts
        .filter((acc) => acc.is_external_account)
        .map((acc) => ({
          id: acc.id,
          name: organizationDetails.organization.legal_name,
          iban: acc.iban,
          currency: acc.currency,
          bic: acc.bic,
          bankIdentifierName: acc.name,
        }));
    } catch (error) {
      console.error("Error listing Qonto accounts:", error);
      throw error;
    }
  }

  async createWebhook({
    webhookUrl,
  }: {
    webhookUrl: string;
  }): Promise<{ id: string; secret: string }> {
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
          Authorization: `Bearer ${this.accessToken}`,
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
  }): Promise<QontoBankCredentials> {
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

  private async getOrganizationDetails() {
    const response = await fetch(`${this.thirdPartyBaseUrl}/v2/organization`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        ...this.getTestingHeader(),
        ...this.getSignatureHeader(),
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get Qonto organization details: ${error}`);
    }

    const data = await response.json();

    const parsedData = QontoOrganizationSchema.safeParse(data);

    if (!parsedData.success) {
      throw new Error(
        `Failed to parse Qonto organization details: ${parsedData.error}`,
      );
    }

    return parsedData.data;
  }

  private async getBankAccounts() {
    const response = await fetch(`${this.thirdPartyBaseUrl}/v2/bank_accounts`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        ...this.getTestingHeader(),
        ...this.getSignatureHeader(),
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get Qonto bank accounts: ${error}`);
    }

    const data = await response.json();

    const parsedData = QontoBankAccountSchema.safeParse(data);

    if (!parsedData.success) {
      throw new Error(
        `Failed to parse Qonto bank accounts: ${parsedData.error}`,
      );
    }

    return parsedData.data;
  }
}
