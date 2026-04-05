import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export interface ApiResponseOptions {
  status?: number;
  headers?: HeadersInit;
}

/**
 * Unified API Response helper to standardize response format and headers.
 */
export class ApiResponse {
  /**
   * Generic JSON response
   */
  static json<T>(
    data: T,
    options: ApiResponseOptions = {},
  ): NextResponse<T | { error: string; details?: unknown }> {
    return NextResponse.json(data, {
      status: options.status ?? 200,
      headers: options.headers,
    });
  }

  /**
   * Safely parse request body and return 400 response on failure.
   */
  static async parseBody<T>(request: NextRequest): Promise<T | NextResponse> {
    try {
      return (await request.json()) as T;
    } catch {
      return this.error("Invalid JSON body");
    }
  }

  /**
   * Success response (200 OK)
   */
  static success<T>(data: T, headers?: HeadersInit): NextResponse<T> {
    return this.json(data, { status: 200, headers }) as NextResponse<T>;
  }

  /**
   * Created response (201 Created)
   */
  static created<T>(data: T, headers?: HeadersInit): NextResponse<T> {
    return this.json(data, { status: 201, headers }) as NextResponse<T>;
  }

  /**
   * No Content response (204 No Content)
   */
  static noContent(headers?: HeadersInit): NextResponse<null> {
    return new NextResponse(null, { status: 204, headers });
  }

  /**
   * Error response
   */
  static error(
    message: string,
    options: ApiResponseOptions & { details?: unknown } = {},
  ): NextResponse<{ error: string; details?: unknown }> {
    return this.json(
      {
        error: message,
        ...(options.details !== undefined ? { details: options.details } : {}),
      },
      {
        status: options.status ?? 400,
        headers: options.headers,
      },
    ) as NextResponse<{ error: string; details?: unknown }>;
  }

  /**
   * Unauthorized response (401)
   */
  static unauthorized(message = "Unauthorized", headers?: HeadersInit) {
    return this.error(message, { status: 401, headers });
  }

  /**
   * Forbidden response (403)
   */
  static forbidden(message = "Forbidden", headers?: HeadersInit) {
    return this.error(message, { status: 403, headers });
  }

  /**
   * Not Found response (404)
   */
  static notFound(message = "Resource not found", headers?: HeadersInit) {
    return this.error(message, { status: 404, headers });
  }

  /**
   * Rate Limit response (429)
   */
  static rateLimitExceeded(
    message = "Rate limit exceeded",
    headers?: HeadersInit,
  ) {
    return this.error(message, { status: 429, headers });
  }

  /**
   * Internal Server Error response (500)
   */
  static internalError(
    message = "Internal server error",
    headers?: HeadersInit,
  ) {
    return this.error(message, { status: 500, headers });
  }
}
