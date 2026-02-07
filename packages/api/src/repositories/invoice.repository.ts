import type { Invoice, Prisma, PrismaClient } from "@getblitz/database";

import type {
  CreateInvoiceDbInput,
  IInvoiceRepository,
  InvoiceWithOrg,
  InvoiceWithRelations,
  UpdateInvoiceDbInput,
} from "../interfaces";

export class InvoiceRepository implements IInvoiceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(
    { data }: { data: CreateInvoiceDbInput },
    tx?: Prisma.TransactionClient,
  ): Promise<InvoiceWithRelations> {
    const {
      organizationId,
      referenceId,
      paymentSessionId,
      customerEmail,
      customerName,
      customerAddress,
      customerTaxId,
      description,
      notes,
      dueDate,
      invoiceNumber,
      lineItems,
      subtotalCents,
      taxRateBps,
      taxAmountCents,
      discountCents,
      passwordHash,
      metadata,
    } = data;

    return (tx ?? this.prisma).invoice.create({
      data: {
        organizationId,
        referenceId,
        paymentSessionId,
        customerEmail,
        customerName,
        customerAddress,
        customerTaxId,
        description,
        notes,
        dueDate,
        invoiceNumber,
        lineItems: lineItems as unknown as Prisma.InputJsonValue,
        subtotalCents,
        taxRateBps,
        taxAmountCents,
        discountCents,
        passwordHash,
        metadata: metadata as Prisma.InputJsonValue,
      },
      include: {
        organization: true,
        paymentSession: {
          include: {
            bankAccount: {
              include: {
                organizationBankConnection: true,
              },
            },
          },
        },
      },
    });
  }

  async findById({ id }: { id: string }): Promise<InvoiceWithRelations | null> {
    return this.prisma.invoice.findUnique({
      where: { id },
      include: {
        organization: true,
        paymentSession: {
          include: {
            bankAccount: {
              include: {
                organizationBankConnection: true,
              },
            },
          },
        },
      },
    });
  }

  async findByReferenceId({
    referenceId,
  }: {
    referenceId: string;
  }): Promise<InvoiceWithRelations | null> {
    return this.prisma.invoice.findUnique({
      where: { referenceId },
      include: {
        organization: true,
        paymentSession: {
          include: {
            bankAccount: {
              include: {
                organizationBankConnection: true,
              },
            },
          },
        },
      },
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
      },
    });
  }

  async update({
    id,
    organizationId,
    data,
  }: {
    id: string;
    organizationId: string;
    data: UpdateInvoiceDbInput;
  }): Promise<Invoice> {
    return this.prisma.invoice.update({
      where: { id, organizationId },
      data: {
        ...data,
        lineItems: data.lineItems as unknown as Prisma.InputJsonValue,
        metadata: data.metadata as Prisma.InputJsonValue,
      },
    });
  }

  async delete({
    id,
    organizationId,
  }: {
    id: string;
    organizationId: string;
  }): Promise<Invoice> {
    return this.prisma.invoice.delete({
      where: { id, organizationId },
    });
  }
}
