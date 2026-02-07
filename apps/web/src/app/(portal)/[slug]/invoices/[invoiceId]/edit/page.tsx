"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { Button } from "@getblitz/ui/button";
import { toast } from "@getblitz/ui/toast";

import type { LineItem } from "../../_components";
import { useTRPC } from "~/trpc/react";
import {
  calculateSubtotalCents,
  CustomerFields,
  InvoiceContentFields,
  LineItemsEditor,
  PasswordFields,
} from "../../_components";

export default function EditInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const invoiceId = params.invoiceId as string;
  const trpc = useTRPC();
  const t = useTranslations("InvoicesPage");
  const tCommon = useTranslations("Common");
  const tToast = useTranslations("Toast");

  // Form state
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerTaxId, setCustomerTaxId] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [removePassword, setRemovePassword] = useState(false);

  const formLoadedRef = useRef(false);
  const lineItemsLoadedRef = useRef(false);

  // Fetch invoice
  const { data: invoice, isLoading } = useQuery(
    trpc.invoice.get.queryOptions({ invoiceId }),
  );

  // Calculate subtotal from line items
  const subtotalCents = useMemo(
    () => calculateSubtotalCents(lineItems),
    [lineItems],
  );

  // Update invoice mutation
  const updateInvoice = useMutation(
    trpc.invoice.update.mutationOptions({
      onSuccess: () => {
        toast.success(tToast("invoiceUpdated"));
        router.push(`/${slug}/invoices/${invoiceId}`);
      },
      onError: (error: { message: string }) => {
        toast.error(error.message);
      },
    }),
  );

  // Populate form when invoice loads
  useEffect(() => {
    if (invoice && !formLoadedRef.current) {
      formLoadedRef.current = true;
      setCustomerEmail(invoice.customerEmail ?? "");
      setCustomerName(invoice.customerName ?? "");
      setCustomerAddress(invoice.customerAddress ?? "");
      setCustomerTaxId(invoice.customerTaxId ?? "");
      setDescription(invoice.description ?? "");
      setNotes(invoice.notes ?? "");
      setInvoiceNumber(invoice.invoiceNumber ?? "");
    }
  }, [invoice]);

  // Initialize line items from invoice data
  useEffect(() => {
    if (
      invoice?.lineItems &&
      Array.isArray(invoice.lineItems) &&
      !lineItemsLoadedRef.current
    ) {
      lineItemsLoadedRef.current = true;
      const timeoutId = setTimeout(() => {
        setLineItems(invoice.lineItems as LineItem[]);
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [invoice?.lineItems]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate password confirmation
    if (password && password !== passwordConfirm) {
      toast.error(t("passwordMismatch"));
      return;
    }

    updateInvoice.mutate({
      slug,
      id: invoiceId,
      customerEmail: customerEmail || undefined,
      customerName: customerName || undefined,
      customerAddress: customerAddress || undefined,
      customerTaxId: customerTaxId || undefined,
      description: description || undefined,
      notes: notes || undefined,
      invoiceNumber: invoiceNumber || undefined,
      lineItems: lineItems.length > 0 ? lineItems : undefined,
      subtotalCents: lineItems.length > 0 ? subtotalCents : undefined,
      password: password || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-xl font-semibold">{t("invoiceNotFound")}</h2>
        <Link href={`/${slug}/invoices`} className="text-primary mt-2">
          {t("backToInvoices")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href={`/${slug}/invoices/${invoiceId}`}
          className="text-muted-foreground hover:text-foreground mb-2 block text-sm"
        >
          {t("backToInvoiceDetails")}
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("editInvoiceTitle")} -{" "}
          {invoice.invoiceNumber ?? invoice.referenceId}
        </h1>
        <p className="text-muted-foreground">{t("editInvoiceDescription")}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Fields */}
        <CustomerFields
          email={customerEmail}
          name={customerName}
          address={customerAddress}
          taxId={customerTaxId}
          onEmailChange={setCustomerEmail}
          onNameChange={setCustomerName}
          onAddressChange={setCustomerAddress}
          onTaxIdChange={setCustomerTaxId}
        />

        {/* Line Items */}
        <LineItemsEditor
          lineItems={lineItems}
          onLineItemsChange={setLineItems}
        />

        {/* Invoice Content Fields */}
        <InvoiceContentFields
          invoiceNumber={invoiceNumber}
          description={description}
          notes={notes}
          onInvoiceNumberChange={setInvoiceNumber}
          onDescriptionChange={setDescription}
          onNotesChange={setNotes}
        />

        {/* Password Fields */}
        <PasswordFields
          password={password}
          passwordConfirm={passwordConfirm}
          onPasswordChange={setPassword}
          onPasswordConfirmChange={setPasswordConfirm}
          isPasswordProtected={invoice.isPasswordProtected}
          removePassword={removePassword}
          onRemovePasswordToggle={() => setRemovePassword(!removePassword)}
        />

        {/* Submit Button */}
        <div className="flex gap-3">
          <Button
            type="submit"
            className="flex-1"
            size="lg"
            disabled={updateInvoice.isPending}
          >
            {updateInvoice.isPending ? t("saving") : t("saveButton")}
          </Button>
          <Link href={`/${slug}/invoices/${invoiceId}`}>
            <Button type="button" variant="outline" size="lg">
              {tCommon("actions.cancel")}
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
