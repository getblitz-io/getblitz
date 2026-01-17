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
 * Revolut transaction leg schema (used in full transaction responses)
 */
const RevolutTransactionLegSchema = z.object({
  leg_id: z.string().optional(),
  amount: z.number(),
  currency: z.string(),
  description: z.string().optional(),
  account_id: z.string().optional(),
});

/**
 * Full Revolut transaction schema (from API response)
 * @see https://developer.revolut.com/docs/business/get-transaction
 */
const RevolutTransactionSchema = z.object({
  id: z.string(),
  type: z.string(),
  state: z.string(),
  request_id: z.string().optional(),
  created_at: z.string().optional(),
  completed_at: z.string().optional(),
  reference: z.string().optional(),
  legs: z.array(RevolutTransactionLegSchema).optional(),
});

type RevolutTransaction = z.infer<typeof RevolutTransactionSchema>;

/**
 * TransactionCreated webhook payload - contains full transaction data
 */
const TransactionCreatedPayloadSchema = z.object({
  event: z.literal("TransactionCreated"),
  timestamp: z.string(),
  data: RevolutTransactionSchema,
});

/**
 * TransactionStateChanged webhook payload - contains minimal data
 * Requires API call to fetch full transaction details
 */
const TransactionStateChangedPayloadSchema = z.object({
  event: z.literal("TransactionStateChanged"),
  timestamp: z.string(),
  data: z.object({
    id: z.string(),
    request_id: z.string().optional(),
    old_state: z.string(),
    new_state: z.string(),
  }),
});

/**
 * Combined Revolut webhook payload schema
 * Handles both TransactionCreated (full) and TransactionStateChanged (minimal) events
 */
export const RevolutWebhookPayloadSchema = z.discriminatedUnion("event", [
  TransactionCreatedPayloadSchema,
  TransactionStateChangedPayloadSchema,
]);

type RevolutWebhookPayload = z.infer<typeof RevolutWebhookPayloadSchema>;

/**
 * Revolut provider configuration
 * Note: redirectUri is not stored in config - it's generated per connection attempt
 */
export interface RevolutProviderConfig extends ProviderConfig {
  clientId: string;
  privateKeyPem: string;
  sandboxMode: boolean;
}

export class RevolutProvider extends BaseBankProvider {
  readonly id = "revolut";
  readonly displayName = "Revolut Business";
  readonly domain = "revolut.com";
  readonly authType = "certificate" as const;
  readonly oauthFlowType = "manual-consent" as const;

  private clientId: string;
  private privateKeyPem: string;
  private sandboxMode: boolean;

