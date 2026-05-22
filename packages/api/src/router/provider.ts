import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { ProviderMetadata } from "@getblitz/bank-providers";
import { ProviderRegistry, WiseProvider } from "@getblitz/bank-providers";

import { env } from "../env";
import {
  createTRPCRouter,
  organizationProcedure,
  publicProcedure,
} from "../trpc";

const wiseRouter = createTRPCRouter({
  /**
   * List Wise profiles for a given API token.
   * Called by the WiseProfileSelector custom UI component during setup,
   * before credentials are persisted — requires org membership (not public).
   */
  listProfiles: organizationProcedure
    .input(
      z.object({
        apiToken: z.string().min(1),
        sandboxMode: z.boolean().default(false),
      }),
    )
    .query(async ({ input }) => {
      // Instantiate a fresh provider directly to call listProfiles
      // (bypasses the registry which requires full config/credentials)
      const provider = new WiseProvider();
      try {
        return await provider.listProfiles({
          apiToken: input.apiToken,
          sandboxMode: input.sandboxMode,
        });
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            error instanceof Error
              ? error.message
              : "Failed to fetch Wise profiles",
        });
      }
    }),
});

export const providerRouter = createTRPCRouter({
  // List available bank providers (filters test providers in production)
  list: publicProcedure.query((): ProviderMetadata[] => {
    const allProviders = ProviderRegistry.getAllProviderMetadata();

    // Filter out test providers in production environment
    if (env.APPLICATION_ENV === "production") {
      return allProviders.filter((provider) => !provider.isTestProvider);
    }

    return allProviders;
  }),

  wise: wiseRouter,
});
