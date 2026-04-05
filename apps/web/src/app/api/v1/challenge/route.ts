import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getContainer } from "@getblitz/api";
import { CreateChallengeRequestSchema } from "@getblitz/shared-types";

import { env } from "~/env";
import { ApiResponse } from "../api-response";
import { withApiAuth } from "../with-api-auth";

/**
 * @swagger
 * /challenge:
 *   post:
 *     summary: Create a payment challenge
 *     description: Create a payment challenge (payment session) for a bank account. Returns a payment URL and session details for directing customers to pay.
 *     tags:
 *       - Challenge
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateChallengeInput'
 *     responses:
 *       200:
 *         description: Payment challenge created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreateChallengeResponse'
 *       400:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
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
export const POST = withApiAuth(
  async (request: NextRequest, { organizationId, rateLimitHeaders }) => {
    const container = getContainer();
    const { paymentSessionService } = container;

    // 1. Parse and validate request body
    const bodyResult = await ApiResponse.parseBody(request);
    if (bodyResult instanceof NextResponse) return bodyResult;
    const body = bodyResult;

    const parseResult = CreateChallengeRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return ApiResponse.error("Invalid request body", {
        details: parseResult.error.flatten(),
        headers: rateLimitHeaders,
      });
    }

    const {
      amount,
      currency,
      bankAccountId,
      merchantReferenceId,
      metadata,
      expiresInMinutes,
      redirectUrl,
    } = parseResult.data;

    if (bankAccountId && typeof bankAccountId !== "string") {
      return ApiResponse.error("Bank account ID is required", {
        headers: rateLimitHeaders,
      });
    }

    // 2. Create payment challenge via service
    try {
      const result = await paymentSessionService.createChallenge({
        input: {
          organizationId,
          amount,
          currency,
          bankAccountId,
          merchantReferenceId,
          metadata,
          expiresInMinutes,
          redirectUrl,
        },
        baseUrl: env.NEXT_PUBLIC_APP_URL,
      });

      return ApiResponse.success(result, rateLimitHeaders);
    } catch (error) {
      if (error instanceof Error) {
        return ApiResponse.error(error.message, { headers: rateLimitHeaders });
      }
      throw error;
    }
  },
);
