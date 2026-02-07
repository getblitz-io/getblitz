import type { Invoice, Prisma } from "@getblitz/database";

import type {
  CreateInvoiceDbInput,
  InvoiceWithOrg,
  InvoiceWithRelations,
  UpdateInvoiceDbInput,
} from "..";

export interface IInvoiceRepository {
  create(
    { data }: { data: CreateInvoiceDbInput },
    tx?: Prisma.TransactionClient,
  ): Promise<Invoice>;

  findById({ id }: { id: string }): Promise<InvoiceWithRelations | null>;

  findByReferenceId({
    referenceId,
  }: {
    referenceId: string;
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
  }: {
    id: string;
    organizationId: string;
    data: UpdateInvoiceDbInput;
  }): Promise<Invoice>;

  delete({
    id,
    organizationId,
  }: {
    id: string;
    organizationId: string;
  }): Promise<Invoice>;
}
