import type { NextRequest } from "next/server";

import { getContainer } from "@getblitz/api";

import { ApiResponse } from "../../../api-response";
import { withApiAuth } from "../../../with-api-auth";

interface Params {
  id: string;
}

/**
 * @swagger
 * /invoices/{id}/finalize:
 *   post:
 *     summary: Finalize an invoice
 *     description: Mark a specific invoice as finalized.
 *     tags:
 *       - Invoices
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The invoice ID
 *     responses:
 *       200:
 *         description: Invoice finalized successfully
 *       400:
 *         description: Bad request (e.g. invalid state)
 *       500:
 *         description: Internal server error
 */
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
