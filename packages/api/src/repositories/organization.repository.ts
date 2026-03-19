import type { Organization, Prisma, PrismaClient } from "@getblitz/database";

import type {
  IOrganizationRepository,
  OrganizationWithDetails,
} from "../interfaces";
import { BaseRepository } from "./base.repository";

// Shared include for organization queries with full details
const organizationWithDetailsInclude = {
  organizationBankConnections: {
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      providerId: true,
      providerConfig: true,
      credentials: true,
      webhookUrl: true,
      webhookSecret: true,
      status: true,
      expiresAt: true,
      createdAt: true,
      updatedAt: true,
      bankAccounts: {
        select: {
          id: true,
          accountName: true,
          accountIban: true,
          accountBic: true,
          isDefault: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  },
  webhooks: {
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      webhookUrl: true,
      webhookSecret: true,
      notifyPaymentSuccess: true,
      notifyPaymentFailed: true,
      notifyPaymentExpired: true,
      notifyPaymentAbandoned: true,
    },
  },
  _count: {
    select: {
      paymentSessions: true,
      members: true,
      organizationBankConnections: true,
      webhooks: true,
    },
  },
} satisfies Prisma.OrganizationInclude;

export class OrganizationRepository
  extends BaseRepository
  implements IOrganizationRepository
{
  constructor(private readonly prisma: PrismaClient) {
    super("Organization");
  }

  async findById({
    id,
  }: {
    id: string;
  }): Promise<OrganizationWithDetails | null> {
    return this.prisma.organization.findUnique({
      where: { id },
      include: organizationWithDetailsInclude,
    });
  }

  async findBySlug({
    slug,
  }: {
    slug: string;
  }): Promise<OrganizationWithDetails | null> {
    return this.prisma.organization.findUnique({
      where: { slug },
      include: organizationWithDetailsInclude,
    });
  }

  async update({
    id,
    data,
  }: {
    id: string;
    data: Prisma.OrganizationUpdateInput;
  }): Promise<OrganizationWithDetails> {
    return this.prisma.organization.update({
      where: { id },
      data,
      include: organizationWithDetailsInclude,
    });
  }

  async findByUserId({ userId }: { userId: string }): Promise<Organization[]> {
    return this.prisma.organization.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
    });
  }

  async findMemberByUserAndOrg({
    userId,
    organizationId,
  }: {
    userId: string;
    organizationId: string;
  }): Promise<{ id: string; userId: string } | null> {
    return this.prisma.member.findFirst({
      where: {
        organizationId,
        userId,
      },
      select: {
        id: true,
        userId: true,
      },
    });
  }
}
