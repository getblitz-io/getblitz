import type { NextRequest } from "next/server";

import { getContainer } from "@getblitz/api";

import { env } from "~/env";
import { ApiResponse } from "../../../api-response";
import { withApiAuth } from "../../../with-api-auth";

interface Params {
  sessionId: string;
}

/**
 * @swagger
 * /sessions/{sessionId}/simulate-payment:
 *   post:
 *     summary: Simulate a payment (Dev only)
 *     description: Simulate a successful payment for a session. Only available in development environment.
 *     tags:
 *       - Sessions
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: The session ID
 *     responses:
 *       200:
 *         description: Payment simulation successful
 *       400:
 *         description: Simulation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Not in development mode)
 *       500:
 *         description: Internal server error
 */
export const POST = withApiAuth<Params>(
  async (
    request: NextRequest,
    { organizationId, rateLimitHeaders, authType },
    params,
  ) => {
    if (env.NODE_ENV !== "development") {
      return ApiResponse.forbidden(
        "This endpoint is only available in development mode",
        rateLimitHeaders,
      );
    }

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

      const result = await paymentSessionService.simulatePayment({ sessionId });

      if (!result.success) {
        return ApiResponse.error(result.error ?? "Simulation failed", {
          status: 400,
          headers: rateLimitHeaders,
        });
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

      return ApiResponse.success(
        {
          success: true,
          message: result.message,
          sessionId: result.sessionId,
        },
        rateLimitHeaders,
      );
    } catch (error) {
      console.error("Simulate payment error:", error);
      return ApiResponse.internalError(
        "Internal server error",
        rateLimitHeaders,
      );
    }
  },
  { allowedAuthTypes: ["ApiKey", "ClientToken"] },
);
