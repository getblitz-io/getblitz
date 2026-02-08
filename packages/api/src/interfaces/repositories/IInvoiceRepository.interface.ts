import type { Invoice, Prisma } from "@getblitz/database";

import type {
  InvoiceCreateData,
  InvoiceUpdateData,
  InvoiceWithOrg,
  InvoiceWithRelations,
} from "..";

export interface IInvoiceRepository {
  create({
    data,
    tx,
  }: {
    data: InvoiceCreateData;
    tx?: Prisma.TransactionClient;
  }): Promise<Invoice>;

  findById({
    id,
    organizationId,
  }: {
    id: string;
    organizationId?: string;
  }): Promise<InvoiceWithRelations | null>;

  findByReferenceId({
    referenceId,
    type,
  }: {
    referenceId: string;
    type: "referenceId" | "id";
  }): Promise<InvoiceWithRelations | null>;

  findByOrgIds({
    orgIds,
    options,
  }: {
    orgIds: string[];
    options?: { take?: number };
  }): Promise<InvoiceWithOrg[]>;

  update({
    id,
    organizationId,
    data,
    tx,
  }: {
    id: string;
    organizationId: string;
    data: InvoiceUpdateData;
    tx?: Prisma.TransactionClient;
  }): Promise<InvoiceWithRelations>;

  delete({
    id,
    organizationId,
  }: {
    id: string;
    organizationId: string;
  }): Promise<Invoice>;
}
