import type { Invoice, Prisma, PrismaClient } from "@getblitz/database";
import { InvoiceStatus } from "@getblitz/database";

import type {
  IInvoiceRepository,
  InvoiceCreateData,
  InvoiceUpdateData,
  InvoiceWithOrg,
  InvoiceWithRelations,
} from "../interfaces";

/**
 * Only non-sensitive connection fields. Never expose webhookSecret,
 * credentials or providerConfig through invoice queries.
 */
export const safeBankConnectionSelect = {
  id: true,
  organizationId: true,
  providerId: true,
  name: true,
} satisfies Prisma.OrganizationBankConnectionSelect;

export const invoiceWithRelationsInclude = {
  organization: true,
  paymentSession: {
    include: {
      bankAccount: {
        include: {
          organizationBankConnection: { select: safeBankConnectionSelect },
        },
      },
    },
  },
  bankAccount: {
    include: {
      organizationBankConnection: { select: safeBankConnectionSelect },
    },
  },
} satisfies Prisma.InvoiceInclude;

export class InvoiceRepository implements IInvoiceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create({
    data,
    tx,
  }: {
    data: InvoiceCreateData;
    tx?: Prisma.TransactionClient;
  }): Promise<Invoice> {
    return (tx ?? this.prisma).invoice.create({
      data,
      include: invoiceWithRelationsInclude,
    });
  }

  async findById({
    id,
    organizationId,
  }: {
    id: string;
    organizationId: string;
  }): Promise<InvoiceWithRelations | null> {
    return this.prisma.invoice.findUnique({
      where: { id, organizationId },
      include: invoiceWithRelationsInclude,
    });
  }

  async findByReferenceId({
    referenceId,
    type,
  }: {
    referenceId: string;
    type: "referenceId" | "id";
  }): Promise<InvoiceWithRelations | null> {
    const where =
      type === "referenceId" ? { referenceId } : { id: referenceId };
    return this.prisma.invoice.findUnique({
      where,
      include: invoiceWithRelationsInclude,
    });
  }

  async findByOrgIds({
    orgIds,
    options,
  }: {
    orgIds: string[];
    options?: { take?: number };
  }): Promise<InvoiceWithOrg[]> {
    return this.prisma.invoice.findMany({
      where: {
        organizationId: { in: orgIds },
      },
      take: options?.take,
      orderBy: { createdAt: "desc" },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
        paymentSession: {
          select: {
            status: true,
            expiresAt: true,
          },
        },
        bankAccount: {
          include: {
            organizationBankConnection: {
              select: safeBankConnectionSelect,
            },
          },
        },
      },
    });
  }

  async update({
    id,
    organizationId,
    data,
    tx,
  }: {
    id: string;
    organizationId: string;
    data: InvoiceUpdateData;
    tx?: Prisma.TransactionClient;
  }): Promise<InvoiceWithRelations> {
    return (tx ?? this.prisma).invoice.update({
      where: { id, organizationId },
      data,
      include: invoiceWithRelationsInclude,
    });
  }

  async delete({
    id,
    organizationId,
  }: {
    id: string;
    organizationId: string;
  }): Promise<Invoice> {
    return this.prisma.invoice.update({
      where: { id, organizationId },
      data: {
        status: InvoiceStatus.CANCELLED,
      },
    });
  }
}
