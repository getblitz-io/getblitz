import { expect, test } from "../fixtures/auth.fixture";
import { ApiTestClient, createTestApiKey } from "../helpers/api.helper";
import { unwrapTrpcOrganization } from "../helpers/trpc.helper";

interface RestCustomer {
  id: string;
  name: string;
  email: string;
  address: string;
  taxId: string;
}

test.describe("Backend APIs", () => {
  const client = new ApiTestClient();

  test("should communicate with tRPC router using session cookies", async ({
    session,
    organization,
  }) => {
    const response = await client.callTRPC({
      path: "organization.getBySlug",
      type: "query",
      input: { slug: organization.slug },
      cookieHeader: session.cookieHeader,
    });

    const orgDetails = unwrapTrpcOrganization(response);

    expect(orgDetails.id).toBe(organization.id);
    expect(orgDetails.slug).toBe(organization.slug);
    expect(orgDetails.name).toBe(organization.name);
  });

  test("should authenticate and process REST v1 endpoints using API keys", async ({
    session,
    organization,
  }) => {
    const apiKey = await createTestApiKey(
      organization.id,
      session.headers,
      "E2E Test API Key",
    );
    expect(apiKey.startsWith("sk_")).toBe(true);

    const customerPayload = {
      name: "E2E REST Customer",
      email: `rest-${Date.now()}-${Math.floor(Math.random() * 1000000)}@e2e.getblitz.io`,
      address: "456 E2E Road, API Land",
      taxId: "VAT-E2E-987",
    };

    const createdCustomer = await client.callRestV1<RestCustomer>({
      path: "/customers",
      method: "POST",
      body: customerPayload,
      apiKey,
    });

    expect(createdCustomer.id).toBeDefined();
    expect(createdCustomer.name).toBe(customerPayload.name);
    expect(createdCustomer.email).toBe(customerPayload.email);
    expect(createdCustomer.address).toBe(customerPayload.address);
    expect(createdCustomer.taxId).toBe(customerPayload.taxId);

    const customers = await client.callRestV1<RestCustomer[]>({
      path: "/customers?take=50&skip=0",
      method: "GET",
      apiKey,
    });

    expect(Array.isArray(customers)).toBe(true);

    const found = customers.find((c) => c.id === createdCustomer.id);
    expect(found).toBeDefined();
    expect(found?.name).toBe(customerPayload.name);
    expect(found?.email).toBe(customerPayload.email);
  });
});
