import type { NextRequest } from "next/server";

import { getContainer } from "@getblitz/api";

import { ApiResponse } from "../../../api-response";
import { withApiAuth } from "../../../with-api-auth";

interface Params {
  sessionId: string;
}

/**
 * @swagger
 * /sessions/{sessionId}/qr-code:
 *   get:
 *     summary: Get session QR code
 *     description: Retrieve the base64 encoded QR code image for a specific payment session. The QR code encodes the payment URL for easy scanning.
 *     tags:
 *       - Sessions
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: The session UUID or merchant reference ID
 *     responses:
 *       200:
 *         description: Base64 encoded QR code image
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QrCodeResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Session or QR code not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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
