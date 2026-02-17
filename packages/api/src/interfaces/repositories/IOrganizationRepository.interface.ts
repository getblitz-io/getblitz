import type { Organization, Prisma } from "@getblitz/database";

import type { OrganizationCounts, OrganizationWithDetails } from "..";

export interface IOrganizationRepository {
  findById({ id }: { id: string }): Promise<OrganizationWithDetails | null>;
  findBySlug({
    slug,
  }: {
    slug: string;
  }): Promise<OrganizationWithDetails | null>;
  findByUserId({ userId }: { userId: string }): Promise<Organization[]>;
  getCountsByOrgIds({
    orgIds,
  }: {
    orgIds: string[];
  }): Promise<OrganizationCounts[]>;
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
