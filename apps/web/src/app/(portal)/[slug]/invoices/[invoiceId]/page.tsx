"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { LockClosedIcon } from "@radix-ui/react-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@getblitz/ui";
import { Button } from "@getblitz/ui/button";
import { toast } from "@getblitz/ui/toast";

import { CopyButton } from "~/app/_components/copy-button";
import { useTRPC } from "~/trpc/react";
import { PreviewButton } from "../_components";

const statusColors = {
  DRAFT: "bg-amber-500/10 text-amber-600",
  FINALIZED: "bg-amber-500/10 text-amber-600",
  PAID: "bg-green-500/10 text-green-600",
  CANCELLED: "bg-gray-500/10 text-gray-600",
} as const;

interface LineItem {
  description: string;
  quantity: number;
  unitPriceCents: number;
}

export default function InvoiceDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const invoiceId = params.invoiceId as string;
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const t = useTranslations("InvoicesPage");
  const tCommon = useTranslations("Common");
  const tToast = useTranslations("Toast");

  // Fetch invoice
  const { data: invoice, isLoading } = useQuery(
    trpc.invoice.getById.queryOptions({ invoiceId, slug }),
  );

  // Delete invoice mutation
  const deleteInvoice = useMutation(
    trpc.invoice.delete.mutationOptions({
      onSuccess: async () => {
        toast.success(tToast("invoiceDeleted"));
        await queryClient.invalidateQueries({
          queryKey: trpc.invoice.getById.queryKey({ invoiceId, slug }),
        });
        if (invoice?.status === "DRAFT") {
          router.push(`/${slug}/invoices`);
        }
      },
      onError: (error: { message: string }) => {
        toast.error(error.message);
      },
    }),
  );

  // Finalize invoice mutation
  const finalizeInvoice = useMutation(
    trpc.invoice.finalize.mutationOptions({
      onSuccess: async () => {
        toast.success(tToast("invoiceFinalized"));
        await queryClient.invalidateQueries({
          queryKey: trpc.invoice.getById.queryKey({ invoiceId, slug }),
        });
      },
      onError: (error: { message: string }) => {
        toast.error(error.message);
      },
    }),
  );

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

  const lineItems: LineItem[] = Array.isArray(invoice.lineItems)
    ? (invoice.lineItems as LineItem[])
    : [];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href={`/${slug}/invoices`}
            className="text-muted-foreground hover:text-foreground mb-2 block text-sm"
          >
            {t("backToInvoices")}
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">
            {invoice.invoiceNumber ?? invoice.referenceId}
          </h1>
          <p className="text-muted-foreground">{t("invoiceDetails")}</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          {invoice.status === "DRAFT" && (
            <>
              <Link
                href={`/${slug}/invoices/${invoiceId}/edit`}
                className="w-full sm:w-auto"
              >
                <Button variant="outline" className="w-full sm:w-auto">
                  {t("editButton")}
                </Button>
              </Link>
              <Button
                variant="secondary"
                className="w-full bg-green-600 text-white hover:bg-green-700 sm:w-auto"
                onClick={() => {
                  if (confirm(t("confirmFinalize"))) {
                    finalizeInvoice.mutate({ slug, id: invoiceId });
                  }
                }}
              >
                {t("finalizeButton")}
              </Button>
            </>
          )}
          {(invoice.status === "DRAFT" ||
            (invoice.status === "FINALIZED" &&
              invoice.paymentSession?.status !== "PAID")) && (
            <Button
              variant="destructive"
              className="w-full sm:w-auto"
              disabled={deleteInvoice.isPending}
              onClick={() => {
                const isDraft = invoice.status === "DRAFT";
                if (
                  confirm(isDraft ? t("confirmDelete") : t("confirmCancel"))
                ) {
                  deleteInvoice.mutate({ slug, id: invoiceId });
                }
              }}
            >
              {deleteInvoice.isPending
                ? invoice.status === "DRAFT"
                  ? t("deleting")
                  : t("cancelling")
                : invoice.status === "DRAFT"
                  ? t("deleteButton")
                  : t("cancelButton")}
            </Button>
          )}
        </div>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t("status")}</CardTitle>
            <div className="flex items-center gap-2">
              {invoice.passwordHash && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-600">
                  <LockClosedIcon className="h-3 w-3" />
                  {t("passwordProtected")}
                </span>
              )}
              <span
                className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${statusColors[invoice.status]}`}
              >
                {tCommon(`status.${invoice.status.toLowerCase()}`)}
              </span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Customer Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t("customerSection")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("emailLabel")}</span>
            <span>{invoice.customerEmail ?? "-"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("nameLabel")}</span>
            <span>{invoice.customerName ?? "-"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("addressLabel")}</span>
            <span>{invoice.customerAddress ?? "-"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("taxIdLabel")}</span>
            <span>{invoice.customerTaxId ?? "-"}</span>
          </div>
        </CardContent>
      </Card>

      {/* Line Items Card */}
      {lineItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("lineItemsSection")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-muted-foreground py-2 text-left font-medium">
                      {t("lineItemDescription")}
                    </th>
                    <th className="text-muted-foreground w-20 py-2 text-right font-medium">
                      {t("lineItemQuantity")}
                    </th>
                    <th className="text-muted-foreground w-28 py-2 text-right font-medium">
                      {t("lineItemPrice")}
                    </th>
                    <th className="text-muted-foreground w-28 py-2 text-right font-medium">
                      {t("total")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, index) => (
                    <tr key={index} className="border-b last:border-0">
                      <td className="py-2">{item.description || "-"}</td>
                      <td className="py-2 text-right">{item.quantity}</td>
                      <td className="py-2 text-right">
                        €{(item.unitPriceCents / 100).toFixed(2)}
                      </td>
                      <td className="py-2 text-right font-medium">
                        €
                        {((item.quantity * item.unitPriceCents) / 100).toFixed(
                          2,
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Financial Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t("financialDetails")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("subtotal")}</span>
            <span className="font-medium">
              €{(invoice.subtotalCents / 100).toFixed(2)}
            </span>
          </div>
          {invoice.taxAmountCents > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t("tax")} ({(invoice.taxRateBps / 100).toFixed(1)}%)
              </span>
              <span>€{(invoice.taxAmountCents / 100).toFixed(2)}</span>
            </div>
          )}
          {invoice.discountCents > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("discount")}</span>
              <span className="text-green-600">
                -€{(invoice.discountCents / 100).toFixed(2)}
              </span>
            </div>
          )}
          <div className="border-t pt-2">
            <div className="flex justify-between text-lg font-semibold">
              <span>{t("total")}</span>
              <span>€{(invoice.totalCents / 100).toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Content Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t("invoiceContent")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {invoice.description && (
            <div>
              <span className="text-muted-foreground block text-sm">
                {t("descriptionLabel")}
              </span>
              <p>{invoice.description}</p>
            </div>
          )}
          {invoice.notes && (
            <div>
              <span className="text-muted-foreground block text-sm">
                {t("notesLabel")}
              </span>
              <p>{invoice.notes}</p>
            </div>
          )}
          {invoice.dueDate && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("dueDate")}</span>
              <span>{new Date(invoice.dueDate).toLocaleDateString()}</span>
            </div>
          )}
          {invoice.expiresAt && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("expiresLabel")}</span>
              <span>{new Date(invoice.expiresAt).toLocaleString()}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Link Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t("paymentLink")}</CardTitle>
          <CardDescription>{t("paymentLinkDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-muted flex items-center justify-between rounded-lg p-3">
            <code className="truncate text-sm">
              {typeof window !== "undefined"
                ? `${window.location.origin}/invoice/${invoiceId}`
                : `/invoice/${invoiceId}`}
            </code>
            <CopyButton
              value={
                typeof window !== "undefined"
                  ? `${window.location.origin}/invoice/${invoiceId}`
                  : `/invoice/${invoiceId}`
              }
            />
          </div>
          {invoice.status === "DRAFT" && (
            <PreviewButton slug={slug} invoiceId={invoiceId} size="lg" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
