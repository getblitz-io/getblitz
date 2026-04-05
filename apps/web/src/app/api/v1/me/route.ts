import type { NextRequest } from "next/server";

import { getContainer } from "@getblitz/api";

import { ApiResponse } from "../api-response";
import { withApiAuth } from "../with-api-auth";

/**
 * @swagger
 * /me:
 *   get:
 *     summary: Get current organization
 *     description: Retrieve details about the authenticated organization.
 *     tags:
 *       - Me
 *     responses:
 *       200:
 *         description: Organization details
 *       404:
 *         description: Organization not found
 *       500:
 *         description: Internal server error
 */
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
