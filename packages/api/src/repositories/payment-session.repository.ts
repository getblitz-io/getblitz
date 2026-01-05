import type {
  PaymentSession,
  PaymentStatus,
  PrismaClient,
} from "@getblitz/database";

import type {
  CreatePaymentSessionInput,
  IPaymentSessionRepository,
  PaymentSessionWithOrg,
  PaymentSessionWithRelations,
  PaymentStatusStats,
} from "../interfaces";
import { BaseRepository } from "./base.repository";

export class PaymentSessionRepository
  extends BaseRepository
  implements IPaymentSessionRepository
{
  constructor(private readonly prisma: PrismaClient) {
    super("PaymentSession");
  }

  async findById({
    id,
  }: {
    id: string;
  }): Promise<PaymentSessionWithRelations | null> {
    return this.prisma.paymentSession.findFirst({
      where: { id },
      include: {
        organization: {
          include: {
            webhooks: true,
          },
        },
        bankAccount: {
          include: {
            organizationBankConnection: true,
          },
        },
      },
    });
  }

  async findByReferenceId({
    referenceId,
  }: {
    referenceId: string;
  }): Promise<PaymentSession | null> {
    return this.prisma.paymentSession.findUnique({
      where: { referenceId },
    });
  }

  async create({
    data,
  }: {
    data: CreatePaymentSessionInput;
  }): Promise<PaymentSession> {
    return this.prisma.paymentSession.create({
      data: {
        bankAccount: { connect: { id: data.bankAccountId } },
        organization: { connect: { id: data.organizationId } },
        referenceId: data.referenceId,
        amountCents: data.amountCents,
        currency: data.currency,
        expiresAt: data.expiresAt,
        status: "PENDING",
      },
    });
  }

  async updateStatus({
    id,
    status,
  }: {
    id: string;
    status: PaymentStatus;
  }): Promise<PaymentSession> {
    return this.prisma.paymentSession.update({
      where: { id },
      data: { status },
    });
  }

  async updateStatusWithToken({
    id,
    status,
    clientToken,
  }: {
    id: string;
    status: PaymentStatus;
    clientToken: string;
  }): Promise<PaymentSession> {
    return this.prisma.paymentSession.update({
      where: { id },
      data: { status, clientToken },
    });
  }

  async expirePendingSessions(): Promise<number> {
    const now = new Date();
    const result = await this.prisma.paymentSession.updateMany({
      where: {
        status: "PENDING",
        expiresAt: { lt: now },
      },
      data: { status: "EXPIRED" },
    });
    return result.count;
  }

  /**
   * Get the underlying Prisma client for transaction support
   */
  getPrisma(): PrismaClient {
    return this.prisma;
  }

  /**
   * Find pending session by reference ID and amount
   */
  async findPendingByReferenceAndAmount({
    referenceId,
    amountCents,
  }: {
    referenceId: string;
    amountCents: number;
  }): Promise<PaymentSession | null> {
    return this.prisma.paymentSession.findFirst({
      where: {
        referenceId,
        amountCents,
        status: "PENDING",
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Get aggregated payment stats by status for given org IDs
   */
  async getStatsByOrgIds({
    orgIds,
  }: {
    orgIds: string[];
  }): Promise<PaymentStatusStats[]> {
    if (orgIds.length === 0) return [];
    const result = await this.prisma.paymentSession.groupBy({
      by: ["status"],
      where: { organizationId: { in: orgIds } },
      _count: true,
    });
    return result.map((r) => ({ status: r.status, _count: r._count }));
  }

  /**
   * Find payment sessions for given org IDs with organization data
   */
  async findByOrgIds({
    orgIds,
    options,
  }: {
    orgIds: string[];
    options?: { take?: number; orderBy?: "createdAt" };
  }): Promise<PaymentSessionWithOrg[]> {
    if (orgIds.length === 0) return [];
    return this.prisma.paymentSession.findMany({
      where: { organizationId: { in: orgIds } },
      include: {
        organization: { select: { id: true, name: true } },
        bankAccount: true,
      },
      orderBy: { createdAt: "desc" },
      take: options?.take,
    });
  }

  /**
   * Count paid sessions for a specific org
   */
  async countPaidByOrgId({ orgId }: { orgId: string }): Promise<number> {
    return this.prisma.paymentSession.count({
      where: { organizationId: orgId, status: "PAID" },
    });
  }
}
