import { z } from "zod";

/**
 * Line item schema - shared between form and API
 */
export const LineItemSchema = z.object({
  description: z.string().max(255),
  quantity: z.number().positive(),
  unitPriceCents: z.number().int(),
});

export type LineItem = z.infer<typeof LineItemSchema>;

export const MetadataSchema = z.record(
  z.string(),
  z.string().or(z.number()).or(z.boolean()),
);

export type Metadata = z.infer<typeof MetadataSchema>;

/**
 * Base invoice schema - contains common fields for all invoice operations
 */
export const BaseInvoiceSchema = z.object({
  // Customer details
  customerId: z.string().optional(),
  customerEmail: z.string().email("Invalid email address"), // Changed from just string to email validation
  customerName: z.string().max(255).optional(),
  customerAddress: z.string().max(500).optional(),
  customerTaxId: z.string().max(50).optional(),

  // Invoice content
  description: z.string().max(1000).optional(),
  notes: z.string().max(2000).optional(),
  invoiceNumber: z.string().max(50).optional(),

  // Financial
  currency: z.enum(["EUR"]).default("EUR"),
  lineItems: z.array(LineItemSchema).default([]),

  // Security
  password: z.string().max(100).optional(),

  // Metadata
  metadata: MetadataSchema.optional(),
});

/**
 * Invoice form schema - used for frontend form validation
 * Extends base schema with form-specific fields
 */
export const InvoiceFormSchema = BaseInvoiceSchema.extend({
  // UI specific fields
  showNewCustomerForm: z.boolean(),

  // Form-specific financial inputs (strings that need conversion)
  amount: z.string().optional(),
  taxRatePercent: z.string().optional(),
  discountAmount: z.string().optional(),

  // Currency fixed to EUR for form
  currency: z.literal("EUR"),

  // Bank selection
  bankAccountId: z.string().min(1, "Bank account is required"),

  // Expiration (datetime-local input)
  expiresAt: z.string().optional(),

  // Password confirmation
  passwordConfirm: z.string().optional(),
  removePassword: z.boolean(),

  // Override lineItems to match form types (required)
  lineItems: z.array(LineItemSchema),
}).refine(
  (data) => {
    if (data.password && data.password !== data.passwordConfirm) {
      return false;
    }
    return true;
  },
  {
    message: "Passwords do not match",
    path: ["passwordConfirm"],
  },
);

export type InvoiceFormValues = z.infer<typeof InvoiceFormSchema>;

/**
 * Create invoice input schema - used for API validation
 */
export const CreateInvoiceInputSchema = BaseInvoiceSchema.extend({
  slug: z.string(),

  // Computed financial values
  amountCents: z.number().int().positive(),
  subtotalCents: z.number().int(),
  taxRateBps: z.number().int().min(0).max(10000).default(0),
  taxAmountCents: z.number().int().min(0).default(0),
  discountCents: z.number().int().min(0).default(0),

  // Bank
  bankAccountId: z.string(),
  merchantReferenceId: z.string().max(64).optional(),

  // Specific requirements for create
  dueDate: z.coerce.date().optional(),
  expiresInMinutes: z.number().int().positive().optional().nullable(),

  // Password requirements
  password: z.string().min(4).max(100).optional(),
});

export type CreateInvoiceInput = z.infer<typeof CreateInvoiceInputSchema>;

/**
 * Update invoice input schema - used for API validation
 */
export const UpdateInvoiceInputSchema = BaseInvoiceSchema.partial().extend({
  slug: z.string(),
  id: z.string(),

  // Computed financial values (optional for update)
  subtotalCents: z.number().int().optional(),
  taxRateBps: z.number().int().min(0).max(10000).optional(),
  taxAmountCents: z.number().int().min(0).optional(),
  discountCents: z.number().int().min(0).optional(),

  dueDate: z.iso.datetime().optional(),

  // Password requirements
  password: z.string().min(4).max(100).optional(),
});

export type UpdateInvoiceInput = z.infer<typeof UpdateInvoiceInputSchema>;
