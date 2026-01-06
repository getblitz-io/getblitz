import type { ProviderMetadata } from "@getblitz/bank-providers";
import { ProviderRegistry } from "@getblitz/bank-providers";

import { env } from "../env";
import { createTRPCRouter, publicProcedure } from "../trpc";

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
});
