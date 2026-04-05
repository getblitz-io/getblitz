import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getContainer } from "@getblitz/api";
import { CreateInvoiceInputSchema } from "@getblitz/validators";

import { env } from "~/env";
import { ApiResponse } from "../api-response";
import { withApiAuth } from "../with-api-auth";

const querySchema = z.object({
  take: z.preprocess(
    (v) => parseInt(v as string, 10),
    z.number().min(1).max(100).default(50),
  ),
});

/**
 * @swagger
 * /invoices:
 *   get:
 *     summary: List invoices
 *     description: Retrieve a list of invoices with pagination.
 *     tags:
 *       - Invoices
 *     parameters:
 *       - in: query
 *         name: take
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Number of records to return
 *     responses:
 *       200:
 *         description: A list of invoices
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Invoice'
 *       400:
 *         description: Invalid query parameters
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
export const GET = withApiAuth(
  async (request: NextRequest, { organizationId, rateLimitHeaders }) => {
    const container = getContainer();
    const { invoiceService } = container;

    const { searchParams } = new URL(request.url);
    const parseResult = querySchema.safeParse(Object.fromEntries(searchParams));

    if (!parseResult.success) {
      return ApiResponse.error("Invalid query parameters", {
        details: parseResult.error.flatten(),
        headers: rateLimitHeaders,
      });
    }

    const { take } = parseResult.data;

    try {
      const invoices = await invoiceService.listByOrgIds({
        orgIds: [organizationId],
        options: { take },
      });

      return ApiResponse.success(invoices, rateLimitHeaders);
    } catch (error) {
      console.error("Failed to list invoices:", error);
      return ApiResponse.internalError(
        "Internal server error",
        rateLimitHeaders,
      );
    }
  },
);

/**
 * @swagger
 * /invoices:
 *   post:
 *     summary: Create an invoice
 *     description: Create a new invoice for the authenticated organization.
 *     tags:
 *       - Invoices
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateInvoiceInput'
 *     responses:
 *       201:
 *         description: Invoice created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Invoice'
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
    const { invoiceService } = container;

    const bodyResult = await ApiResponse.parseBody(request);
    if (bodyResult instanceof NextResponse) return bodyResult;
    const body = bodyResult;

    const parseResult = CreateInvoiceInputSchema.safeParse(body);

    if (!parseResult.success) {
      return ApiResponse.error("Invalid request body", {
        details: parseResult.error.flatten(),
        headers: rateLimitHeaders,
      });
    }

    try {
      const result = await invoiceService.createInvoice({
        input: parseResult.data,
        organizationId,
        baseUrl: env.NEXT_PUBLIC_APP_URL,
      });

      return ApiResponse.created(result, rateLimitHeaders);
    } catch (error) {
      if (error instanceof Error) {
        return ApiResponse.error(error.message, { headers: rateLimitHeaders });
      }
      console.error("Failed to create invoice:", error);
      return ApiResponse.internalError(
        "Internal server error",
        rateLimitHeaders,
      );
    }
  },
);
