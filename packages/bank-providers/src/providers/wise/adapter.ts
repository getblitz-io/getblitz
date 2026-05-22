import { createVerify } from "crypto";
import { z } from "zod";

import type {
  AccountConfig,
  BankCredentials,
  BankProviderBankAccount,
  ProviderConfig,
  ProviderConfigPreSaveContext,
  ProviderConfigSchema,
  WebhookVerificationResult,
} from "../../types";
import type { WiseBankCredentials, WiseProviderConfig } from "./types";
import { BaseBankProvider } from "../../base-provider";
import { WebhookVerificationStatus } from "../../types";
import {
  WiseBalancesResponseSchema,
  WiseCreateWebhookResponseSchema,
  WiseProfilesResponseSchema,
  WiseProviderConfigSchema,
  WiseWebhookPayloadSchema,
} from "./types";

/** Receiving info merged from inline balance.bankDetails and/or GET /v1/.../account-details */
interface WiseReceivingInfo {
  iban: string;
  bic: string;
  accountHolderName?: string;
  bankName?: string;
}

/**
 * Wise `GET /v1/profiles/{id}/account-details` returns nested receiveOptions with IBAN, etc.
 * @see https://docs.wise.com/api-reference/bank-account-details/bankaccountdetailsget.md
 */
function parseAccountDetailsList(
  data: unknown,
): Map<string, WiseReceivingInfo> {
  const byCurrency = new Map<string, WiseReceivingInfo>();
  if (!Array.isArray(data)) return byCurrency;

  for (const rawEntry of data as unknown[]) {
    if (!rawEntry || typeof rawEntry !== "object") continue;
    const entry = rawEntry as Record<string, unknown>;

    const currency = entry.currency;
    const codeRaw =
      currency &&
      typeof currency === "object" &&
      "code" in currency &&
      typeof (currency as { code?: unknown }).code === "string"
        ? (currency as { code: string }).code
        : undefined;
    if (!codeRaw) continue;
    const code = codeRaw.toUpperCase();

    const receiveOptions = entry.receiveOptions;
    const roList = Array.isArray(receiveOptions) ? receiveOptions : [];

    for (const ro of roList) {
      const details =
        ro &&
        typeof ro === "object" &&
        "details" in ro &&
        Array.isArray((ro as { details?: unknown }).details)
          ? (ro as { details: unknown[] }).details
          : [];
      const byType = new Map<string, string>();
      for (const d of details) {
        if (!d || typeof d !== "object") continue;
        const t = (d as { type?: string }).type;
        const body = (d as { body?: string }).body;
        if (typeof t === "string" && typeof body === "string" && body.trim()) {
          byType.set(t, body.trim());
        }
      }
      const rawIban = byType.get("IBAN");
      if (!rawIban) continue;

      const iban = rawIban.replace(/\s/g, "");
      const bicRaw =
        byType.get("SWIFT_CODE") ??
        byType.get("SWIFT") ??
        byType.get("BIC") ??
        "";
      const bic = bicRaw.replace(/\s/g, "");

      const accountHolderName =
        byType.get("ACCOUNT_HOLDER") ?? byType.get("Account holder");
      let bankName = byType.get("BANK_NAME");
      if (!bankName) {
        const bna = byType.get("BANK_NAME_AND_ADDRESS");
        if (bna) bankName = bna.split("\n")[0]?.trim();
      }

      byCurrency.set(code, {
        iban,
        bic,
        ...(accountHolderName && { accountHolderName }),
        ...(bankName && { bankName }),
      });
      break;
    }
  }

  return byCurrency;
}

/**
 * Wise bank provider adapter.
 *
 * Auth model: API token (api_key) — no OAuth2 redirect required.
 * The user generates a token in their Wise settings and pastes it into
 * the provider config. A profile selector custom UI component lets the
 * user pick which profile (business vs personal) to use.
 *
 * Webhook verification: RSA-SHA256 asymmetric signatures.
 * Wise signs payloads with their private key; we verify against their
 * published public key (fetched once and cached in memory).
 *
 * @see https://docs.wise.com/api-reference
 */
export class WiseProvider extends BaseBankProvider {
  readonly id = "wise";
  readonly displayName = "Wise";
  readonly domain = "wise.com";
  readonly authType = "api_key" as const;
  readonly oauthFlowType = "none" as const;

  // Provider config fields (set by applyProviderConfig)
  private _apiToken?: string;
  private _profileId?: string;
  private _sandboxMode?: boolean;

  // In-memory cache for Wise's RSA public key keyed by sandbox mode
  private static _cachedPublicKeyBySandbox = new Map<boolean, string>();

