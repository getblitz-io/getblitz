import type { ProviderMetadata } from "@getblitz/bank-providers";
import { ProviderRegistry } from "@getblitz/bank-providers";

import { createTRPCRouter, publicProcedure } from "../trpc";

export const providerRouter = createTRPCRouter({
  // List payments for user's organizations
  list: publicProcedure.query((): ProviderMetadata[] => {
    return ProviderRegistry.getAllProviderMetadata();
  }),
});
