import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, organizationProcedure } from "../trpc";

export const previewRouter = createTRPCRouter({
  createToken: organizationProcedure
    .input(
      z.object({
        resourceType: z.literal("invoice"), // Restricted to invoice for now
        resourceId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const invoice = await ctx.prisma.invoice.findFirst({
        where: { id: input.resourceId, organizationId: ctx.organization.id },
        select: { id: true },
      });
      if (!invoice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      // Create preview token
      const token = await ctx.services.previewService.createPreviewToken({
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        organizationId: ctx.organization.id,
        userId: ctx.session.user.id,
      });

      return { token };
    }),
});
