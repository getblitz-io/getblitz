# `@getblitz/bank-providers`

Pluggable bank provider adapters for the GetBlitz payment gateway. Each provider implements a common three-phase interface so the rest of the codebase can stay agnostic of bank-specific quirks.

```
┌─────────────────┐       withProviderConfig        ┌────────────────────┐       withCredentials       ┌──────────────────────┐
│  BankProvider   │ ──────────────────────────────► │ ConfiguredProvider │ ──────────────────────────► │ AuthenticatedProvider │
│   (template)    │                                 │  (auth + webhooks) │                             │ (account/webhook ops) │
└─────────────────┘                                 └────────────────────┘                             └──────────────────────┘
```

The phase split exists so we can answer questions like "list available providers" and "verify a webhook" without dragging credentials into memory unnecessarily.

## Currently registered providers

| ID          | Auth model    | OAuth flow     | Sandbox | Custom UI step          |
| ----------- | ------------- | -------------- | ------- | ----------------------- |
| `qonto`     | `oauth2`      | redirect       | ✅      | —                       |
| `revolut`   | `certificate` | manual-consent | ✅      | —                       |
| `wise`      | `api_key`     | none           | ✅      | `wise-profile-selector` |
| `test-bank` | `none`        | none           | ✅      | —                       |

See [`apps/docs/docs/banks/`](../../apps/docs/docs/banks) for end-user setup guides.

---

## Three-phase provider lifecycle

### Phase 1 — Template (`BankProvider`)

Returned by `ProviderRegistry.getProvider(id)`. Holds **no config and no credentials**. Used for:

- Listing providers in the UI dropdown
- Reading the config form schema (`getProviderConfigSchema()`)
- Resolving the custom UI component ID (`getCustomConfigComponentId()`)
- Reading the credential / account zod schemas (for validation in API routes)

### Phase 2 — Configured (`ConfiguredProvider`)

Created via `template.withProviderConfig(config)` or `ProviderRegistry.createConfiguredProvider({ id, config })`. Has provider-level config (client ID, sandbox flag, base URLs, …) but **no merchant credentials yet**. Used for:

- `getAuthUrl()` / `exchangeCode()` / `refreshToken()` — OAuth flows
- `verifyAndParseWebhook()` — webhook signature verification (the per-merchant secret, when there is one, is passed as a parameter)
- `validateAccount()`

### Phase 3 — Authenticated (`AuthenticatedProvider`)

Created via `template.withCredentials(config, credentials)` or `ProviderRegistry.createAuthenticatedProvider({ id, config, credentials })`. Has both config _and_ credentials. Used for everything that requires an access token:

- `listAccounts()`
- `createWebhook()`
- `simulateSandboxPayment()` (sandbox connections only)

> **Why three phases?** It surfaces in the type system which calls require credentials and which don't. You can't accidentally call `listAccounts()` on a template — it'll fail to type-check. It also keeps webhook verification cheap: we don't need to rehydrate a merchant's credentials just to check a signature.

---

## Custom provider UI components

Most providers can be configured with a generic form rendered from `getProviderConfigSchema()`. Some need a provider-specific extra step — e.g. Wise needs the user to pick which profile to bind to the connection _after_ they've entered the API token but _before_ saving anything.

This is handled by a small registry on the frontend.

### How it works

1. The provider adapter returns a string ID from `getCustomConfigComponentId()`:

   ```ts
   // packages/bank-providers/src/providers/wise/adapter.ts
   override getCustomConfigComponentId(): string {
     return "wise-profile-selector";
   }
   ```

2. That ID is exposed via `ProviderMetadata.customConfigComponentId` (returned by `ProviderRegistry.getAllProviderMetadata()`), so the frontend gets it for free without importing the provider package.

3. The frontend looks the ID up in a lazy registry:

   ```ts
   // apps/web/src/app/(portal)/[slug]/banks/connect/[providerId]/custom-provider-components.tsx
   const COMPONENT_REGISTRY = {
     "wise-profile-selector": lazy(() => import("./wise/WiseProfileSelector")),
   };
   ```

4. The configure-provider page renders the custom component **before** the standard form, with a `customStepDone` gate. The custom component receives the live form values, can write back into the config via `onConfigUpdate({ ...overrides })`, and signals completion with `onComplete()`.

   For `operation === "update"` (reconfiguring an existing connection) the custom step is skipped — the previously chosen value is already persisted.

### Adding another custom step

1. Build a React component that implements `CustomProviderComponentProps` (see `custom-provider-components.tsx`).
2. Register it in `COMPONENT_REGISTRY` with a unique key.
3. Override `getCustomConfigComponentId()` in your adapter to return that key.
4. Inside your component, fetch whatever you need via tRPC. Use an **`organizationProcedure`** (org membership + slug) when the call needs auth but not persisted credentials yet.

> The Wise profile selector uses `provider.wise.listProfiles` (`organizationProcedure`) — the user is authenticated and in an org, but the API token is only submitted from the form, not stored until save completes.

---

## Wise: design notes

The Wise adapter intentionally diverges from the Qonto/Revolut shape in a few places. These are worth knowing before extending it.

