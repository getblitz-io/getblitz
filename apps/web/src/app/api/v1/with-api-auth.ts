import type { NextRequest, NextResponse } from "next/server";

import {
  checkRateLimit,
  createRateLimitHeaders,
  getContainer,
} from "@getblitz/api";

import { auth } from "~/auth/server";
import { env } from "~/env";
import { ApiResponse } from "./api-response";

export type AuthType = "ApiKey" | "ClientToken";

export interface ApiAuthContext {
  organizationId: string;
  rateLimitHeaders: HeadersInit;
  authType: AuthType;
  clientToken?: string;
  origin?: string;
}

type ApiRouteHandler<TParams = void> = TParams extends void
  ? (request: NextRequest, context: ApiAuthContext) => Promise<NextResponse>
  : (
      request: NextRequest,
      context: ApiAuthContext,
      params: TParams,
    ) => Promise<NextResponse>;

export interface WithApiAuthOptions {
  /**
   * Allowed authentication types.
   * @default ["ApiKey"]
   */
  allowedAuthTypes?: AuthType[];
}

/**
 * Wraps a Next.js route handler with API key authentication and rate limiting.
 * Also supports Client Token authentication for SDK-facing endpoints.
 */
export function withApiAuth<TParams = void>(
  handler: ApiRouteHandler<TParams>,
  options: WithApiAuthOptions = {},
) {
  const allowedAuthTypes = options.allowedAuthTypes ?? ["ApiKey"];

  return async function (
    request: NextRequest,
    routeContext?: { params?: Promise<TParams> },
  ): Promise<NextResponse> {
    // 1. Get Authorization Header
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return ApiResponse.unauthorized("Authorization header is required");
    }
    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      return ApiResponse.unauthorized("Bearer token is required");
    }

    let organizationId: string | undefined;
    let authType: AuthType | undefined;

    // 2. Try API Key verification (if allowed)
    if (allowedAuthTypes.includes("ApiKey")) {
      try {
        const keyResult = await auth.api.verifyApiKey({
          body: {
            key: token,
            configId: "org-keys",
          },
        });

        if (keyResult.valid && keyResult.key?.referenceId) {
          organizationId = keyResult.key.referenceId;
          authType = "ApiKey";
        }
      } catch (error) {
        console.error("Failed to verify API key:", error);
        // Not a valid API key, might be a client token
      }
    }

    // 3. Try Client Token verification (if allowed and API key didn't match)
    const origin = request.headers.get("Origin") ?? "";
    if (
      !organizationId &&
      allowedAuthTypes.includes("ClientToken") &&
      routeContext?.params
    ) {
      const params = (await routeContext.params) as unknown;

      // Helper to safely extract ID from unknown params
      const getSessionId = (p: unknown): string | undefined => {
        if (p && typeof p === "object") {
          const record = p as Record<string, unknown>;
          if (typeof record.sessionId === "string") return record.sessionId;
          if (typeof record.id === "string") return record.id;
        }
        return undefined;
      };

      const sessionId = getSessionId(params);

      if (sessionId) {
        const container = getContainer();
        const { paymentSessionService } = container;

        try {
          // This verifies the token and checks origins/session ownership
          await paymentSessionService.verifySessionAccess({
            sessionId,
            clientToken: token,
            origin,
          });

          // Extract orgId from token (it's encoded in the JWT)
          const { jwtVerify } = await import("jose");

          const secret = new TextEncoder().encode(env.ENCRYPTION_KEY);
          const { payload } = await jwtVerify(token, secret);

          organizationId = payload.organizationId as string;
          authType = "ClientToken";
        } catch (error) {
          console.error("Failed to verify client token:", error);
          // Verification failed
        }
      }
    }

    if (!organizationId || !authType) {
      return ApiResponse.unauthorized("Invalid or expired authentication");
    }

    // 4. Check rate limit (only for ApiKey for now, or unified for organization)
    const rateLimitResult = await checkRateLimit(`org:${organizationId}`);
    const rateLimitHeaders = createRateLimitHeaders(rateLimitResult);

    if (!rateLimitResult.success) {
      return ApiResponse.rateLimitExceeded(
        "Rate limit exceeded. Please try again later.",
        rateLimitHeaders,
      );
    }

    const apiContext: ApiAuthContext = {
      organizationId,
      rateLimitHeaders,
      authType,
      clientToken: authType === "ClientToken" ? token : undefined,
      origin: authType === "ClientToken" ? origin : undefined,
    };

    // 5. Resolve route params (if any) and call the inner handler
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
