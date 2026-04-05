import type { NextRequest } from "next/server";

import { getContainer } from "@getblitz/api";

import { ApiResponse } from "../../../api-response";
import { withApiAuth } from "../../../with-api-auth";

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
      // Find session ID first
      let sessionId = idOrRef;
      if (authType === "ApiKey") {
        const session = await paymentSessionService.getSessionDetails({
          sessionId: idOrRef,
        });
        if (!session) {
          const byRef =
            await paymentSessionService.getSessionDetailsByReference({
              referenceId: idOrRef,
            });
          if (byRef) sessionId = byRef.sessionId;
        }
      }

      const result = await paymentSessionService.getQrCodeBase64({
        sessionId,
      });

      if (!result) {
        return ApiResponse.notFound(
          "Payment session not found or QR code generation failed",
          rateLimitHeaders,
        );
      }

      // Verify ownership
      const rawSession = await container.paymentSessionRepository.findById({
        id: sessionId,
      });

      if (!rawSession || rawSession.organizationId !== organizationId) {
        return ApiResponse.unauthorized(
          "Unauthorized access",
          rateLimitHeaders,
        );
      }

      return ApiResponse.success(result, rateLimitHeaders);
    } catch (error) {
      console.error("QR Code API Error:", error);
      return ApiResponse.internalError(
        "Internal server error",
        rateLimitHeaders,
      );
    }
  },
  { allowedAuthTypes: ["ApiKey", "ClientToken"] },
);
