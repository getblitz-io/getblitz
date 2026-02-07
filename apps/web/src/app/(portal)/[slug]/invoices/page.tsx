import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Card, CardContent } from "@getblitz/ui";
import { Button } from "@getblitz/ui/button";

import { api } from "~/trpc/server";

const statusColors = {
  PENDING: "bg-amber-500/10 text-amber-600",
  PAID: "bg-green-500/10 text-green-600",
  FAILED: "bg-red-500/10 text-red-600",
  EXPIRED: "bg-gray-500/10 text-gray-600",
} as const;

export default async function InvoicesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = await getTranslations("InvoicesPage");
  const tCommon = await getTranslations("Common");

  const caller = await api();
  const invoices = await caller.invoice.list({ slug, take: 50 });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {t("title")}
          </h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <Link href={`/${slug}/invoices/new`} className="shrink-0">
          <Button className="w-full sm:w-auto">{t("createInvoice")}</Button>
        </Link>
      </div>

      {invoices.length > 0 ? (
        <>
          {/* Mobile card view */}
          <div className="space-y-3 sm:hidden">
            {invoices.map((invoice) => (
              <Link key={invoice.id} href={`/${slug}/invoices/${invoice.id}`}>
                <Card className="hover:bg-muted/50 p-4 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <code className="block truncate font-mono text-sm">
                        {invoice.referenceId}
                      </code>
                      <p className="text-muted-foreground mt-1 truncate text-sm">
                        {invoice.customerName ??
                          invoice.customerEmail ??
                          tCommon("noCustomer")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        €{(invoice.subtotalCents / 100).toFixed(2)}
                      </p>
                      <span
                        className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[invoice.paymentSession.status]}`}
                      >
                        {tCommon(
                          `status.${invoice.paymentSession.status.toLowerCase()}`,
                        )}
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>

          {/* Desktop table view */}
          <Card className="hidden sm:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-muted-foreground border-b text-left text-sm">
                    <th className="p-4 font-medium">{t("reference")}</th>
                    <th className="p-4 font-medium">{t("customer")}</th>
                    <th className="p-4 font-medium">{t("amount")}</th>
                    <th className="p-4 font-medium">{t("status")}</th>
                    <th className="p-4 font-medium">{t("created")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-muted/50">
                      <td className="p-4">
                        <Link href={`/${slug}/invoices/${invoice.id}`}>
                          <code className="font-mono text-sm">
                            {invoice.referenceId}
                          </code>
                        </Link>
                      </td>
                      <td className="p-4">
                        <span className="text-muted-foreground">
                          {invoice.customerName ?? invoice.customerEmail ?? "-"}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="font-medium">
                          €{(invoice.subtotalCents / 100).toFixed(2)}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[invoice.paymentSession.status]}`}
                        >
                          {tCommon(
                            `status.${invoice.paymentSession.status.toLowerCase()}`,
                          )}
                        </span>
                      </td>
                      <td className="text-muted-foreground p-4 text-sm">
                        {invoice.createdAt.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="bg-muted flex h-14 w-14 items-center justify-center rounded-full">
              <svg
                className="text-muted-foreground h-7 w-7"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-semibold">{t("noInvoices")}</h3>
            <p className="text-muted-foreground mt-2 max-w-sm text-center text-sm">
              {t("noInvoicesDescription")}
            </p>
            <Link href={`/${slug}/invoices/new`} className="mt-4">
              <Button>{t("createFirstInvoice")}</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
