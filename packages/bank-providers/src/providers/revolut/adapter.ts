import { createHmac, createSign } from "crypto";
import { z } from "zod";

import type {
  AccountConfig,
  BankCredentials,
  ProviderConfig,
  ProviderConfigSchema,
  WebhookVerificationResult,
} from "../../types";
import { BaseBankProvider } from "../../base-provider";

/**
 * Revolut webhook payload schema
 * Based on Revolut Business API webhook format
 */
export const RevolutWebhookPayloadSchema = z.object({
  event: z.string(),
  timestamp: z.string(),
  data: z.object({
    id: z.string(),
    type: z.string().optional(),
    state: z.string().optional(),
    request_id: z.string().optional(),
    created_at: z.string().optional(),
    completed_at: z.string().optional(),
    reference: z.string().optional(),
    legs: z
      .array(
        z.object({
          leg_id: z.string().optional(),
          amount: z.number(),
          currency: z.string(),
          description: z.string().optional(),
          account_id: z.string().optional(),
        }),
      )
      .optional(),
  }),
});

/**
 * Revolut provider configuration
 */
export interface RevolutProviderConfig extends ProviderConfig {
  clientId: string;
  redirectUri: string;
  privateKeyPem: string;
  sandboxMode: boolean;
}

export class RevolutProvider extends BaseBankProvider {
  readonly id = "revolut";
  readonly displayName = "Revolut Business";
  readonly domain = "revolut.com";
  readonly authType = "certificate" as const;

  private clientId: string;
  private redirectUri: string;
  private privateKeyPem: string;
  private sandboxMode: boolean;

  constructor(config?: ProviderConfig) {
    super();
    const cfg = config as RevolutProviderConfig | undefined;

    this.clientId = cfg?.clientId ?? "";
    this.redirectUri = cfg?.redirectUri ?? "";
    this.privateKeyPem = cfg?.privateKeyPem ?? "";
    this.sandboxMode = cfg?.sandboxMode ?? false;
  }

  private get baseUrl(): string {
    return this.sandboxMode
      ? "https://sandbox-b2b.revolut.com"
      : "https://b2b.revolut.com";
  }

  getSetupGuide(): string {
    return "https://github.com/getblitz-io/getblitz/blob/main/docs/banks/revolut.md";
  }

  getProviderConfigSchema(): ProviderConfigSchema {
    return {
      fields: [
        {
          name: "clientId",
          type: "string",
          label: "Client ID",
          description:
            "Client ID from Revolut Business API settings after uploading your certificate",
          required: true,
          secret: false,
        },
        {
          name: "redirectUri",
          type: "string",
          label: "OAuth Redirect URI",
          description:
            "The redirect URI registered with Revolut (must match exactly)",
          required: true,
          secret: false,
        },
        {
          name: "privateKeyPem",
          type: "textarea",
          label: "Private Key (PEM)",
          description:
            "Your private key in PEM format (generated with OpenSSL). This is used to sign JWT assertions.",
          required: true,
          secret: true,
        },
        {
          name: "sandboxMode",
          type: "boolean",
          label: "Sandbox Mode",
          description: "Enable sandbox environment for testing",
          required: false,
          defaultValue: false,
        },
      ],
    };
  }

  getDefaultConfig(sandboxMode = false): RevolutProviderConfig {
    return {
      clientId: "",
      redirectUri: "",
      privateKeyPem: "",
      sandboxMode,
    };
  }

