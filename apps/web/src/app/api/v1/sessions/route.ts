import type { NextRequest } from "next/server";
import { z } from "zod";

import { getContainer } from "@getblitz/api";

import { ApiResponse } from "../api-response";
import { withApiAuth } from "../with-api-auth";

const querySchema = z.object({
  take: z.preprocess(
    (v) => parseInt(v as string, 10),
    z.number().min(1).max(100).default(50),
  ),
});

export const GET = withApiAuth(
  async (request: NextRequest, { organizationId, rateLimitHeaders }) => {
    const container = getContainer();
    const { paymentSessionService } = container;

    const { searchParams } = new URL(request.url);
    const parseResult = querySchema.safeParse(Object.fromEntries(searchParams));

    if (!parseResult.success) {
      return ApiResponse.error("Invalid query parameters", {
        details: parseResult.error.flatten(),
        headers: rateLimitHeaders,
      });
    }

    const { take } = parseResult.data;

    try {
      const sessions = await paymentSessionService.listByOrgIds({
        orgIds: [organizationId],
        options: { take },
      });

      return ApiResponse.success(sessions, rateLimitHeaders);
    } catch (error) {
      console.error("Failed to list sessions:", error);
      return ApiResponse.internalError(
        "Internal server error",
        rateLimitHeaders,
      );
    }
  },
);
