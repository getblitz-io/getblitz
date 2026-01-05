import { randomBytes } from "crypto";

import type { OrganizationSecretKey, PrismaClient } from "@getblitz/database";

import type { ApiKeyWithOrganization, IApiKeyRepository } from "../interfaces";
import { BaseRepository } from "./base.repository";

export class ApiKeyRepository
  extends BaseRepository
  implements IApiKeyRepository
{
  constructor(private readonly prisma: PrismaClient) {
    super("ApiKey");
  }

  async findBySecretKey({
    secretKey,
  }: {
    secretKey: string;
  }): Promise<{ id: string; organizationId: string } | null> {
    return this.prisma.organizationSecretKey.findFirst({
      where: { secretKey },
      select: { id: true, organizationId: true },
    });
  }

  async findByIdWithOrganization({
    id,
  }: {
    id: string;
  }): Promise<ApiKeyWithOrganization | null> {
    return this.prisma.organizationSecretKey.findUnique({
      where: { id },
      include: {
        organization: {
          include: {
            members: {
              select: { userId: true },
            },
          },
        },
      },
    });
  }

  async create({
    organizationId,
  }: {
    organizationId: string;
  }): Promise<OrganizationSecretKey> {
    const secretKey = randomBytes(32).toString("hex");

    return this.prisma.organizationSecretKey.create({
      data: {
        organizationId,
        secretKey,
      },
    });
  }

  async delete({ id }: { id: string }): Promise<OrganizationSecretKey> {
    return this.prisma.organizationSecretKey.delete({
      where: { id },
    });
  }

  updateLastUsed({ id }: { id: string }): void {
    // Fire and forget - don't await
    this.prisma.organizationSecretKey
      .update({
        where: { id },
        data: { lastUsedAt: new Date() },
      })
      .catch(console.error);
  }
}