  private ensureConfigured(): void {
    if (!this.clientId || !this.privateKeyPem || !this.redirectUri) {
      throw new Error(
        "RevolutProvider is not configured. Create a configured instance using ProviderRegistry.createProvider()",
      );
    }
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
      iban: z.string().optional(),
      accountId: z.string(),
    });
  }

  /**
   * Generate a JWT client assertion for Revolut API authentication.
   * The JWT is signed with the private key using RS256 algorithm.
   */
  private generateClientAssertion(): string {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 60 * 40; // 40 minutes from now

    // Extract domain from redirectUri for the issuer claim
    const issuerDomain = new URL(this.redirectUri).hostname;

    const header = {
      alg: "RS256",
      typ: "JWT",
    };

    const payload = {
      iss: issuerDomain,
      sub: this.clientId,
      aud: "https://revolut.com",
      iat: now,
      exp,
    };

    // Base64URL encode header and payload
    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));

    // Create signature
    const signatureInput = `${encodedHeader}.${encodedPayload}`;
    const sign = createSign("RSA-SHA256");
    sign.update(signatureInput);
    const signature = sign.sign(this.privateKeyPem, "base64url");

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  private base64UrlEncode(str: string): string {
    return Buffer.from(str)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  /**
   * Fetch bank details (IBAN, BIC) for a specific account.
   * Returns null if the request fails (account may not have bank details).
   */
  private async fetchBankDetails(
    accessToken: string,
    accountId: string,
  ): Promise<{ iban: string; bic: string } | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/1.0/accounts/${accountId}/bank-details`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as {
        iban?: string;
        bic?: string;
      };

      return {
        iban: data.iban ?? "",
        bic: data.bic ?? "",
      };
    } catch {
      return null;
    }
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
      const signatureHeader = request.headers.get("Revolut-Signature");
      const timestampHeader = request.headers.get("Revolut-Request-Timestamp");

      if (!signatureHeader) {
        return { valid: false, error: "Missing Revolut-Signature header" };
      }
      if (!timestampHeader) {
        return {
          valid: false,
          error: "Missing Revolut-Request-Timestamp header",
        };
      }

      // Validate timestamp (5 minute tolerance)
      const webhookTime = new Date(timestampHeader).getTime();
      const now = Date.now();
      if (Math.abs(now - webhookTime) > 5 * 60 * 1000) {
        return { valid: false, error: "Webhook timestamp too old" };
      }

      // Parse signatures (format: v1=sig1,v1=sig2)
      const signatures = signatureHeader
        .split(",")
        .map((s) => {
          const [, sig] = s.split("=");
          return sig;
        })
        .filter(Boolean);

      // Compute expected signature
      const signedPayload = `${timestampHeader}.${rawBody}`;
      const expectedSignature = createHmac("sha256", secret)
        .update(signedPayload)
        .digest("hex");

      // Check if any signature matches
      if (!signatures.includes(expectedSignature)) {
        return { valid: false, error: "Invalid webhook signature" };
      }
    }

    try {
      const payload = JSON.parse(rawBody) as unknown;
      const parsed = RevolutWebhookPayloadSchema.safeParse(payload);

      if (!parsed.success) {
        return {
          valid: false,
          error: `Invalid Revolut webhook payload: ${parsed.error.message}`,
        };
      }

      const { data } = parsed.data;

      // Extract reference from request_id or reference field
      const referenceId =
        this.extractReferenceId(data.reference) ??
        this.extractReferenceId(data.request_id);

      if (!referenceId) {
        return {
          valid: false,
          error: "No valid reference ID in Revolut transaction",
        };
      }

      // Get amount from first leg if available
      const firstLeg = data.legs?.[0];
      const amountCents = firstLeg ? Math.round(firstLeg.amount * 100) : 0;
      const currency = firstLeg?.currency ?? "EUR";

      return {
        valid: true,
        referenceId,
        txHash: data.id,
        amountCents,
        currency,
        rawPayload: payload,
      };
    } catch {
      return {
        valid: false,
        error: "Failed to parse Revolut webhook payload",
      };
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async validateAccount({
    account,
  }: {
    credentials: BankCredentials;
    account: AccountConfig;
  }): Promise<boolean> {
    return !!account.accountId;
  }

  getAuthUrl({
    redirectUri,
    state,
  }: {
    redirectUri: string;
    state: string;
  }): string {
    this.ensureConfigured();

    // Note: Revolut uses the redirect URI configured in the API settings,
    // but we pass it here for consistency with our OAuth flow
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      state,
    });

    return `${this.baseUrl}/app-confirm?${params.toString()}`;
  }

  async exchangeCode({
    code,
    redirectUri,
  }: {
    code: string;
    redirectUri?: string;
  }): Promise<BankCredentials> {
    this.ensureConfigured();

    const clientAssertion = this.generateClientAssertion();

    const response = await fetch(`${this.baseUrl}/api/1.0/auth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_assertion_type:
          "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
        client_assertion: clientAssertion,
        ...(redirectUri && { redirect_uri: redirectUri }),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange Revolut code: ${error}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      token_type: string;
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

    const response = await fetch(`${this.baseUrl}/api/1.0/accounts`, {
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to list Revolut accounts: ${error}`);
    }

    const accounts = (await response.json()) as {
      id: string;
      name: string;
      currency: string;
      balance: number;
      state: string;
      public: boolean;
      created_at: string;
      updated_at: string;
    }[];

    // Filter accounts that qualify for IBAN fetching:
    // EUR currency, active state, and public (has bank details)
    const eligibleAccounts = accounts.filter(
      (acc) =>
        acc.currency === "EUR" && acc.state === "active" && acc.public === true,
    );

    // Fetch bank details in parallel for eligible accounts only
    const bankDetailsMap = new Map<string, { iban: string; bic: string }>();

    const accessToken = credentials.accessToken;
    if (eligibleAccounts.length > 0 && accessToken) {
      const bankDetailsResults = await Promise.all(
        eligibleAccounts.map(async (acc) => {
          const details = await this.fetchBankDetails(accessToken, acc.id);
          return { id: acc.id, details };
        }),
      );

      for (const result of bankDetailsResults) {
        if (result.details) {
          bankDetailsMap.set(result.id, result.details);
        }
      }
    }

    // Return all accounts, with IBAN/BIC populated for eligible ones
    return accounts.map((acc) => {
      const bankDetails = bankDetailsMap.get(acc.id);
      return {
        id: acc.id,
        name: acc.name,
        iban: bankDetails?.iban ?? "",
        currency: acc.currency,
        bic: bankDetails?.bic ?? "",
      };
    });
  }

  async createWebhook({
    credentials,
    webhookUrl,
  }: {
    credentials: BankCredentials;
    webhookUrl: string;
  }): Promise<{ id: string; secret: string }> {
    this.ensureConfigured();

    const response = await fetch(`${this.baseUrl}/api/2.0/webhooks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: webhookUrl,
        events: ["TransactionCreated", "TransactionStateChanged"],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create Revolut webhook: ${error}`);
    }

    const data = (await response.json()) as {
      id: string;
      signing_secret: string;
    };

    return { id: data.id, secret: data.signing_secret };
  }

  async refreshToken({
    refreshToken,
  }: {
    refreshToken: string;
  }): Promise<BankCredentials> {
    this.ensureConfigured();

    const clientAssertion = this.generateClientAssertion();

    const response = await fetch(`${this.baseUrl}/api/1.0/auth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_assertion_type:
          "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
        client_assertion: clientAssertion,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to refresh Revolut token: ${error}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      expires_in: number;
      token_type: string;
    };

    // Revolut refresh doesn't return a new refresh token
    return {
      accessToken: data.access_token,
      refreshToken, // Keep the existing refresh token
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  override supportsTokenRefresh(): boolean {
    return true;
  }

  private extractReferenceId(text: string | undefined): string | null {
    if (!text) return null;
    const match = /GB-[A-Z0-9]{8}/i.exec(text);
    return match ? match[0].toUpperCase() : null;
  }
}
