import type {
  OrganizationBankConnection,
  Prisma,
  PrismaClient,
} from "@getblitz/database";

import type {
  CreateOrganizationBankConnectionInput,
  IOrganizationBankConnectionRepository,
} from "../interfaces";
import { BaseRepository } from "./base.repository";

export class OrganizationBankConnectionRepository
  extends BaseRepository
  implements IOrganizationBankConnectionRepository
{
  constructor(private readonly prisma: PrismaClient) {
    super("OrganizationBankConnection");
  }

  async findById({
    id,
    include,
  }: {
    id: string;
    include?: Prisma.OrganizationBankConnectionInclude;
  }): Promise<Prisma.OrganizationBankConnectionGetPayload<{
    include?: Prisma.OrganizationBankConnectionInclude;
  }> | null> {
    return this.prisma.organizationBankConnection.findUnique({
      where: { id },
      include,
    });
  }

  async findOne({
    where,
    include,
  }: {
    where: Prisma.OrganizationBankConnectionWhereInput;
    include?: Prisma.OrganizationBankConnectionInclude;
  }): Promise<Prisma.OrganizationBankConnectionGetPayload<{
    include?: Prisma.OrganizationBankConnectionInclude;
  }> | null> {
    return this.prisma.organizationBankConnection.findFirst({
      where,
      include,
    });
  }

  async findByOrganizationIdAndProviderId({
    organizationId,
    providerId,
    include,
  }: {
    organizationId: string;
    providerId: string;
    include?: Prisma.OrganizationBankConnectionInclude;
  }): Promise<Prisma.OrganizationBankConnectionGetPayload<{
    include?: Prisma.OrganizationBankConnectionInclude;
  }> | null> {
    return this.prisma.organizationBankConnection.findFirst({
      where: { organizationId, providerId },
      include,
    });
  }

  async findByOrganizationId({
    organizationId,
  }: {
    organizationId: string;
  }): Promise<OrganizationBankConnection[]> {
    return this.prisma.organizationBankConnection.findMany({
      where: { organizationId },
    });
  }

  async create({
    data,
  }: {
    data: CreateOrganizationBankConnectionInput;
  }): Promise<OrganizationBankConnection> {
    return this.prisma.organizationBankConnection.create({
      data: {
        organization: { connect: { id: data.organizationId } },
        providerId: data.providerId,
        providerConfig: data.providerConfig,
        credentials: data.credentials,
        callbackUrl: data.callbackUrl,
        webhookUrl: data.webhookUrl,
        webhookSecret: data.webhookSecret,
        name: data.name,
      },
    });
  }

  async update({
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
  }): Promise<OrganizationBankConnection> {
    return this.prisma.organizationBankConnection.update({
      where: { id },
      data,
    });
  }

  async delete({ id }: { id: string }): Promise<OrganizationBankConnection> {
    return this.prisma.organizationBankConnection.delete({
      where: { id },
    });
  }

  async updateMany({
    where,
    data,
  }: {
    where: Prisma.OrganizationBankConnectionWhereInput;
    data: Prisma.OrganizationBankConnectionUpdateManyMutationInput;
  }): Promise<Prisma.BatchPayload> {
    return this.prisma.organizationBankConnection.updateMany({
      where,
      data,
    });
  }
}
