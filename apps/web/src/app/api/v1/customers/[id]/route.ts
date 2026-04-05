import type { NextRequest } from "next/server";

import { getContainer } from "@getblitz/api";
import { UpdateCustomerInputSchema } from "@getblitz/validators";

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
    const { customerService } = container;

    try {
      const customer = await customerService.getCustomer(params.id);

      if (customer?.organizationId !== organizationId) {
        return ApiResponse.notFound("Customer not found", rateLimitHeaders);
      }

      return ApiResponse.success(customer, rateLimitHeaders);
    } catch (error) {
      console.error("Failed to get customer:", error);
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
    const { customerService } = container;

    const body = (await request.json()) as unknown;

    if (!body || typeof body !== "object") {
      return ApiResponse.error("Invalid request body");
    }

    const parseResult = UpdateCustomerInputSchema.safeParse({
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
      const customer = await customerService.updateCustomer({
        organizationId,
        ...parseResult.data,
      });

      return ApiResponse.success(customer, rateLimitHeaders);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return ApiResponse.notFound("Customer not found", rateLimitHeaders);
      }
      console.error("Failed to update customer:", error);
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
    const { customerService } = container;

    try {
      await customerService.deleteCustomer(params.id, organizationId);
      return ApiResponse.noContent(rateLimitHeaders);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return ApiResponse.notFound("Customer not found", rateLimitHeaders);
      }
      console.error("Failed to delete customer:", error);
      return ApiResponse.internalError(
        "Internal server error",
        rateLimitHeaders,
      );
    }
  },
);
