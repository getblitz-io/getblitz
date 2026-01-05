/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1)
 * 2. You want to create a new middleware or type of procedure (see Part 3)
 *
 * tl;dr - this is where all the tRPC server stuff is created and plugged in.
 * The pieces you will need to use are documented accordingly near the end
 */
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { z, ZodError } from "zod";

import type { Auth, Session } from "@getblitz/auth";
import type { PrismaClient } from "@getblitz/database";

import type { ApiKeyService } from "./services/api-key.service";
import type { BankConnectionService } from "./services/bank-connection.service";
import type { CredentialCacheService } from "./services/credential-cache.service";
import type { CredentialManagerService } from "./services/credential-manager.service";
import type { OrganizationService } from "./services/organization.service";
import type { PaymentSessionService } from "./services/payment-session.service";
import type { PaymentSettlementService } from "./services/payment-settlement.service";
import type { SecurityService } from "./services/security.service";
import type { WebhookService } from "./services/webhook.service";
import { getContainer } from "./container";

/**
 * Services interface for type-safe access in procedures
 */
export interface TRPCServices {
  organization: OrganizationService;
  paymentSession: PaymentSessionService;
  paymentSettlement: PaymentSettlementService;

  apiKey: ApiKeyService;
  webhook: WebhookService;
  security: SecurityService;
  credentialCache: CredentialCacheService;
  credentialManager: CredentialManagerService;
  bankConnection: BankConnectionService;
}

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */

export const createTRPCContext = async (opts: {
  headers: Headers;
  auth: Auth;
}): Promise<{
  session: Session | null;
  services: TRPCServices;
  prisma: PrismaClient;
}> => {
  const session = await opts.auth.api.getSession({
    headers: opts.headers,
  });

  // Get services from DI container
  const container = getContainer();

  return {
    session,
    services: {
      organization: container.organizationService,
      paymentSession: container.paymentSessionService,
      paymentSettlement: container.paymentSettlementService,
      apiKey: container.apiKeyService,
      webhook: container.webhookService,
      security: container.securityService,
      credentialCache: container.credentialCacheService,
      credentialManager: container.credentialManagerService,
      bankConnection: container.bankConnectionService,
    },
    prisma: container.prisma,
  };
};
/**
 * 2. INITIALIZATION
 *
 * This is where the trpc api is initialized, connecting the context and
 * transformer
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter: ({ shape, error }) => ({
    ...shape,
    data: {
      ...shape.data,
      zodError:
        error.cause instanceof ZodError
          ? z.flattenError(error.cause as ZodError<Record<string, unknown>>)
          : null,
    },
  }),
});

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these
 * a lot in the /src/server/api/routers folder
 */

/**
 * This is how you create new routers and subrouters in your tRPC API
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Middleware for timing procedure execution and adding an articifial delay in development.
 *
 * You can remove this if you don't like it, but it can help catch unwanted waterfalls by simulating
 * network latency that would occur in production but not in local development.
 */
const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  if (t._config.isDev) {
    // artificial delay in dev 100-500ms
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const result = await next();

  const end = Date.now();
  console.log(`[TRPC] ${path} took ${end - start}ms to execute`);

  return result;
});

/**
 * Public (unauthed) procedure
 *
 * This is the base piece you use to build new queries and mutations on your
 * tRPC API. It does not guarantee that a user querying is authorized, but you
 * can still access user session data if they are logged in
 */
export const publicProcedure = t.procedure.use(timingMiddleware);

/**
 * Protected (authenticated) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use this. It verifies
 * the session is valid and guarantees `ctx.session.user` is not null.
 *
 * @see https://trpc.io/docs/procedures
 */
export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next({
      ctx: {
        // infers the `session` as non-nullable
        session: { ...ctx.session, user: ctx.session.user },
      },
    });
  });

/**
 * Organization middleware
 *
 * Resolves organization from slug or orgId in the input and validates user membership.
 * Adds `ctx.organization` for procedures that need org context.
 */
export const organizationProcedure = protectedProcedure
  .input(z.object({ slug: z.string() }))
  .use(async ({ ctx, next, input }) => {
    const slug = input.slug;
    const organization = await ctx.services.organization.getBySlug({
      slug,
      userId: ctx.session.user.id,
    });

    return next({ ctx: { ...ctx, organization } });
  });
