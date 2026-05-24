import type { Organization } from "@getblitz/database";

interface TrpcHttpEnvelope {
  result: {
    data: Organization | { json: Organization };
  };
}

function isSuperjsonWrapped(
  data: Organization | { json: Organization },
): data is { json: Organization } {
  return "json" in data;
}

export function unwrapTrpcOrganization(response: unknown): Organization {
  const envelope = (
    Array.isArray(response) ? response[0] : response
  ) as TrpcHttpEnvelope;
  const data = envelope.result.data;
  return isSuperjsonWrapped(data) ? data.json : data;
}
