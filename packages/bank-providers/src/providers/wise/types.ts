import { z } from "zod";

import type { BaseBankCredentials, ProviderConfig } from "../../types";

// ---------------------------------------------------------------------------
// Provider config schema
// ---------------------------------------------------------------------------

export const WiseProviderConfigSchema = z.object({
  apiToken: z.string().min(1),
  profileId: z.string().optional(),
  sandboxMode: z.boolean().default(false),
});

export interface WiseProviderConfig extends ProviderConfig {
  apiToken: string;
  profileId?: string;
  sandboxMode: boolean;
}

// ---------------------------------------------------------------------------
// Credentials
// ---------------------------------------------------------------------------

export interface WiseBankCredentials extends BaseBankCredentials {
  apiToken: string;
  profileId: string;
}

// ---------------------------------------------------------------------------
// Profile API  (GET /v2/profiles)
// ---------------------------------------------------------------------------

/**
 * Wise `GET /v2/profiles` items — tolerate casing on `type`, missing `details`,
 * and string `id` (some environments differ slightly from the reference schema).
 */
export const WiseProfileSchema = z.object({
  id: z.coerce.number(),
  type: z.unknown().transform((v) => {
    if (v == null) return "personal" as const;
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    const s = v.toString().toLowerCase().trim();
    return s === "business" ? ("business" as const) : ("personal" as const);
  }),
  details: z
    .object({
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      name: z.string().optional(), // business name
    })
    .optional()
    .nullable()
    .transform((d) => d ?? {}),
});

export const WiseProfilesResponseSchema = z.array(WiseProfileSchema);

export type WiseProfile = z.infer<typeof WiseProfileSchema>;

// ---------------------------------------------------------------------------
// Balances API  (GET /v4/profiles/{profileId}/balances)
// ---------------------------------------------------------------------------

export const WiseBalanceBankDetailsSchema = z.object({
  id: z.number().optional(),
  iban: z.string().optional(),
  bic: z.string().optional(),
  accountHolderName: z.string().optional(),
  bankName: z.string().optional(),
});

export const WiseBalanceSchema = z.object({
  id: z.number(),
  currency: z.string(),
  type: z.string(),
  amount: z
    .object({
      value: z.number(),
      currency: z.string(),
    })
    .optional(),
  bankDetails: WiseBalanceBankDetailsSchema.optional().nullable(),
});

export const WiseBalancesResponseSchema = z.array(WiseBalanceSchema);

export type WiseBalance = z.infer<typeof WiseBalanceSchema>;

// ---------------------------------------------------------------------------
// Webhook payload  (incoming balances#credit / balances#debit events)
// ---------------------------------------------------------------------------

export const WiseWebhookPayloadSchema = z.object({
  subscription_id: z.string(),
  profile_id: z.number(),
  event_type: z.string(), // "balances#credit" | "balances#debit" | etc.
  schema_version: z.string().optional(),
  sent_at: z.string().optional(),
  data: z.object({
    resource: z
      .object({
        id: z.number(),
        profile_id: z.number(),
        type: z.string(),
        changed_fields: z.array(z.string()).optional(),
      })
      .optional(),
    amount: z.number().optional(),
    currency: z.string().optional(),
    transaction_type: z.string().optional(),
    post_transaction_balance_amount: z.number().optional(),
    occurrence_id: z.string().optional(),
    reference: z.string().optional(),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
});

export type WiseWebhookPayload = z.infer<typeof WiseWebhookPayloadSchema>;

// ---------------------------------------------------------------------------
// Webhook subscription  (POST /v1/webhook-subscriptions)
// ---------------------------------------------------------------------------

export const WiseCreateWebhookResponseSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  delivery: z
    .object({
      version: z.string().optional(),
      url: z.string().optional(),
    })
    .optional(),
  trigger_on: z.string().optional(),
  scope: z
    .object({
      domain: z.string().optional(),
      id: z.string().optional(),
    })
    .optional(),
});

export type WiseCreateWebhookResponse = z.infer<
  typeof WiseCreateWebhookResponseSchema
>;

// ---------------------------------------------------------------------------
// Statement / activity (GET /v4/profiles/{profileId}/activities) — for reference lookup
// ---------------------------------------------------------------------------

export const WiseActivityItemSchema = z.object({
  id: z.number().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  primaryAmount: z
    .object({
      value: z.number(),
      currency: z.string(),
    })
    .optional(),
  secondaryAmount: z
    .object({
      value: z.number(),
      currency: z.string(),
    })
    .optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
});

export const WiseActivitiesResponseSchema = z.object({
  activities: z.array(WiseActivityItemSchema).optional(),
});
