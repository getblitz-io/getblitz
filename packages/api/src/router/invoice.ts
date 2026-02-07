import z from "zod";

import { env } from "../env";
import {
  createTRPCRouter,
  organizationProcedure,
  publicProcedure,
} from "../trpc";

const LineItemSchema = z.object({
  description: z.string().max(255),
  quantity: z.number().positive(),
  unitPriceCents: z.number().int(),
});

export const invoiceRouter = createTRPCRouter({
  // Create invoice (organization-scoped)
  create: organizationProcedure
    .input(
      z.object({
        slug: z.string(),
        // Financial
        amountCents: z.number().int().positive(),
        currency: z.enum(["EUR", "USDC"]).default("EUR"),
        subtotalCents: z.number().int(),
        taxRateBps: z.number().int().min(0).max(10000).default(0), // 0-100% in basis points
        taxAmountCents: z.number().int().min(0).default(0),
        discountCents: z.number().int().min(0).default(0),
        lineItems: z.array(LineItemSchema).optional(),
        // Bank
        bankAccountId: z.string().optional(),
        merchantReferenceId: z.string().max(64).optional(),
        // Customer
        customerId: z.string().optional(),
        customerEmail: z.email(),
        customerName: z.string().max(255).optional(),
        customerAddress: z.string().max(500).optional(),
        customerTaxId: z.string().max(50).optional(),
        // Invoice content
        description: z.string().max(1000).optional(),
        notes: z.string().max(2000).optional(),
        invoiceNumber: z.string().max(50).optional(),
        dueDate: z.iso.datetime().optional(), // Expects ISO date string
        // Security
        password: z.string().min(4).max(100).optional(),
        // Expiration
        expiresInMinutes: z.number().int().positive().optional().nullable(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Coerce ISO string to Date object
      const dueDate = input.dueDate ? new Date(input.dueDate) : undefined;

      return ctx.services.invoice.createInvoice({
        input: {
          ...input,
          organizationId: ctx.organization.id,
          dueDate,
        },
        baseUrl: env.NEXT_PUBLIC_APP_URL,
      });
    }),

  // Get invoice by ID (public) - returns isPasswordProtected flag
  get: publicProcedure
    .input(z.object({ invoiceId: z.string(), password: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      return ctx.services.invoice.getInvoiceDetails({
        invoiceId: input.invoiceId,
        password: input.password,
      });
    }),

  // Get invoice by Reference ID (public)
  getByReference: publicProcedure
    .input(
      z.object({ referenceId: z.string(), password: z.string().optional() }),
    )
    .query(async ({ input, ctx }) => {
      return ctx.services.invoice.getInvoiceByReference({
        referenceId: input.referenceId,
        password: input.password,
      });
    }),

  // Verify password for protected invoice
  verifyPassword: publicProcedure
    .input(z.object({ invoiceId: z.string(), password: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const valid = await ctx.services.invoice.verifyPassword({
        invoiceId: input.invoiceId,
        password: input.password,
      });
      return { valid };
    }),

  // List invoices (organization-scoped)
  list: organizationProcedure
    .input(
      z.object({
        slug: z.string(),
        take: z.number().max(100).default(50),
      }),
    )
    .query(async ({ input, ctx }) => {
      return ctx.services.invoice.listByOrgIds({
        orgIds: [ctx.organization.id],
        options: { take: input.take },
      });
    }),

  // Update invoice (organization-scoped)
  update: organizationProcedure
    .input(
      z.object({
        slug: z.string(),
        id: z.string(),
        // Customer
        customerId: z.string().optional(),
        customerEmail: z.email().optional(),
        customerName: z.string().max(255).optional(),
        customerAddress: z.string().max(500).optional(),
        customerTaxId: z.string().max(50).optional(),
        // Invoice content
        description: z.string().max(1000).optional(),
        notes: z.string().max(2000).optional(),
        invoiceNumber: z.string().max(50).optional(),
        dueDate: z.iso.datetime().optional(),
        // Financial details
        lineItems: z.array(LineItemSchema).optional(),
        subtotalCents: z.number().int().optional(),
        taxRateBps: z.number().int().min(0).max(10000).optional(),
        taxAmountCents: z.number().int().min(0).optional(),
        discountCents: z.number().int().min(0).optional(),
        // Security
        password: z.string().min(4).max(100).optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const dueDate = input.dueDate ? new Date(input.dueDate) : undefined;

      return ctx.services.invoice.updateInvoice({
        input: {
          id: input.id,
          organizationId: ctx.organization.id,
          customerId: input.customerId,
          customerEmail: input.customerEmail,
          customerName: input.customerName,
          customerAddress: input.customerAddress,
          customerTaxId: input.customerTaxId,
          description: input.description,
          notes: input.notes,
          dueDate,
          invoiceNumber: input.invoiceNumber,
          lineItems: input.lineItems,
          subtotalCents: input.subtotalCents,
          taxRateBps: input.taxRateBps,
          taxAmountCents: input.taxAmountCents,
          discountCents: input.discountCents,
          password: input.password,
          metadata: input.metadata,
        },
      });
    }),

  // Delete invoice (organization-scoped)
  delete: organizationProcedure
    .input(
      z.object({
        slug: z.string(),
        id: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return ctx.services.invoice.deleteInvoice({
        id: input.id,
        organizationId: ctx.organization.id,
      });
    }),
});
