import { authRouter } from "./router/auth";
import { organizationRouter } from "./router/organization";
import { paymentRouter } from "./router/payment";
import { providerRouter } from "./router/provider";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  organization: organizationRouter,
  payment: paymentRouter,
  provider: providerRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
