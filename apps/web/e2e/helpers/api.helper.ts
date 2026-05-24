import superjson from "superjson";

import { env } from "~/env";
import { testAuth } from "./auth.helper";

export async function createTestApiKey(
  organizationId: string,
  headers: Headers,
  name = "Test Key",
): Promise<string> {
  const result = await testAuth.api.createApiKey({
    body: {
      organizationId,
      name,
      configId: "org-keys",
    },
    headers,
  });

  if (!result.key) {
    throw new Error("Failed to create test API key");
  }

  return result.key;
}

export class ApiTestClient {
  private baseUrl: string;

  constructor(baseUrl = env.NEXT_PUBLIC_APP_URL) {
    this.baseUrl = baseUrl;
  }

  async callTRPC(params: {
    path: string;
    type: "query" | "mutation";
    input?: unknown;
    cookieHeader: string;
  }): Promise<unknown> {
    const { path, type, input, cookieHeader } = params;
    const url = new URL(`${this.baseUrl}/api/trpc/${path}`);

    if (type === "query" && input !== undefined) {
      url.searchParams.set("input", JSON.stringify(superjson.serialize(input)));
    }

    const headers = new Headers({
      cookie: cookieHeader,
      "content-type": "application/json",
    });

    const init: RequestInit = {
      method: type === "query" ? "GET" : "POST",
      headers,
    };

    if (type === "mutation") {
      init.body = JSON.stringify(superjson.serialize(input ?? {}));
    }

    const response = await fetch(url.toString(), init);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `tRPC call failed with status ${response.status}: ${text}`,
      );
    }

    return response.json() as Promise<unknown>;
  }

  async callRestV1<T = unknown>(params: {
    path: string;
    method: "GET" | "POST" | "PUT" | "DELETE";
    body?: unknown;
    apiKey: string;
  }): Promise<T> {
    const { path, method, body, apiKey } = params;
    const headers = new Headers({
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    });

    const init: RequestInit = {
      method,
      headers,
    };

    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }

    const response = await fetch(`${this.baseUrl}/api/v1${path}`, init);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `REST V1 call failed with status ${response.status}: ${text}`,
      );
    }

    return response.json() as Promise<T>;
  }
}
