import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  CreateInvoiceInputSchema,
  UpdateInvoiceInputSchema,
} from "@getblitz/validators";

import { env } from "../env";
import {
  createTRPCRouter,
  deviceMiddleware,
  organizationProcedure,
  publicProcedure,
} from "../trpc";

export const invoiceRouter = createTRPCRouter({
  // Create invoice (organization-scoped)
  create: organizationProcedure
    .input(CreateInvoiceInputSchema)
    .mutation(async ({ input, ctx }) => {
      return ctx.services.invoice.createInvoice({
        input,
        organizationId: ctx.organization.id,
        baseUrl: env.NEXT_PUBLIC_APP_URL,
      });
    }),

  getById: organizationProcedure
    .input(z.object({ invoiceId: z.string() }))
    .query(async ({ input, ctx }) => {
      return ctx.services.invoice.getInvoiceById({
        invoiceId: input.invoiceId,
      });
    }),

  // Get invoice by Reference ID (public)
  getByReference: publicProcedure
    .use(deviceMiddleware)
    .input(
      z.object({
        referenceId: z.string(),
        password: z.string().optional(),
        previewToken: z.string().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      let mode: "public" | "preview" = "public";

      if (input.previewToken) {
        if (!ctx.session?.user) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Preview requires authentication",
          });
        }
        const previewResult =
          await ctx.services.previewService.verifyPreviewToken({
            previewToken: input.previewToken,
            userId: ctx.session.user.id,
          });

        if (!previewResult) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid preview token",
          });
        }
        mode = "preview";
      }

      return ctx.services.invoice.getInvoiceByReference({
        referenceId: input.referenceId,
        password: input.password,
        mode,
        deviceDetails: ctx.deviceDetails,
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

  finalize: organizationProcedure
    .input(z.object({ slug: z.string(), id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return ctx.services.invoice.markInvoiceAsFinalized({
        invoiceId: input.id,
        organizationId: ctx.organization.id,
      });
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
    .input(UpdateInvoiceInputSchema)
    .mutation(async ({ input, ctx }) => {
      return ctx.services.invoice.updateInvoice({
        input,
        organizationId: ctx.organization.id,
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
