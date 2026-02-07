import type { Invoice } from "@getblitz/database";

import type {
  CreateInvoiceInput,
  CreateInvoiceResult,
  InvoiceDetailsResult,
  InvoiceWithOrg,
  UpdateInvoiceInput,
} from "..";

export interface IInvoiceService {
  createInvoice({
    input,
    baseUrl,
  }: {
    input: CreateInvoiceInput;
    baseUrl: string;
  }): Promise<CreateInvoiceResult>;

  getInvoiceDetails({
    invoiceId,
    password,
  }: {
    invoiceId: string;
    password?: string;
  }): Promise<InvoiceDetailsResult | null>;

  getInvoiceByReference({
    referenceId,
    password,
  }: {
    referenceId: string;
    password?: string;
  }): Promise<InvoiceDetailsResult | null>;

  listByOrgIds({
    orgIds,
    options,
  }: {
    orgIds: string[];
    options?: { take?: number };
  }): Promise<InvoiceWithOrg[]>;

  verifyPassword({
    invoiceId,
    password,
  }: {
    invoiceId: string;
    password: string;
  }): Promise<boolean>;

  updateInvoice({ input }: { input: UpdateInvoiceInput }): Promise<Invoice>;

  deleteInvoice({
    id,
    organizationId,
  }: {
    id: string;
    organizationId: string;
  }): Promise<Invoice>;
}
