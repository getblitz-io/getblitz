import type { NextRequest } from "next/server";

import { getContainer } from "@getblitz/api";

import { ApiResponse } from "../api-response";
import { withApiAuth } from "../with-api-auth";

/**
 * @swagger
 * /bank-accounts:
 *   get:
 *     summary: List bank accounts
 *     description: Retrieve a list of all bank accounts connected to the authenticated organization.
 *     tags:
 *       - Bank Accounts
 *     responses:
 *       200:
 *         description: A list of bank accounts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/BankAccount'
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
