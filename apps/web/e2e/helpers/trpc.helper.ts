import type { Organization } from "@getblitz/database";

interface TrpcHttpEnvelope<T> {
  result: {
    data: T | { json: T };
  };
}

function isSuperjsonWrapped<T>(data: T | { json: T }): data is { json: T } {
  return data !== null && typeof data === "object" && "json" in data;
}

export function unwrapTrpcData<T>(response: unknown): T {
  const envelope = (
    Array.isArray(response) ? response[0] : response
  ) as TrpcHttpEnvelope<T>;
  const data = envelope.result.data;
  return isSuperjsonWrapped(data) ? data.json : data;
}

export function unwrapTrpcOrganization(response: unknown): Organization {
  return unwrapTrpcData<Organization>(response);
}
