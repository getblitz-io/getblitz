import type { NextRequest } from "next/server";
import { z } from "zod";

import { getContainer } from "@getblitz/api";
import { CustomerFormSchema } from "@getblitz/validators";

import { ApiResponse } from "../api-response";
import { withApiAuth } from "../with-api-auth";

const querySchema = z.object({
  take: z.preprocess(
    (v) => parseInt(v as string, 10),
    z.number().min(1).max(100).default(50),
  ),
  skip: z.preprocess(
    (v) => parseInt(v as string, 10),
    z.number().min(0).default(0),
  ),
});

export const GET = withApiAuth(
  async (request: NextRequest, { organizationId, rateLimitHeaders }) => {
    const container = getContainer();
    const { customerService } = container;

    const { searchParams } = new URL(request.url);
    const parseResult = querySchema.safeParse(Object.fromEntries(searchParams));

    if (!parseResult.success) {
      return ApiResponse.error("Invalid query parameters", {
        details: parseResult.error.flatten(),
        headers: rateLimitHeaders,
      });
    }

    const { take, skip } = parseResult.data;

    try {
      const customers = await customerService.listCustomers(organizationId, {
        take,
        skip,
      });
      return ApiResponse.success(customers, rateLimitHeaders);
    } catch (error) {
      console.error("Failed to list customers:", error);
      return ApiResponse.internalError(
        "Internal server error",
        rateLimitHeaders,
      );
    }
  },
);

export const POST = withApiAuth(
  async (request: NextRequest, { organizationId, rateLimitHeaders }) => {
    const container = getContainer();
    const { customerService } = container;

    const body: unknown = await request.json();
    const parseResult = CustomerFormSchema.safeParse(body);

    if (!parseResult.success) {
      return ApiResponse.error("Invalid request body", {
        details: parseResult.error.flatten(),
        headers: rateLimitHeaders,
      });
    }

    try {
      const customer = await customerService.createCustomer({
        organizationId,
        ...parseResult.data,
      });

      return ApiResponse.created(customer, rateLimitHeaders);
    } catch (error) {
      console.error("Failed to create customer:", error);
      return ApiResponse.internalError(
        "Internal server error",
        rateLimitHeaders,
      );
    }
  },
);
