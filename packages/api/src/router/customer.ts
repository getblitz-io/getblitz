import { z } from "zod";

import {
  CustomerFormSchema,
  UpdateCustomerInputSchema,
} from "@getblitz/validators";

import { createTRPCRouter, organizationProcedure } from "../trpc";

export const customerRouter = createTRPCRouter({
  create: organizationProcedure
    .input(CustomerFormSchema)
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

  search: organizationProcedure
    .input(
      z.object({
        query: z.string().min(1).max(100),
        take: z.number().min(1).max(50).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.services.customer.searchCustomers({
        organizationId: ctx.organization.id,
        query: input.query,
        take: input.take,
      });
    }),

  get: organizationProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.services.customer.getCustomer(input.id);
    }),

  update: organizationProcedure
    .input(UpdateCustomerInputSchema.omit({ slug: true }))
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
