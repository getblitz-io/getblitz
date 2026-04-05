import type { NextRequest } from "next/server";

import { getContainer } from "@getblitz/api";
import { UpdateCustomerInputSchema } from "@getblitz/validators";

import { ApiResponse } from "../../api-response";
import { withApiAuth } from "../../with-api-auth";

interface Params {
  id: string;
}

/**
 * @swagger
 * /customers/{id}:
 *   get:
 *     summary: Get a customer by ID
 *     description: Retrieve a specific customer by their ID.
 *     tags:
 *       - Customers
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The customer ID
 *     responses:
 *       200:
 *         description: The customer details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Customer'
 *       404:
 *         description: Customer not found
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

/**
 * @swagger
 * /customers/{id}:
 *   patch:
 *     summary: Update a customer
 *     description: Update an existing customer's details.
 *     tags:
 *       - Customers
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The customer ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCustomerInput'
 *     responses:
 *       200:
 *         description: Customer updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Customer'
 *       400:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Customer not found
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

/**
 * @swagger
 * /customers/{id}:
 *   delete:
 *     summary: Delete a customer
 *     description: Delete a customer by their ID.
 *     tags:
 *       - Customers
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The customer ID
 *     responses:
 *       204:
 *         description: Customer deleted successfully (no content)
 *       404:
 *         description: Customer not found
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
