"use client";

import { useTranslations } from "next-intl";

import { CopyableField } from "./copyable-field";

interface InvoiceDetailsProps {
  invoice: {
    referenceId: string;
    invoiceNumber: string | null;
    amountCents: number;
    currency: string;
    subtotalCents: number;
    taxRateBps: number;
    taxAmountCents: number;
    discountCents: number;
    lineItems:
      | {
          description: string;
          quantity: number;
          unitPriceCents: number;
        }[]
      | null;
    dueDate: string | null;
    expiresAt: string | null;
    description: string | null;
    notes: string | null;
    customerName: string | null;
    paymentSession: {
      bankAccount: {
        accountName: string;
        iban?: string;
        bic?: string;
        bankName?: string;
      } | null;
    };
  };
  showExpires?: boolean;
}

export function InvoiceDetails({
  invoice,
  showExpires = false,
}: InvoiceDetailsProps) {
  const t = useTranslations("InvoicePaymentPage");
  const tInvoice = useTranslations("InvoicesPage");

  const lineItems = invoice.lineItems ?? [];

  return (
    <div className="bg-muted/50 w-full space-y-3 rounded-lg p-4 text-sm">
      <div className="space-y-2">
        {/* Reference */}
        <div className="flex justify-between">
          <CopyableField
            label={t("reference")}
            value={invoice.referenceId}
            className="w-full"
            valueClassName="text-xs"
          />
        </div>

        {/* Amount */}
        <div className="flex justify-between">
          <CopyableField
            label={t("amount")}
            value={(invoice.amountCents / 100).toFixed(2)}
            className="w-full"
            valueClassName="text-xs"
          />
        </div>

        {/* Customer Name */}
        {invoice.customerName && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("customer")}</span>
            <span>{invoice.customerName}</span>
          </div>
        )}

        {invoice.paymentSession.bankAccount && (
          <>
            {invoice.paymentSession.bankAccount.iban && (
              <CopyableField
                label={t("iban")}
                value={invoice.paymentSession.bankAccount.iban}
                className="w-full"
                valueClassName="text-xs"
              />
            )}
            {invoice.paymentSession.bankAccount.bic && (
              <CopyableField
                label={t("bic")}
                value={invoice.paymentSession.bankAccount.bic}
                className="w-full"
                valueClassName="text-xs"
              />
            )}
            {invoice.paymentSession.bankAccount.bankName && (
              <CopyableField
                label={t("bankName")}
                value={invoice.paymentSession.bankAccount.bankName}
                className="w-full"
              />
            )}
            <CopyableField
              label={t("account")}
              value={invoice.paymentSession.bankAccount.accountName}
              className="w-full"
            />
          </>
        )}

        {/* Description */}
        {invoice.description && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("description")}</span>
            <span className="max-w-[200px] truncate text-right">
              {invoice.description}
            </span>
          </div>
        )}

        {/* Due Date */}
        {invoice.dueDate && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("dueDate")}</span>
            <span>{new Date(invoice.dueDate).toLocaleDateString()}</span>
          </div>
        )}

        {/* Expires */}
        {showExpires && invoice.expiresAt && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("expires")}</span>
            <span>{new Date(invoice.expiresAt).toLocaleTimeString()}</span>
          </div>
        )}

        {/* Line Items Table */}
        {lineItems.length > 0 && (
          <div className="mt-3 border-t pt-3">
            <p className="text-muted-foreground mb-2 text-xs">
              {tInvoice("lineItemsSection")}
            </p>
            <div className="space-y-3 sm:space-y-1">
              {lineItems.map((item, index) => (
                <div
                  key={index}
                  className="flex flex-col gap-1 text-xs sm:flex-row sm:items-start sm:justify-between sm:gap-0"
                >
                  <span className="font-medium sm:flex-1 sm:truncate sm:font-normal">
                    {item.description || "-"}
                  </span>
                  <div className="flex justify-between sm:block sm:w-auto">
                    <span className="text-muted-foreground sm:inline-block sm:w-12 sm:text-right">
                      {index === 0 && (
                        <span className="mr-1 sm:hidden">Qty:</span>
                      )}
                      ×{item.quantity}
                    </span>
                    <span className="sm:inline-block sm:w-20 sm:text-right">
                      €
                      {((item.quantity * item.unitPriceCents) / 100).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Financial Breakdown */}
        {(invoice.subtotalCents > 0 ||
          invoice.taxAmountCents > 0 ||
          invoice.discountCents > 0) && (
          <div className="mt-2 space-y-1 border-t pt-2">
            {invoice.subtotalCents > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("subtotal")}</span>
                <span>€{(invoice.subtotalCents / 100).toFixed(2)}</span>
              </div>
            )}
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
          </div>
        )}
      </div>
    </div>
  );
}
