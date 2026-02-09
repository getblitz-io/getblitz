import type { z } from "zod";

import type { Invoice } from "@getblitz/database";
import type {
  CreateInvoiceInputSchema,
  UpdateInvoiceInputSchema,
} from "@getblitz/validators";

import type {
  CreateInvoiceResult,
  DeviceDetails,
  InvoiceDetailsResult,
  InvoiceWithOrg,
  InvoiceWithRelations,
} from "..";

export interface IInvoiceService {
  createInvoice({
    input,
    baseUrl,
  }: {
    input: z.infer<typeof CreateInvoiceInputSchema>;
    baseUrl: string;
  }): Promise<CreateInvoiceResult>;

  getInvoiceById({
    invoiceId,
  }: {
    invoiceId: string;
  }): Promise<InvoiceWithRelations | null>;

  markInvoiceAsFinalized({
    organizationId,
    invoiceId,
  }: {
    organizationId: string;
    invoiceId: string;
  }): Promise<InvoiceWithRelations>;

  getInvoiceByReference({
    referenceId,
    password,
    mode,
    deviceDetails,
  }: {
    referenceId: string;
    password?: string;
    mode: "public" | "preview";
    deviceDetails: DeviceDetails;
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

  updateInvoice({
    input,
  }: {
    input: z.infer<typeof UpdateInvoiceInputSchema>;
  }): Promise<InvoiceWithRelations>;

  deleteInvoice({
    id,
    organizationId,
  }: {
    id: string;
    organizationId: string;
  }): Promise<Invoice>;
}
