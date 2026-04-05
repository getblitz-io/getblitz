import type { NextRequest } from "next/server";

import { getContainer } from "@getblitz/api";

import { ApiResponse } from "../../../api-response";
import { withApiAuth } from "../../../with-api-auth";

interface Params {
  id: string;
}

export const POST = withApiAuth<Params>(
  async (
    request: NextRequest,
    { organizationId, rateLimitHeaders },
    params,
  ) => {
    const container = getContainer();
    const { invoiceService } = container;

    try {
      const result = await invoiceService.markInvoiceAsFinalized({
        organizationId,
        invoiceId: params.id,
      });

      return ApiResponse.success(result, rateLimitHeaders);
    } catch (error) {
      if (error instanceof Error) {
        return ApiResponse.error(error.message, {
          status: 400,
          headers: rateLimitHeaders,
        });
      }
      console.error("Failed to finalize invoice:", error);
      return ApiResponse.internalError(
        "Internal server error",
        rateLimitHeaders,
      );
    }
  },
);
