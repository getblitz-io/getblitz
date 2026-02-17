import type { OrganizationBankConnection, Prisma } from "@getblitz/database";

import type { CreateOrganizationBankConnectionInput } from "..";

export interface IOrganizationBankConnectionRepository {
  findById({
    id,
    include,
  }: {
    id: string;
    include?: Prisma.OrganizationBankConnectionInclude;
  }): Promise<Prisma.OrganizationBankConnectionGetPayload<{
    include?: Prisma.OrganizationBankConnectionInclude;
  }> | null>;
  findOne({
    where,
    include,
  }: {
    where: Prisma.OrganizationBankConnectionWhereInput;
    include?: Prisma.OrganizationBankConnectionInclude;
  }): Promise<Prisma.OrganizationBankConnectionGetPayload<{
    include?: Prisma.OrganizationBankConnectionInclude;
  }> | null>;
  findByOrganizationIdAndProviderId({
    organizationId,
    providerId,
    include,
  }: {
    organizationId: string;
    providerId: string;
    include?: Prisma.OrganizationBankConnectionInclude;
  }): Promise<Prisma.OrganizationBankConnectionGetPayload<{
    include?: Prisma.OrganizationBankConnectionInclude;
  }> | null>;
  findByOrganizationId({
    organizationId,
  }: {
    organizationId: string;
  }): Promise<OrganizationBankConnection[]>;
  create({
    data,
  }: {
    data: CreateOrganizationBankConnectionInput;
  }): Promise<OrganizationBankConnection>;
  update({
    id,
    data,
  }: {
    id: string;
    data: Partial<
      Omit<
        CreateOrganizationBankConnectionInput,
        "organizationId" | "providerId"
      >
    >;
  }): Promise<OrganizationBankConnection>;
  delete({ id }: { id: string }): Promise<OrganizationBankConnection>;
  updateMany({
    where,
    data,
  }: {
    where: Prisma.OrganizationBankConnectionWhereInput;
    data: Prisma.OrganizationBankConnectionUpdateManyMutationInput;
  }): Promise<Prisma.BatchPayload>;
}
