import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getContainer } from "@getblitz/api";
import { UpdateInvoiceInputSchema } from "@getblitz/validators";

import { ApiResponse } from "../../api-response";
import { withApiAuth } from "../../with-api-auth";

interface Params {
  id: string;
}

/**
 * @swagger
 * /invoices/{id}:
 *   get:
 *     summary: Get an invoice by ID
 *     description: Retrieve a specific invoice by its ID.
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
 *         description: The invoice details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Invoice'
 *       404:
 *         description: Invoice not found
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
    { organizationId, rateLimitHeaders },
    params,
  ) => {
    const container = getContainer();
    const { invoiceService } = container;

    try {
      const invoice = await invoiceService.getInvoiceById({
        invoiceId: params.id,
      });

      if (invoice?.organizationId !== organizationId) {
        return ApiResponse.notFound("Invoice not found", rateLimitHeaders);
      }

      return ApiResponse.success(invoice, rateLimitHeaders);
    } catch (error) {
      console.error("Failed to get invoice:", error);
      return ApiResponse.internalError(
        "Internal server error",
        rateLimitHeaders,
      );
    }
  },
);

/**
 * @swagger
 * /invoices/{id}:
 *   patch:
 *     summary: Update an invoice
 *     description: Update an existing invoice's details.
 *     tags:
 *       - Invoices
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The invoice ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateInvoiceInput'
 *     responses:
 *       200:
 *         description: Invoice updated successfully
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
 *       404:
 *         description: Invoice not found
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
export const PATCH = withApiAuth<Params>(
  async (
    request: NextRequest,
    { organizationId, rateLimitHeaders },
    params,
  ) => {
    const container = getContainer();
    const { invoiceService } = container;

    const bodyResult = await ApiResponse.parseBody(request);
    if (bodyResult instanceof NextResponse) return bodyResult;
    const body = bodyResult;

    if (!body || typeof body !== "object") {
      return ApiResponse.error("Invalid request body");
    }

    const parseResult = UpdateInvoiceInputSchema.safeParse({
      ...(body as Record<string, unknown>),
      id: params.id,
    });

    if (!parseResult.success) {
      return ApiResponse.error("Invalid request body", {
        details: parseResult.error.flatten(),
        headers: rateLimitHeaders,
      });
    }

    try {
      const invoice = await invoiceService.updateInvoice({
        input: parseResult.data,
        organizationId,
      });

      return ApiResponse.success(invoice, rateLimitHeaders);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return ApiResponse.notFound("Invoice not found", rateLimitHeaders);
      }
      console.error("Failed to update invoice:", error);
      return ApiResponse.internalError(
        "Internal server error",
        rateLimitHeaders,
      );
    }
  },
);

/**
 * @swagger
 * /invoices/{id}:
 *   delete:
 *     summary: Delete an invoice
 *     description: Delete an invoice by its ID.
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
 *       204:
 *         description: Invoice deleted successfully (no content)
 *       404:
 *         description: Invoice not found
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
export const DELETE = withApiAuth<Params>(
  async (
    request: NextRequest,
    { organizationId, rateLimitHeaders },
    params,
  ) => {
    const container = getContainer();
    const { invoiceService } = container;

    try {
      await invoiceService.deleteInvoice({
        id: params.id,
        organizationId,
      });
      return ApiResponse.noContent(rateLimitHeaders);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return ApiResponse.notFound("Invoice not found", rateLimitHeaders);
      }
      console.error("Failed to delete invoice:", error);
      return ApiResponse.internalError(
        "Internal server error",
        rateLimitHeaders,
      );
    }
  },
);
