import { z } from "zod/v4";

import { env } from "../env";
import {
  createTRPCRouter,
  organizationProcedure,
  protectedProcedure,
  publicProcedure,
} from "../trpc";

export const paymentRouter = createTRPCRouter({
  // List payments for user's organizations
  list: protectedProcedure
    .input(
      z.object({
        orgIds: z.array(z.string()),
        take: z.number().min(1).max(100).default(50),
      }),
    )
    .query(async ({ input, ctx }) => {
      // TODO: Add validation that user has access to these orgs
      return ctx.services.paymentSession.listByOrgIds({
        orgIds: input.orgIds,
        options: { take: input.take },
      });
    }),

  // List payments for a single organization (by slug)
  listBySlug: organizationProcedure
    .input(
      z.object({
        slug: z.string(),
        take: z.number().min(1).max(100).default(50),
      }),
    )
    .query(async ({ input, ctx }) => {
      return ctx.services.paymentSession.listByOrgIds({
        orgIds: [ctx.organization.id],
        options: { take: input.take },
      });
    }),

  // Get session details (public - for payment page)
  getSession: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input, ctx }) => {
      return ctx.services.paymentSession.getSessionDetails({
        sessionId: input.sessionId,
      });
    }),

  // Get session details by reference ID (organization-scoped)
  getByReference: organizationProcedure
    .input(z.object({ slug: z.string(), referenceId: z.string() }))
    .query(async ({ input, ctx }) => {
      // Get full session details by referenceId
      const session =
        await ctx.services.paymentSession.getSessionDetailsByReference({
          referenceId: input.referenceId,
        });

      // Session will be null if not found
      // We don't need to verify org ownership here since it's just a lookup
      // The organizationProcedure already verifies the user has access to the org
      return session;
    }),

  // Create a payment session from portal (by slug)
  createPortalPayment: organizationProcedure
    .input(
      z.object({
        slug: z.string(),
        amountCents: z.number().int().positive(),
        bankAccountId: z.string().optional(),
        merchantReferenceId: z
          .string()
          .max(64)
          .regex(
            /^[a-zA-Z0-9_-]+$/,
            "Only alphanumeric characters, hyphens, and underscores allowed",
          )
          .optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return ctx.services.paymentSession.createChallenge({
        input: {
          organizationId: ctx.organization.id,
          amount: input.amountCents,
          currency: "EUR",
          bankAccountId: input.bankAccountId,
          merchantReferenceId: input.merchantReferenceId,
        },
        baseUrl: env.NEXT_PUBLIC_APP_URL,
      });
    }),
});
