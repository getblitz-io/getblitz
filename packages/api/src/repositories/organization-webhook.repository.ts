import type { OrganizationWebhook, PrismaClient } from "@getblitz/database";

import type {
  CreateWebhookInput,
  IOrganizationWebhookRepository,
  UpdateWebhookInput,
} from "../interfaces";
import { BaseRepository } from "./base.repository";

export class OrganizationWebhookRepository
  extends BaseRepository
  implements IOrganizationWebhookRepository
{
  constructor(private readonly prisma: PrismaClient) {
    super("OrganizationWebhook");
  }

  async findById({ id }: { id: string }): Promise<OrganizationWebhook | null> {
    return this.prisma.organizationWebhook.findUnique({
      where: { id },
    });
  }

  async findByOrganizationId({
    organizationId,
  }: {
    organizationId: string;
  }): Promise<OrganizationWebhook[]> {
    return this.prisma.organizationWebhook.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    });
  }

  async create({
    organizationId,
    data,
  }: {
    organizationId: string;
    data: CreateWebhookInput;
  }): Promise<OrganizationWebhook> {
    return this.prisma.organizationWebhook.create({
      data: {
        organizationId,
        webhookUrl: data.webhookUrl,
        webhookSecret: data.webhookSecret,
        notifyPaymentSuccess: data.notifyPaymentSuccess ?? true,
        notifyPaymentFailed: data.notifyPaymentFailed ?? true,
        notifyPaymentExpired: data.notifyPaymentExpired ?? false,
      },
    });
  }

  async update({
    id,
    data,
  }: {
    id: string;
    data: UpdateWebhookInput;
  }): Promise<OrganizationWebhook> {
    return this.prisma.organizationWebhook.update({
      where: { id },
      data,
    });
  }

  async delete({ id }: { id: string }): Promise<OrganizationWebhook> {
    return this.prisma.organizationWebhook.delete({
      where: { id },
    });
  }
}
