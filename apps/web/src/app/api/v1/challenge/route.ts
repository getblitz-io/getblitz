import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getContainer } from "@getblitz/api";
import { CreateChallengeRequestSchema } from "@getblitz/shared-types";

import { env } from "~/env";
import { withApiAuth } from "../with-api-auth";

export const POST = withApiAuth(
  async (request: NextRequest, { organizationId, rateLimitHeaders }) => {
    const container = getContainer();
    const { paymentSessionService } = container;

    // 1. Parse and validate request body
    const body: unknown = await request.json();
    const parseResult = CreateChallengeRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parseResult.error.flatten() },
        { status: 400 },
      );
    }

    const { amount, currency, bankAccountId } = parseResult.data;

    if (bankAccountId && typeof bankAccountId !== "string") {
      return NextResponse.json(
        { error: "Bank account ID is required" },
        { status: 400 },
      );
    }

    // 2. Create payment challenge via service
    try {
      const result = await paymentSessionService.createChallenge({
        input: {
          organizationId,
          amount,
          currency,
          bankAccountId: bankAccountId ?? undefined,
        },
        baseUrl: env.NEXT_PUBLIC_APP_URL,
      });

      return NextResponse.json(result, { headers: rateLimitHeaders });
    } catch (error) {
      if (error instanceof Error) {
        return NextResponse.json(
          { error: error.message },
          { status: 400, headers: rateLimitHeaders },
        );
      }
      throw error;
    }
  },
);
