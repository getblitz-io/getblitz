import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Card, CardContent } from "@getblitz/ui";
import { Button } from "@getblitz/ui/button";

import { api } from "~/trpc/server";

export default async function CustomersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = await getTranslations("CustomersPage");
  const tCommon = await getTranslations("Common");

  const caller = await api();
  const customers = await caller.customer.list({ slug, take: 50 });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {t("title")}
          </h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <Link href={`/${slug}/customers/new`} className="shrink-0">
          <Button className="w-full sm:w-auto">{t("createCustomer")}</Button>
        </Link>
      </div>

      {customers.length > 0 ? (
        <>
          {/* Mobile card view */}
          <div className="space-y-3 sm:hidden">
            {customers.map((customer) => (
              <Link
                key={customer.id}
                href={`/${slug}/customers/${customer.id}`}
              >
                <Card className="hover:bg-muted/50 p-4 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {customer.name ?? tCommon("noName")}
                      </p>
                      <p className="text-muted-foreground mt-1 truncate text-sm">
                        {customer.email}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground text-xs">
                        {customer.createdAt.toLocaleDateString()}
                      </p>
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
                    <th className="p-4 font-medium">{t("name")}</th>
                    <th className="p-4 font-medium">{t("email")}</th>
                    <th className="p-4 font-medium">{t("taxId")}</th>
                    <th className="p-4 font-medium">{t("created")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {customers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-muted/50">
                      <td className="p-4">
                        <Link href={`/${slug}/customers/${customer.id}`}>
                          <span className="font-medium">
                            {customer.name ?? tCommon("noName")}
                          </span>
                        </Link>
                      </td>
                      <td className="p-4">
                        <span className="text-muted-foreground">
                          {customer.email}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-muted-foreground">
                          {customer.taxId ?? "-"}
                        </span>
                      </td>
                      <td className="text-muted-foreground p-4 text-sm">
                        {customer.createdAt.toLocaleString()}
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
                  d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-semibold">{t("noCustomers")}</h3>
            <p className="text-muted-foreground mt-2 max-w-sm text-center text-sm">
              {t("noCustomersDescription")}
            </p>
            <Link href={`/${slug}/customers/new`} className="mt-4">
              <Button>{t("createFirstCustomer")}</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
