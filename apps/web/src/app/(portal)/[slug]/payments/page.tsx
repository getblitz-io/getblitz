import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { CreditCardIcon } from "@getblitz/icon";
import { Card, CardContent } from "@getblitz/ui";
import { Button } from "@getblitz/ui/button";

import { api } from "~/trpc/server";

const statusColors = {
  PENDING: "bg-amber-500/10 text-amber-600",
  PAID: "bg-green-500/10 text-green-600",
  FAILED: "bg-red-500/10 text-red-600",
  EXPIRED: "bg-gray-500/10 text-gray-600",
  PARTIAL: "bg-amber-500/10 text-amber-600",
} as const;

export default async function PaymentsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = await getTranslations("PaymentsPage");
  const tCommon = await getTranslations("Common");

  const caller = await api();
  const payments = await caller.payment.listBySlug({ slug, take: 50 });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {t("title")}
          </h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <Link href={`/${slug}/payments/new`} className="shrink-0">
          <Button className="w-full sm:w-auto">{t("createPayment")}</Button>
        </Link>
      </div>

      {payments.length > 0 ? (
        <>
          {/* Mobile card view */}
          <div className="space-y-3 sm:hidden">
            {payments.map((payment) => (
              <Link
                key={payment.id}
                href={`/${slug}/payments/${payment.referenceId}`}
              >
                <Card className="hover:bg-muted/50 p-4 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <code className="block truncate font-mono text-sm">
                        {payment.referenceId}
                      </code>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {payment.createdAt.toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        €{(payment.amountCents / 100).toFixed(2)}
                      </p>
                      <span
                        className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[payment.status]}`}
                      >
                        {tCommon(`status.${payment.status.toLowerCase()}`)}
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
                    <th className="p-4 font-medium">{t("amount")}</th>
                    <th className="p-4 font-medium">{t("status")}</th>
                    <th className="p-4 font-medium">{t("created")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-muted/50">
                      <td className="p-4">
                        <Link href={`/${slug}/payments/${payment.referenceId}`}>
                          <code className="font-mono text-sm">
                            {payment.referenceId}
                          </code>
                        </Link>
                      </td>
                      <td className="p-4">
                        <span className="font-medium">
                          {(payment.amountCents / 100).toFixed(2)}{" "}
                          {payment.currency}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[payment.status]}`}
                        >
                          {tCommon(`status.${payment.status.toLowerCase()}`)}
                        </span>
                      </td>
                      <td className="text-muted-foreground p-4 text-sm">
                        {payment.createdAt.toLocaleString()}
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
              <CreditCardIcon className="text-muted-foreground h-7 w-7" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">{t("noPayments")}</h3>
            <p className="text-muted-foreground mt-2 max-w-sm text-center text-sm">
              {t("noPaymentsDescription")}
            </p>
            <Link href={`/${slug}/payments/new`} className="mt-4">
              <Button>{t("createFirstPayment")}</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