  // -------------------------------------------------------------------
  // Phase transition implementation
  // -------------------------------------------------------------------

  protected createInstance(): WiseProvider {
    return new WiseProvider();
  }

  protected applyProviderConfig(config: WiseProviderConfig): void {
    const cfg = WiseProviderConfigSchema.safeParse(config);
    if (!cfg.success) {
      throw new Error(
        "Invalid Wise provider configuration: " + JSON.stringify(cfg.error),
      );
    }
    this._apiToken = cfg.data.apiToken;
    this._profileId = cfg.data.profileId;
    this._sandboxMode = cfg.data.sandboxMode;
  }

  protected applyCredentials(credentials: WiseBankCredentials): void {
    if (!credentials.apiToken) {
      throw new Error("Wise credentials must include apiToken");
    }
    if (!credentials.profileId) {
      throw new Error("Wise credentials must include profileId");
    }
    this._apiToken = credentials.apiToken;
    this._profileId = credentials.profileId;
  }

  // -------------------------------------------------------------------
  // Config/credential accessors with guards
  // -------------------------------------------------------------------

  private get apiToken(): string {
    if (!this._apiToken) {
      throw new Error("WiseProvider is not properly configured");
    }
    return this._apiToken;
  }

  private get profileId(): string {
    if (!this._profileId) {
      throw new Error(
        "WiseProvider requires a profileId — select a profile in the setup wizard",
      );
    }
    return this._profileId;
  }

  private get sandboxMode(): boolean {
    return this._sandboxMode ?? false;
  }

  private get baseUrl(): string {
    return this.sandboxMode
      ? "https://api.wise-sandbox.com"
      : "https://api.wise.com";
  }

