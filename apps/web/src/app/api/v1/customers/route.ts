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

/**
 * @swagger
 * /customers:
 *   get:
 *     summary: List customers
 *     description: Retrieve a list of customers with pagination.
 *     tags:
 *       - Customers
 *     parameters:
 *       - in: query
 *         name: take
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Number of records to return
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of records to skip
 *     responses:
 *       200:
 *         description: A list of customers
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
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

/**
 * @swagger
 * /customers:
 *   post:
 *     summary: Create a customer
 *     description: Create a new customer for the authenticated organization.
 *     tags:
 *       - Customers
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Customer created successfully
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
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
