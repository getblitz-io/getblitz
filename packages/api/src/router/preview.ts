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
