import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { checkRateLimit, createRateLimitHeaders } from "@getblitz/api";

import { auth } from "~/auth/server";

export interface ApiAuthContext {
  organizationId: string;
  rateLimitHeaders: HeadersInit;
}

type ApiRouteHandler<TParams = void> = TParams extends void
  ? (request: NextRequest, context: ApiAuthContext) => Promise<NextResponse>
  : (
      request: NextRequest,
      context: ApiAuthContext,
      params: TParams,
    ) => Promise<NextResponse>;

/**
 * Wraps a Next.js route handler with API key authentication and rate limiting.
 *
 * The wrapper:
 * 1. Validates the `Authorization: Bearer <key>` header against the `org-key` config
 * 2. Checks the per-organization rate limit
 * 3. Calls the inner handler, injecting `{ organizationId, rateLimitHeaders }`
 *
 * @example
 * export const POST = withApiAuth(async (request, { organizationId, rateLimitHeaders }) => {
 *   const body = await request.json();
 *   return NextResponse.json({ ok: true }, { headers: rateLimitHeaders });
 * });
 *
 * // With dynamic route params:
 * export const GET = withApiAuth<{ sessionId: string }>(
 *   async (request, { organizationId }, params) => {
 *     return NextResponse.json({ sessionId: params.sessionId });
 *   },
 * );
 */
export function withApiAuth<TParams = void>(handler: ApiRouteHandler<TParams>) {
  return async function (
    request: NextRequest,
    routeContext?: { params?: Promise<TParams> },
  ): Promise<NextResponse> {
    // 1. Validate API Key
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const apiKey = authHeader.split("Bearer ")[1];

    if (!apiKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let keyResult;
    try {
      keyResult = await auth.api.verifyApiKey({
        body: {
          key: apiKey,
          configId: "org-keys",
        },
      });
    } catch (error) {
      console.error("[API Auth] API key verification failed:", error);
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    if (!keyResult.valid || !keyResult.key?.referenceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { referenceId: organizationId } = keyResult.key;

    // 2. Check rate limit
    const rateLimitResult = await checkRateLimit(`org:${organizationId}`);
    const rateLimitHeaders = createRateLimitHeaders(rateLimitResult);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429, headers: rateLimitHeaders },
      );
    }

    const apiContext: ApiAuthContext = { organizationId, rateLimitHeaders };

    // 3. Resolve route params (if any) and call the inner handler
    if (routeContext?.params) {
      const params = await routeContext.params;
      return (
        handler as (
          req: NextRequest,
          ctx: ApiAuthContext,
          p: TParams,
        ) => Promise<NextResponse>
      )(request, apiContext, params as TParams);
    }

    return (
      handler as (
        req: NextRequest,
        ctx: ApiAuthContext,
      ) => Promise<NextResponse>
    )(request, apiContext);
  };
}
