import { TRPCError } from "@trpc/server";

import { api } from "~/trpc/server";
import { InvoiceErrorPage } from "./invoice-error-page";
import { InvoicePasswordForm } from "./invoice-password-form";
import { InvoicePaymentClient } from "./invoice-payment-client";

type PageResult =
  | {
      type: "invoice";
      invoice: NonNullable<
        Awaited<
          ReturnType<
            Awaited<ReturnType<typeof api>>["invoice"]["getByReference"]
          >
        >
      >;
    }
  | { type: "password"; referenceId: string; previewToken?: string }
  | { type: "error" };

async function fetchInvoice(
  invoiceId: string,
  previewToken?: string,
): Promise<PageResult> {
  try {
    const caller = await api();
    const invoice = await caller.invoice.getByReference({
      referenceId: invoiceId,
      previewToken,
    });

    if (!invoice) {
      return { type: "error" };
    }

    return { type: "invoice", invoice };
  } catch (error) {
    // Handle password-protected invoices - don't retry, show form immediately
    if (error instanceof TRPCError && error.code === "FORBIDDEN") {
      return { type: "password", referenceId: invoiceId, previewToken };
    }

    // Handle other errors
    console.error("Failed to fetch invoice:", error);
    return { type: "error" };
  }
}

export default async function InvoicePaymentPage({
  params,
  searchParams,
}: {
  params: Promise<{ invoiceId: string }>;
  searchParams: Promise<{ previewToken?: string }>;
}) {
  const { invoiceId } = await params;
  const { previewToken } = await searchParams;

  const result = await fetchInvoice(invoiceId, previewToken);

  if (result.type === "error") {
    return <InvoiceErrorPage />;
  }

  if (result.type === "password") {
    return (
      <InvoicePasswordForm
        referenceId={result.referenceId}
        previewToken={result.previewToken}
      />
    );
  }

  return (
    <InvoicePaymentClient
      invoice={result.invoice}
      previewToken={previewToken}
    />
  );
}
