import type { NextRequest } from "next/server";

import { getContainer } from "@getblitz/api";

import { ApiResponse } from "../api-response";
import { withApiAuth } from "../with-api-auth";

export const GET = withApiAuth(
  async (request: NextRequest, { organizationId, rateLimitHeaders }) => {
    const container = getContainer();
    const { bankAccountRepository } = container;

    try {
      const bankAccounts = await bankAccountRepository.findByOrganizationId({
        organizationId,
      });

      return ApiResponse.success(bankAccounts, rateLimitHeaders);
    } catch (error) {
      console.error("Failed to list bank accounts:", error);
      return ApiResponse.internalError(
        "Internal server error",
        rateLimitHeaders,
      );
    }
  },
);
