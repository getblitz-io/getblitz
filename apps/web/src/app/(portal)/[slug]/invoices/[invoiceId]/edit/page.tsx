import { notFound } from "next/navigation";

import type { LineItem } from "@getblitz/validators";

import { api } from "~/trpc/server";
import { InvoiceForm } from "../../_components";

interface Props {
  params: Promise<{ slug: string; invoiceId: string }>;
}

export default async function EditInvoicePage({ params }: Props) {
  const { slug, invoiceId } = await params;

  // Get the tRPC caller and fetch invoice
  const caller = await api();
  const invoice = await caller.invoice.getById({ invoiceId, slug });

  if (!invoice) {
    notFound();
  }

  return (
    <InvoiceForm
      slug={slug}
      mode="edit"
      defaultValues={{
        invoiceId: invoice.id,
        referenceId: invoice.referenceId,
        customerEmail: invoice.customerEmail,
        customerName: invoice.customerName,
        customerAddress: invoice.customerAddress,
        customerTaxId: invoice.customerTaxId,
        description: invoice.description,
        notes: invoice.notes,
        invoiceNumber: invoice.invoiceNumber,
        lineItems: invoice.lineItems as LineItem[],
        isPasswordProtected: invoice.passwordHash !== null,
        // Financial fields
        subtotalCents: invoice.subtotalCents,
        taxRateBps: invoice.taxRateBps,
        taxAmountCents: invoice.taxAmountCents,
        discountCents: invoice.discountCents,
        amountCents: invoice.totalCents,
      }}
    />
  );
}
