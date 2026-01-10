import type { OrganizationSecretKey } from "@getblitz/database";

import type { ApiKeyWithOrganization } from "..";

export interface IApiKeyRepository {
  findBySecretKey({
    secretKey,
  }: {
    secretKey: string;
  }): Promise<{ id: string; organizationId: string } | null>;
  create({
    organizationId,
  }: {
    organizationId: string;
  }): Promise<OrganizationSecretKey>;
  delete({ id }: { id: string }): Promise<OrganizationSecretKey>;
  updateLastUsed({ id }: { id: string }): void;
  findByIdWithOrganization({
    id,
  }: {
    id: string;
  }): Promise<ApiKeyWithOrganization | null>;
}