  private get authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiToken}`,
      "Content-Type": "application/json",
    };
  }

  // -------------------------------------------------------------------
  // Custom UI component
  // -------------------------------------------------------------------

  override getCustomConfigComponentId(): string {
    return "wise-profile-selector";
  }

  override getFieldNamesBeforeCustomStep(): string[] {
    return ["apiToken", "sandboxMode"];
  }

  /**
   * Personal API token flow — no OAuth exchange; credentials are the same
   * secrets we store in provider config (token + chosen profile id).
   */
  override getCredentialsFromSavedConfig(
    config: ProviderConfig,
  ): BankCredentials | null {
    const cfg = WiseProviderConfigSchema.safeParse(config);
    if (!cfg.success) return null;
    const { apiToken, profileId } = cfg.data;
    const token = apiToken.trim();
    const pid = profileId?.trim();
    if (!token || !pid) return null;
    const creds: WiseBankCredentials = { apiToken: token, profileId: pid };
    return creds;
  }

  override async preSaveConfigHook({
    config,
    credentials,
  }: ProviderConfigPreSaveContext): Promise<void> {
    if (credentials === null || !("profileId" in credentials)) {
      return;
    }

    const cfg = WiseProviderConfigSchema.safeParse(config);
    if (!cfg.success) {
      throw new Error("Invalid Wise provider configuration");
    }

    await this.assertProfileBelongsToToken({
      apiToken: credentials.apiToken,
      profileId: credentials.profileId,
      sandboxMode: cfg.data.sandboxMode,
    });
  }

  // -------------------------------------------------------------------
  // Provider metadata
  // -------------------------------------------------------------------

  getSetupGuide(): string {
    return "https://github.com/getblitz-io/getblitz/blob/main/apps/docs/docs/banks/wise.md";
  }

  getProviderConfigSchema(): ProviderConfigSchema {
    return {
      fields: [
        {
          name: "apiToken",
          type: "string",
          label: "API Token",
          description:
            "Your Wise API token. Generate one in Wise Settings → API tokens.",
          required: true,
          secret: true,
        },
        {
          name: "sandboxMode",
          type: "boolean",
          label: "Sandbox Mode",
          description: "Enable Wise sandbox environment for testing",
          required: false,
          defaultValue: false,
        },
        // profileId is injected by the WiseProfileSelector custom UI component
        // and is not exposed as a user-editable field in the generic form
        {
          name: "profileId",
          type: "string",
          label: "Profile ID",
          description:
            "Set automatically when you choose a profile in the selector.",
          required: false,
          secret: false,
          hidden: true,
        },
      ],
    };
  }

  getDefaultConfig(sandboxMode = false): WiseProviderConfig {
    return {
      apiToken: "",
      profileId: "",
      sandboxMode,
    };
  }

  getCredentialSchema() {
    return z.object({
      apiToken: z.string(),
      profileId: z.string(),
    });
  }

  getAccountSchema() {
    return z.object({
      iban: z.string().optional(),
      accountId: z.string(),
      profileId: z.string().optional(),
    });
  }

  // -------------------------------------------------------------------
  // Auth — not applicable for API key flow
  // -------------------------------------------------------------------

  getAuthUrl(_params: { redirectUri: string; state: string }): string {
    throw new Error(
      "WiseProvider does not use OAuth2 redirect flow. " +
        "Authentication is via API token — no auth URL needed.",
    );
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async exchangeCode(_params: {
    code: string;
    redirectUri?: string;
  }): Promise<WiseBankCredentials> {
    throw new Error(
      "WiseProvider does not use authorization code exchange. " +
        "Authentication is via API token.",
    );
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async refreshToken(_params: {
    refreshToken: string;
    callbackUrl?: string;
  }): Promise<WiseBankCredentials> {
    throw new Error(
      "WiseProvider API tokens do not expire and cannot be refreshed.",
    );
  }

  override supportsTokenRefresh(): boolean {
    return false;
  }

  override supportsSandboxSimulation(): boolean {
    return this.sandboxMode;
  }

  // -------------------------------------------------------------------
  // Profile listing (public — used by tRPC endpoint before credentials set)
  // -------------------------------------------------------------------

  /**
   * Lists Wise profiles for the given API token.
   * Called by the WiseProfileSelector UI component before a profile is chosen.
   * Can also be called as a static-style call without a configured instance.
   */
  /**
   * Verify the profile id is returned by Wise for this API token.
   */
  async assertProfileBelongsToToken({
    apiToken,
    profileId,
    sandboxMode,
  }: {
    apiToken: string;
    profileId: string;
    sandboxMode: boolean;
  }): Promise<void> {
    const profiles = await this.listProfiles({ apiToken, sandboxMode });
    const normalized = profileId.trim();
    if (!profiles.some((p) => p.id.toString() === normalized)) {
      throw new Error(
        "Selected profile is not accessible with the provided API token",
      );
    }
  }

  async listProfiles({
    apiToken,
    sandboxMode,
  }: {
    apiToken: string;
    sandboxMode: boolean;
  }): Promise<
    {
      id: number;
      type: "personal" | "business";
      fullName: string;
    }[]
  > {
    const token = apiToken;
    const base = sandboxMode
      ? "https://api.wise-sandbox.com"
      : "https://api.wise.com";

    const response = await fetch(`${base}/v2/profiles`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to list Wise profiles: ${error}`);
    }

    const data = await response.json();
    const parsed = WiseProfilesResponseSchema.safeParse(data);

    if (!parsed.success) {
      throw new Error(
        `Failed to parse Wise profiles response: ${parsed.error.message}`,
      );
    }

    return parsed.data.map((profile) => {
      const d = profile.details;
      const fromName = d.name?.trim();
      const fromParts = [d.firstName, d.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();
      const fullName =
        [fromName, fromParts].find((name) => name && name.length > 0) ??
        `Profile ${profile.id.toString()}`;

      return {
        id: profile.id,
        type: profile.type,
        fullName,
      };
    });
  }

  // -------------------------------------------------------------------
  // listAccounts  (Authenticated phase)
  // -------------------------------------------------------------------

  /**
   * IBAN/BIC from GET /v1/profiles/{profileId}/account-details — often populated
   * when `/v4/.../balances` omits `bankDetails` (common in sandbox / newer payloads).
   */
  private async fetchReceivingDetailsByCurrency(): Promise<
    Map<string, WiseReceivingInfo>
  > {
    const response = await fetch(
      `${this.baseUrl}/v1/profiles/${this.profileId}/account-details`,
      {
        headers: this.authHeaders,
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to list Wise account details: ${error}`);
    }

    const data: unknown = await response.json();
    return parseAccountDetailsList(data);
  }

  async listAccounts(): Promise<BankProviderBankAccount[]> {
    const response = await fetch(
      `${this.baseUrl}/v4/profiles/${this.profileId}/balances?types=STANDARD`,
      {
        headers: this.authHeaders,
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to list Wise balances: ${error}`);
    }

    const data = await response.json();
    const parsed = WiseBalancesResponseSchema.safeParse(data);

    if (!parsed.success) {
      throw new Error(
        `Failed to parse Wise balances response: ${parsed.error.message}`,
      );
    }

    const needsAccountDetailsFetch = parsed.data.some(
      (b) => !b.bankDetails?.iban?.trim(),
    );

    let accountDetailsByCurrency = new Map<string, WiseReceivingInfo>();
    if (needsAccountDetailsFetch) {
      accountDetailsByCurrency = await this.fetchReceivingDetailsByCurrency();
    }

    const accounts: BankProviderBankAccount[] = [];

    for (const balance of parsed.data) {
      const inline = balance.bankDetails;
      const fromDetails = accountDetailsByCurrency.get(
        balance.currency.toUpperCase(),
      );

      const ibanFromInline = inline?.iban?.replace(/\s/g, "").trim();
      const ibanFromDetails = fromDetails?.iban;
      const iban =
        ibanFromInline ??
        ibanFromDetails ??
        `WISE-${balance.id}-${balance.currency.toUpperCase()}`;

      const bic = (inline?.bic ?? fromDetails?.bic ?? "").replace(/\s/g, "");

      const name =
        inline?.accountHolderName ??
        fromDetails?.accountHolderName ??
        `Wise ${balance.currency}`;

      const bankIdentifierName =
        inline?.bankName ?? fromDetails?.bankName ?? "Wise";

      accounts.push({
        id: balance.id.toString(),
        name,
        iban,
        currency: balance.currency,
        bic,
        bankIdentifierName,
      });
    }

    return accounts;
  }

  // -------------------------------------------------------------------
  // createWebhook  (Authenticated phase)
  // -------------------------------------------------------------------

  async createWebhook({
    webhookUrl,
  }: {
    webhookUrl: string;
  }): Promise<{ id: string; secret: string }> {
    const response = await fetch(`${this.baseUrl}/v1/webhook-subscriptions`, {
      method: "POST",
      headers: this.authHeaders,
      body: JSON.stringify({
        name: "GetBlitz Payment Notifications",
        trigger_on: "balances#credit",
        scope: {
          domain: "profile",
          id: this.profileId,
        },
        delivery: {
          version: "2.0.0",
          url: webhookUrl,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create Wise webhook: ${error}`);
    }

    const data = await response.json();
    const parsed = WiseCreateWebhookResponseSchema.safeParse(data);

    if (!parsed.success) {
      throw new Error(
        `Failed to parse Wise create webhook response: ${parsed.error.message}`,
      );
    }

    // Wise uses RSA-based asymmetric signatures — there is no per-merchant
    // webhook secret. Return an empty secret; verification uses Wise's public key.
    return { id: parsed.data.id, secret: "" };
  }

  // -------------------------------------------------------------------
  // validateAccount
  // -------------------------------------------------------------------

  // eslint-disable-next-line @typescript-eslint/require-await
  async validateAccount({
    account,
  }: {
    account: AccountConfig;
  }): Promise<boolean> {
    return !!account.accountId;
  }

  // -------------------------------------------------------------------
  // Webhook verification  (Configured phase — no credentials required)
  // -------------------------------------------------------------------

  async verifyAndParseWebhook({
    request,
  }: {
    request: Request;
    secret?: string;
  }): Promise<WebhookVerificationResult> {
    const rawBody = await request.text();

    // --- 1. Verify RSA-SHA256 signature ---
    const signatureHeader = request.headers.get("x-wise-signature");
    if (!signatureHeader) {
      return {
        status: WebhookVerificationStatus.Error,
        error: "Missing x-wise-signature header",
      };
    }

    try {
      const publicKey = await this.fetchPublicKey();
      const verifier = createVerify("RSA-SHA256");
      verifier.update(rawBody);
      const signatureBuffer = Buffer.from(signatureHeader, "base64");
      const isValid = verifier.verify(publicKey, signatureBuffer);

      if (!isValid) {
        return {
          status: WebhookVerificationStatus.Error,
          error: "Invalid Wise webhook signature",
        };
      }
    } catch (err) {
      return {
        status: WebhookVerificationStatus.Error,
        error: `Wise signature verification failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }

    // --- 2. Parse payload ---
    let payload: unknown;
    try {
      payload = JSON.parse(rawBody) as unknown;
    } catch {
      return {
        status: WebhookVerificationStatus.Error,
        error: "Failed to parse Wise webhook payload as JSON",
      };
    }

    const parsed = WiseWebhookPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        status: WebhookVerificationStatus.Error,
        error: `Invalid Wise webhook payload: ${parsed.error.message}`,
      };
    }

    const webhookData = parsed.data;

    // --- 3. Only process credit events ---
    if (webhookData.event_type !== "balances#credit") {
      return {
        status: WebhookVerificationStatus.Ignore,
        reason: `Ignoring Wise event type: ${webhookData.event_type}`,
      };
    }

    // --- 4. Extract amount / currency ---
    const amount = webhookData.data.amount;
    const currency = webhookData.data.currency;

    if (!amount || !currency) {
      return {
        status: WebhookVerificationStatus.Error,
        error: "Wise balances#credit payload missing amount or currency",
      };
    }

    // --- 5. Extract reference ID ---
    // First check if the reference is embedded in the webhook payload itself
    const referenceId =
      this.extractReferenceId(webhookData.data.reference) ??
      this.extractReferenceId(webhookData.data.occurrence_id);

    if (!referenceId) {
      // Fallback: try to fetch the transaction reference from the activities API
      const fetchedReferenceId = await this.fetchReferenceFromActivities({
        amount,
        currency,
      });

      if (!fetchedReferenceId) {
        return {
          status: WebhookVerificationStatus.Ignore,
          reason: "No valid reference ID found in Wise balances#credit event",
        };
      }

      const amountCents = Math.round(amount * 100);
      return {
        status: WebhookVerificationStatus.Success,
        referenceId: fetchedReferenceId,
        txHash: webhookData.data.occurrence_id ?? webhookData.subscription_id,
        amountCents,
        currency,
        rawPayload: payload,
      };
    }

    const amountCents = Math.round(amount * 100);
    return {
      status: WebhookVerificationStatus.Success,
      referenceId,
      txHash: webhookData.data.occurrence_id ?? webhookData.subscription_id,
      amountCents,
      currency,
      rawPayload: payload,
    };
  }

  // -------------------------------------------------------------------
  // Sandbox simulation
  // -------------------------------------------------------------------

  /**
   * Simulate an incoming payment in Wise sandbox.
   * Uses the balance topup simulation endpoint.
   *
   * @see https://docs.wise.com/api-reference/api/simulations
   */
  async simulateSandboxPayment({
    accountId,
    amount,
    currency,
    reference,
  }: {
    accountId: string;
    amount: number;
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
      const response = await fetch(
        `${this.baseUrl}/v1/simulation/balance/topup`,
        {
          method: "POST",
          headers: this.authHeaders,
          body: JSON.stringify({
            profileId: this.profileId,
            balanceId: accountId,
            currency,
            amount,
            details: {
              reference,
            },
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Wise sandbox topup failed: ${errorText}`,
        };
      }

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Unknown error during Wise sandbox simulation",
      };
    }
  }

  // -------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------

  /**
   * Fetch Wise's public RSA key used for webhook signature verification.
   * Cached in memory for the process lifetime to avoid repeated HTTP calls.
   *
   * @see https://docs.wise.com/api-reference/api/webhooks#key-management
   */
  private async fetchPublicKey(): Promise<string> {
    const sandbox = this.sandboxMode;
    const cached = WiseProvider._cachedPublicKeyBySandbox.get(sandbox);
    if (cached) {
      return cached;
    }

    const response = await fetch(
      `${this.baseUrl}/v1/subscription-types/webhook/public-key`,
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch Wise webhook public key: ${response.status}`,
      );
    }

    const text = await response.text();
    WiseProvider._cachedPublicKeyBySandbox.set(sandbox, text);
    return text;
  }

  /**
   * Attempt to find the payment reference in recent activity by matching
   * amount and currency. Falls back when reference is absent from webhook payload.
   */
  private async fetchReferenceFromActivities({
    amount,
    currency,
  }: {
    amount: number;
    currency: string;
  }): Promise<string | null> {
    if (!this._apiToken || !this._profileId) {
      return null;
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/v4/profiles/${this._profileId}/activities?size=20`,
        { headers: this.authHeaders },
      );

      if (!response.ok) return null;

      const data = (await response.json()) as {
        activities?: {
          description?: string;
          title?: string;
          primaryAmount?: { value: number; currency: string };
        }[];
      };

      const activities = data.activities ?? [];
      const amountRounded = Math.round(amount * 100);

      for (const activity of activities) {
        const actAmount = activity.primaryAmount;
        if (!actAmount) continue;
        if (
          actAmount.currency === currency &&
          Math.round(actAmount.value * 100) === amountRounded
        ) {
          const ref =
            this.extractReferenceId(activity.description) ??
            this.extractReferenceId(activity.title);
          if (ref) return ref;
        }
      }
    } catch {
      // Non-fatal — return null to trigger Ignore
    }

    return null;
  }

  /**
   * Extract a GetBlitz reference ID (GB-XXXXXXXX) from a text string.
   */
  private extractReferenceId(text: string | undefined | null): string | null {
    if (!text) return null;
    const match = /GB-[A-Z0-9]{8}/i.exec(text);
    return match ? match[0].toUpperCase() : null;
  }
}
