import { z } from "zod";

/**
 * Customer form schema - used for frontend validation
 */
export const CustomerFormSchema = z.object({
  email: z.email(),
  name: z.string().min(1).optional(),
  address: z.string().optional(),
  taxId: z.string().optional(),
});

export type CustomerFormValues = z.infer<typeof CustomerFormSchema>;

/**
 * Create customer input schema - used for API validation
 */
export const CreateCustomerInputSchema = CustomerFormSchema.extend({
  slug: z.string(),
});

export type CreateCustomerInput = z.infer<typeof CreateCustomerInputSchema>;

/**
 * Update customer input schema - used for API validation
 */
export const UpdateCustomerInputSchema = z.object({
  slug: z.string(),
  id: z.string(),
  email: z.email().optional(),
  name: z.string().min(1).optional(),
  address: z.string().optional(),
  taxId: z.string().optional(),
});

export type UpdateCustomerInput = z.infer<typeof UpdateCustomerInputSchema>;
