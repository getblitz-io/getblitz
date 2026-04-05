import type { NextRequest } from "next/server";

import { getContainer } from "@getblitz/api";
import { UpdateInvoiceInputSchema } from "@getblitz/validators";

import { ApiResponse } from "../../api-response";
import { withApiAuth } from "../../with-api-auth";

interface Params {
  id: string;
}

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

export const PATCH = withApiAuth<Params>(
  async (
    request: NextRequest,
    { organizationId, rateLimitHeaders },
    params,
  ) => {
    const container = getContainer();
    const { invoiceService } = container;

    const body = (await request.json()) as unknown;

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
