import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  apiLogger,
  checkRateLimit,
  createRateLimitHeaders,
  getContainer,
} from "@getblitz/api";
import { CreateChallengeRequestSchema } from "@getblitz/shared-types";

import { env } from "~/env";

export async function POST(request: NextRequest) {
  try {
    const container = getContainer();
    const { apiKeyService, paymentSessionService } = container;

    // 1. Validate API Key
    const authHeader = request.headers.get("authorization");
    const keyValidation = await apiKeyService.validate({ authHeader });

    if (!keyValidation.valid || !keyValidation.organizationId) {
      return NextResponse.json(
        { error: keyValidation.error ?? "Unauthorized" },
        { status: 401 },
      );
    }

    const { organizationId } = keyValidation;

    // 2. Check rate limit (using organization ID as identifier)
    const rateLimitResult = await checkRateLimit(`org:${organizationId}`);
    const rateLimitHeaders = createRateLimitHeaders(rateLimitResult);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429, headers: rateLimitHeaders },
      );
    }

    // 3. Parse and validate request body
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

    // 4. Create payment challenge via service
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
  } catch (error) {
    apiLogger.error("Challenge API Error", { error: String(error) });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