  constructor(config?: ProviderConfig) {
    super();
    const cfg = config as RevolutProviderConfig | undefined;

    this.clientId = cfg?.clientId ?? "";
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
      privateKeyPem: "",
      sandboxMode,
    };
  }

  private ensureConfigured(): void {
    if (!this.clientId || !this.privateKeyPem) {
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
   * @param redirectUri - The callback URL, used to extract the issuer domain
   */
  private generateClientAssertion(redirectUri: string): string {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 60 * 40; // 40 minutes from now

    // Extract domain from redirectUri for the issuer claim
    const issuerDomain = new URL(redirectUri).hostname;

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
  ): Promise<
    | { accountId: string; iban: string; bic: string; beneficiary: string }[]
    | null
  > {
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
        beneficiary?: string;
      }[];

      // filter out data wihout iban, bic, beneficiary and group by iban, bic, beneficiary
      const grouped = new Map<
        string,
        { iban: string; bic: string; beneficiary: string }
      >();
      for (const item of data) {
        if (item.iban && item.bic && item.beneficiary) {
          const key = `${item.iban}-${item.bic}-${item.beneficiary}`;
          grouped.set(key, {
            iban: item.iban,
            bic: item.bic,
            beneficiary: item.beneficiary,
          });
        }
      }

      return Array.from(grouped.values()).map((value) => ({
        accountId,
        ...value,
      }));
    } catch {
      return null;
    }
  }

  /**
   * Fetch a transaction by ID from the Revolut API.
   * Used when receiving TransactionStateChanged webhooks that don't include full transaction data.
   * @see https://developer.revolut.com/docs/business/get-transaction
   */
  private async getTransaction({
    credentials,
    transactionId,
    idType = "transaction",
  }: {
    credentials: BankCredentials;
    transactionId: string;
    idType: "transaction" | "request";
  }): Promise<RevolutTransaction | null> {
    const url =
      idType === "transaction"
        ? `/api/1.0/transaction/${transactionId}`
        : `/api/1.0/request/${transactionId}?id_type=request`;
    try {
      const response = await fetch(`${this.baseUrl}${url}`, {
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
        },
        method: "GET",
      });

      if (!response.ok) {
        const body = await response.text();
        console.error(
          `Failed to fetch Revolut transaction ${transactionId}: ${response.status} ${body}`,
        );
        return null;
      }

      const data = await response.json();
      const parsed = RevolutTransactionSchema.safeParse(data);

      if (!parsed.success) {
        console.error(
          `Invalid Revolut transaction response: ${parsed.error.message}`,
        );
        return null;
      }

      return parsed.data;
    } catch (error) {
      console.error("Error fetching Revolut transaction:", error);
      return null;
    }
  }

  async verifyAndParseWebhook({
    request,
    secret,
    credentials,
  }: {
    request: Request;
    secret?: string;
    credentials?: BankCredentials;
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
      // Revolut-Request-Timestamp is Unix timestamp in milliseconds
      const webhookTime = parseInt(timestampHeader, 10);
      const now = Date.now();
      if (isNaN(webhookTime) || Math.abs(now - webhookTime) > 5 * 60 * 1000) {
        return { valid: false, error: "Webhook timestamp too old or invalid" };
      }

      // Parse signatures (format: v1=sig1,v1=sig2)
      const signatures = signatureHeader
        .split(",")
        .map((s) => {
          const [, sig] = s.split("=");
          return sig;
        })
        .filter(Boolean);

      // Compute expected signature per Revolut docs:
      // payload_to_sign = v1.{timestamp}.{raw_payload}
      const signedPayload = `v1.${timestampHeader}.${rawBody}`;
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

      // 1. Resolve full transaction
      const { transaction, error: resolveError } =
        await this.resolveWebhookTransaction(parsed.data, credentials);

      if (resolveError || !transaction) {
        return {
          valid: false,
          error: resolveError ?? "Failed to resolve transaction",
        };
      }

      // 2. Validate transaction structure
      const firstLeg = transaction.legs?.[0];
      const validation = this.validateWebhookTransaction(transaction);
      if (!validation.valid || !firstLeg) {
        return {
          valid: false,
          error: validation.error ?? "Invalid transaction",
        };
      }

      // 3. Extract reference from description field
      const referenceId = this.extractReferenceId(firstLeg.description);
      if (!referenceId) {
        return {
          valid: false,
          error: "No valid reference ID in Revolut transaction",
        };
      }

      const amountCents = Math.round(firstLeg.amount * 100);
      const currency = firstLeg.currency;

      return {
        valid: true,
        referenceId,
        txHash: transaction.id,
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

  /**
   * Resolves the full transaction data from a webhook payload.
   * If the event is TransactionCreated, it already contains the data.
   * If it's TransactionStateChanged, we fetch the full transaction from the API.
   */
  private async resolveWebhookTransaction(
    webhookData: RevolutWebhookPayload,
    credentials?: BankCredentials,
  ): Promise<{ transaction?: RevolutTransaction; error?: string }> {
    if (webhookData.event === "TransactionCreated") {
      if (webhookData.data.state !== "completed") {
        return {
          error: `Transaction not completed yet (state: ${webhookData.data.state})`,
        };
      }
      return { transaction: webhookData.data };
    }

    // TransactionStateChanged - minimal payload, need to fetch full transaction
    if (webhookData.data.new_state !== "completed") {
      return {
        error: `Transaction state changed to ${webhookData.data.new_state}, not completed`,
      };
    }

    // Need credentials to fetch full transaction
    if (!credentials?.accessToken) {
      return {
        error:
          "No access token available to fetch transaction details for TransactionStateChanged event",
      };
    }

    const fetchedTransaction = await this.getTransaction({
      credentials,
      transactionId: webhookData.data.id,
      idType: "transaction",
    });

    if (!fetchedTransaction) {
      return {
        error: `Failed to fetch transaction ${webhookData.data.id} from Revolut API`,
      };
    }

    return { transaction: fetchedTransaction };
  }

  /**
   * Validates that the transaction is a topup and has the expected structure.
   */
  private validateWebhookTransaction(transaction: RevolutTransaction): {
    valid: boolean;
    error?: string;
  } {
    if (transaction.type !== "topup") {
      return {
        valid: false,
        error: `Invalid Revolut transaction type: ${transaction.type}. Expected topup.`,
      };
    }

    if (transaction.legs?.length !== 1) {
      return {
        valid: false,
        error: `Invalid Revolut transaction legs length: ${transaction.legs?.length ?? 0}. Expected 1.`,
      };
    }

    return { valid: true };
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

    if (!redirectUri) {
      throw new Error("redirectUri is required for Revolut authentication");
    }

    const clientAssertion = this.generateClientAssertion(redirectUri);

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
        redirect_uri: redirectUri,
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
      (acc) => acc.currency === "EUR" && acc.state === "active",
    );

    // Fetch bank details in parallel for eligible accounts only
    const bankDetailsMap = new Map<
      string,
      { iban: string; bic: string; beneficiary: string }
    >();

    const accessToken = credentials.accessToken;
    if (eligibleAccounts.length > 0 && accessToken) {
      const bankDetailsResults = await Promise.all(
        eligibleAccounts.map(async (acc) => {
          const details = await this.fetchBankDetails(accessToken, acc.id);
          return { accountId: acc.id, details };
        }),
      );

      for (const result of bankDetailsResults) {
        if (result.details) {
          for (const detail of result.details) {
            bankDetailsMap.set(detail.accountId, detail);
          }
        }
      }
    }

    return Array.from(bankDetailsMap.entries()).map(([accountId, details]) => ({
      id: accountId,
      name: details.beneficiary,
      iban: details.iban,
      currency: "EUR",
      bic: details.bic,
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
    callbackUrl,
  }: {
    refreshToken: string;
    callbackUrl?: string;
  }): Promise<BankCredentials> {
    this.ensureConfigured();

    if (!callbackUrl) {
      throw new Error("callbackUrl is required for Revolut token refresh");
    }

    const clientAssertion = this.generateClientAssertion(callbackUrl);

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

  override supportsSandboxSimulation(): boolean {
    return this.sandboxMode;
  }

  /**
   * Simulate a payment in sandbox mode using Revolut's sandbox top-up API.
   * This creates an incoming transaction with the specified reference,
   * which will trigger Revolut's webhook for realistic end-to-end testing.
   *
   * @see https://developer.revolut.com/docs/guides/manage-accounts/api-usage-and-testing/test-flows-with-simulations
   */
  async simulateSandboxPayment({
    credentials,
    accountId,
    amount,
    currency,
    reference,
  }: {
    credentials: BankCredentials;
    accountId: string;
    amount: number; // in major units (e.g., 10.50)
    currency: string;
    reference: string;
  }): Promise<{ success: boolean; error?: string }> {
    if (!this.sandboxMode) {
      return {
        success: false,
        error: "Sandbox simulation only available in sandbox mode",
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/1.0/sandbox/topup`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          account_id: accountId,
          amount,
          currency,
          reference,
          state: "completed",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Revolut sandbox top-up failed: ${errorText}`,
        };
      }

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Unknown error during sandbox simulation",
      };
    }
  }

  private extractReferenceId(text: string | undefined): string | null {
    if (!text) return null;
    const match = /GB-[A-Z0-9]{8}/i.exec(text);
    return match ? match[0].toUpperCase() : null;
  }
}
