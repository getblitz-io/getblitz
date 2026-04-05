import type { NextRequest } from "next/server";

import { getContainer } from "@getblitz/api";

import { ApiResponse } from "../../api-response";
import { withApiAuth } from "../../with-api-auth";

interface Params {
  sessionId: string;
}

export const GET = withApiAuth<Params>(
  async (
    request: NextRequest,
    { organizationId, rateLimitHeaders, authType },
    params,
  ) => {
    const container = getContainer();
    const { paymentSessionService } = container;
    const { sessionId: idOrRef } = params;

    try {
      let sessionDetails = await paymentSessionService.getSessionDetails({
        sessionId: idOrRef,
      });

      // If not found by ID and it's an ApiKey request, try by referenceId
      if (!sessionDetails && authType === "ApiKey") {
        sessionDetails =
          await paymentSessionService.getSessionDetailsByReference({
            referenceId: idOrRef,
          });
      }

      if (!sessionDetails) {
        return ApiResponse.notFound(
          "Payment session not found",
          rateLimitHeaders,
        );
      }

      // Verify ownership
      const rawSession = await container.paymentSessionRepository.findById({
        id: sessionDetails.sessionId,
      });

      if (!rawSession || rawSession.organizationId !== organizationId) {
        return ApiResponse.unauthorized(
          "Unauthorized access",
          rateLimitHeaders,
        );
      }

      return ApiResponse.success(sessionDetails, rateLimitHeaders);
    } catch (error) {
      console.error("Session Details API Error:", error);
      return ApiResponse.internalError(
        "Internal server error",
        rateLimitHeaders,
      );
    }
  },
  { allowedAuthTypes: ["ApiKey", "ClientToken"] },
);