### 1. Personal API token, not OAuth 2.0

Wise offers two auth models ([docs](https://docs.wise.com/guides/developer/auth-and-security)):

- **OAuth 2.0** — for partners with a signed Wise Platform agreement, mTLS, optionally JOSE.
- **Personal API token** — generated by an SMB inside their own Wise account.

GetBlitz uses the personal API token path. That gives us:

- ✅ Zero partnership friction — anyone with a Wise business account can connect today.
- ✅ No mTLS setup, no client secret rotation.
- ❌ Single-tenant only — you can connect _your_ Wise account, not a customer's on their behalf.
- ❌ No token expiry / refresh, but also no automatic rotation if the token leaks.

`authType` is therefore `api_key` and `oauthFlowType` is `none`. The `getAuthUrl`, `exchangeCode`, and `refreshToken` methods all throw with explanatory messages instead of being silently no-ops.

### 2. Profile selection is a config concern, not a credential concern

A Wise account → many profiles → many balances. The `apiToken` alone isn't enough to disambiguate where payments should land — we also need a `profileId`. Two options were considered:

- (a) Make `profileId` part of `getProviderConfigSchema()` and let the user paste a numeric ID.
- (b) Build a custom UI step that lists profiles and lets them click one.

We picked (b) because numeric profile IDs aren't shown in the Wise UI in a way users can reliably copy. The schema still includes a `profileId` field (so the dynamic form can serialize/restore it) but it's `hidden: true`, populated by the custom component via `onConfigUpdate`, not typed by the user.

### 3. RSA-SHA256 webhook verification, no per-merchant secret

Wise signs **all** webhooks with their platform-wide RSA private key. GetBlitz verifies with the sandbox/production keys from [Wise's event-handling guide](https://docs.wise.com/guides/developer/webhooks/event-handling) (`wise-webhook-public-keys.ts`). Verification is asymmetric:

```ts
const verifier = createVerify("RSA-SHA256");
verifier.update(rawBody);
verifier.verify(publicKey, Buffer.from(signatureHeader, "base64"));
```

Consequences:

- `createWebhook()` returns `{ id, secret: "" }`. The empty secret is intentional — the webhook handler doesn't need a merchant-specific secret to verify Wise payloads.
- The public key is selected by `sandboxMode` from `wise-webhook-public-keys.ts`. If Wise rotates their key, update that file and redeploy.
- The `verifyAndParseWebhook` body **must** be read as raw text before `JSON.parse` — re-serializing the JSON would change byte ordering and break the signature.

### 4. Reference extraction

`account-details-payment#state-change` when `current_state === COMPLETED`:

1. `data.transfer.id` from the webhook.
2. `GET /v1/transfers/{transferId}` → `reference` / `details.reference` → `GB-XXXXXXXX`.

`createWebhook()` registers only that subscription. Existing Wise connections may need webhook re-setup if they still have legacy `balances#credit` subscriptions.

### 5. Sandbox simulation

Wise does **not** implement `supportsSandboxSimulation()`. Sandbox connections use the generic **Simulate payment** path in `payment-session.service.ts` (direct `paymentSettlementService.settle()` with a `sim_*` tx hash). Revolut still uses provider sandbox simulation (topup + webhook).

---

## Adding a new bank provider

1. **Scaffold the adapter package layout**:

   ```
   packages/bank-providers/src/providers/<name>/
     adapter.ts        # extends BaseBankProvider
     types.ts          # zod schemas + provider config / credential interfaces
     adapter.test.ts
     index.ts          # export * from "./adapter"
   ```

2. **Extend `BaseBankProvider`** and implement, at minimum:
   - `id`, `displayName`, `domain`, `authType`, `oauthFlowType`
   - `createInstance()`, `applyProviderConfig()`, `applyCredentials()`
   - `getProviderConfigSchema()`, `getDefaultConfig()`, `getCredentialSchema()`, `getAccountSchema()`
   - `getSetupGuide()` → URL of the user-facing markdown guide
   - The phase-3 operations you actually support (`listAccounts`, `createWebhook`, `verifyAndParseWebhook`, `validateAccount`)

3. **Add the credentials union member** in `src/types.ts`:

   ```ts
   export type BankCredentials = … | YourBankCredentials;
   ```

4. **Re-export the provider** from `src/index.ts` and the adapter folder's `index.ts`.

5. **Register it** in `packages/api/src/container/index.ts`:

   ```ts
   ProviderRegistry.register(YourProvider);
   ```

6. **(Optional) Add a custom UI step** following the recipe in [Custom provider UI components](#custom-provider-ui-components) above.

7. **Write the user-facing setup guide** at `apps/docs/docs/banks/<name>.md`, link it from `apps/docs/docs/index.md`, and point `getSetupGuide()` at `https://github.com/getblitz-io/getblitz/blob/main/apps/docs/docs/banks/<name>.md`.

8. **Tests**: copy the structure from `providers/wise/adapter.test.ts` — at minimum cover metadata, base URL switching, signature verification (happy path + tampered body + missing header), and supported/ignored webhook event types.
