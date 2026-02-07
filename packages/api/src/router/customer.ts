import { z } from "zod";

import { createTRPCRouter, organizationProcedure } from "../trpc";

export const customerRouter = createTRPCRouter({
  create: organizationProcedure
    .input(
      z.object({
        email: z.email(),
        name: z.string().min(1).optional(),
        address: z.string().optional(),
        taxId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.services.customer.createCustomer({
        organizationId: ctx.organization.id,
        ...input,
      });
    }),

  list: organizationProcedure
    .input(
      z.object({
        take: z.number().min(1).max(100).default(50),
        skip: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.services.customer.listCustomers(ctx.organization.id, input);
    }),

  get: organizationProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.services.customer.getCustomer(input.id);
    }),

  update: organizationProcedure
    .input(
      z.object({
        id: z.string(),
        email: z.email().optional(),
        name: z.string().min(1).optional(),
        address: z.string().optional(),
        taxId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.services.customer.updateCustomer({
        organizationId: ctx.organization.id,
        ...input,
      });
    }),

  delete: organizationProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.services.customer.deleteCustomer(
        input.id,
        ctx.organization.id,
      );
    }),
});
