import type { NextRequest } from "next/server";

import { getContainer } from "@getblitz/api";
import { CreateChallengeRequestSchema } from "@getblitz/shared-types";

import { env } from "~/env";
import { ApiResponse } from "../api-response";
import { withApiAuth } from "../with-api-auth";

export const POST = withApiAuth(
  async (request: NextRequest, { organizationId, rateLimitHeaders }) => {
    const container = getContainer();
    const { paymentSessionService } = container;

    // 1. Parse and validate request body
    const body: unknown = await request.json();
    const parseResult = CreateChallengeRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return ApiResponse.error("Invalid request body", {
        details: parseResult.error.flatten(),
        headers: rateLimitHeaders,
      });
    }

    const {
      amount,
      currency,
      bankAccountId,
      merchantReferenceId,
      metadata,
      expiresInMinutes,
    } = parseResult.data;

    if (bankAccountId && typeof bankAccountId !== "string") {
      return ApiResponse.error("Bank account ID is required", {
        headers: rateLimitHeaders,
      });
    }

    // 2. Create payment challenge via service
    try {
      const result = await paymentSessionService.createChallenge({
        input: {
          organizationId,
          amount,
          currency,
          bankAccountId,
          merchantReferenceId,
          metadata,
          expiresInMinutes,
        },
        baseUrl: env.NEXT_PUBLIC_APP_URL,
      });

      return ApiResponse.success(result, rateLimitHeaders);
    } catch (error) {
      if (error instanceof Error) {
        return ApiResponse.error(error.message, { headers: rateLimitHeaders });
      }
      throw error;
    }
  },
);
