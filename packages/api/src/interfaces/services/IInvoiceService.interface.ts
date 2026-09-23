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
  WithoutPasswordHash,
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
    organizationId,
  }: {
    invoiceId: string;
    organizationId: string;
  }): Promise<WithoutPasswordHash<InvoiceWithRelations> | null>;

  markInvoiceAsFinalized({
    organizationId,
    invoiceId,
  }: {
    organizationId: string;
    invoiceId: string;
  }): Promise<WithoutPasswordHash<InvoiceWithRelations>>;

  getInvoiceByReference({
    referenceId,
    password,
    mode,
    previewOrganizationId,
    deviceDetails,
  }: {
    referenceId: string;
    password?: string;
    mode: "public" | "preview";
    previewOrganizationId?: string;
    deviceDetails: DeviceDetails;
  }): Promise<InvoiceDetailsResult | null>;

  listByOrgIds({
    orgIds,
    options,
  }: {
    orgIds: string[];
    options?: { take?: number };
  }): Promise<WithoutPasswordHash<InvoiceWithOrg>[]>;

  verifyPassword({
    invoiceId,
    password,
    deviceDetails,
  }: {
    invoiceId: string;
    password: string;
    deviceDetails: DeviceDetails;
  }): Promise<boolean>;

  updateInvoice({
    input,
  }: {
    input: z.infer<typeof UpdateInvoiceInputSchema>;
  }): Promise<WithoutPasswordHash<InvoiceWithRelations>>;

  deleteInvoice({
    id,
    organizationId,
  }: {
    id: string;
    organizationId: string;
  }): Promise<Invoice>;
}
