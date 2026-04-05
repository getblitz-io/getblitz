import type { NextRequest } from "next/server";

import { getContainer } from "@getblitz/api";

import { ApiResponse } from "../api-response";
import { withApiAuth } from "../with-api-auth";

export const GET = withApiAuth(
  async (request: NextRequest, { organizationId, rateLimitHeaders }) => {
    const container = getContainer();
    const { organizationRepository } = container;

    try {
      const organization = await organizationRepository.findById({
        id: organizationId,
      });

      if (!organization) {
        return ApiResponse.notFound("Organization not found", rateLimitHeaders);
      }

      return ApiResponse.success(organization, rateLimitHeaders);
    } catch (error) {
      console.error("Failed to get organization:", error);
      return ApiResponse.internalError(
        "Internal server error",
        rateLimitHeaders,
      );
    }
  },
);
