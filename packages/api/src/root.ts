import { authRouter } from "./router/auth";
import { customerRouter } from "./router/customer";
import { invoiceRouter } from "./router/invoice";
import { organizationRouter } from "./router/organization";
import { paymentRouter } from "./router/payment";
import { previewRouter } from "./router/preview";
import { providerRouter } from "./router/provider";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  organization: organizationRouter,
  payment: paymentRouter,
  provider: providerRouter,
  invoice: invoiceRouter,
  customer: customerRouter,
  preview: previewRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
