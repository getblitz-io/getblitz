import type { Organization, Prisma } from "@getblitz/database";

import type { OrganizationWithDetails } from "..";

export interface IOrganizationRepository {
  findById({ id }: { id: string }): Promise<OrganizationWithDetails | null>;
  findBySlug({
    slug,
  }: {
    slug: string;
  }): Promise<OrganizationWithDetails | null>;
  findByUserId({ userId }: { userId: string }): Promise<Organization[]>;
  findMemberByUserAndOrg({
    userId,
    organizationId,
  }: {
    userId: string;
    organizationId: string;
  }): Promise<{ userId: string } | null>;
  update({
    id,
    data,
  }: {
    id: string;
    data: Prisma.OrganizationUpdateInput;
  }): Promise<OrganizationWithDetails>;
}
