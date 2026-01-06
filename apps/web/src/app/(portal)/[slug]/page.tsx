import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { KeyIcon, QrCodeIcon } from "@getblitz/icon";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@getblitz/ui";
import { Button } from "@getblitz/ui/button";

import { api } from "~/trpc/server";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = await getTranslations("DashboardPage");

  const caller = await api();
  const organization = await caller.organization.getBySlug({ slug });
  const paidCount = await caller.organization.getPaidCount({
    slug,
  });

  const bankAccountCount = organization.organizationBankConnections.flatMap(
    (c) => c.bankAccounts,
  ).length;

  const hasDefaultBank = organization.organizationBankConnections
    .flatMap((c) => c.bankAccounts)
    .some((a) => a.isDefault);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {t("title")}
          </h1>
          <p className="text-muted-foreground">
            {t("welcomeBack", { name: organization.name })}
          </p>
        </div>
        <Link href={`/${slug}/payments/new`} className="shrink-0">
          <Button className="w-full sm:w-auto">{t("createPayment")}</Button>
        </Link>
      </div>

      {/* Quick Setup Checklist */}
      {(!hasDefaultBank || bankAccountCount === 0) && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="text-lg">{t("completeSetup")}</CardTitle>
            <CardDescription>{t("completeSetupDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {bankAccountCount === 0 && (
                <li className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-amber-500 text-xs font-medium text-amber-500">
                    1
                  </div>
                  <span className="flex-1">{t("connectBank")}</span>
                  <Link href={`/${slug}/banks`}>
                    <Button variant="outline" size="sm">
                      {t("connectBankButton")}
                    </Button>
                  </Link>
                </li>
              )}
              {bankAccountCount > 0 && !hasDefaultBank && (
                <li className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-amber-500 text-xs font-medium text-amber-500">
                    2
                  </div>
                  <span className="flex-1">{t("setDefaultBank")}</span>
                  <Link href={`/${slug}/banks`}>
                    <Button variant="outline" size="sm">
                      {t("configureButton")}
                    </Button>
                  </Link>
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("bankAccounts")}</CardDescription>
            <CardTitle className="text-3xl">{bankAccountCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href={`/${slug}/banks`}
              className="text-muted-foreground hover:text-foreground text-sm"
            >
              {t("manageAccounts")}
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("apiKeys")}</CardDescription>
            <CardTitle className="text-3xl">
              {organization.secretKeys.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href={`/${slug}/settings`}
              className="text-muted-foreground hover:text-foreground text-sm"
            >
              {t("viewKeys")}
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("totalPayments")}</CardDescription>
            <CardTitle className="text-3xl">
              {organization._count.paymentSessions}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href={`/${slug}/payments`}
              className="text-muted-foreground hover:text-foreground text-sm"
            >
              {t("viewAll")}
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("completedPayments")}</CardDescription>
            <CardTitle className="text-3xl text-green-600">
              {paidCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-muted-foreground text-sm">
              {t("successfullyReceived")}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("acceptPayments")}</CardTitle>
            <CardDescription>{t("acceptPaymentsDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/${slug}/payments/new`}>
              <Button className="w-full" size="lg">
                <QrCodeIcon className="mr-2 h-5 w-5" />
                {t("createPayment")}
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("apiIntegration")}</CardTitle>
            <CardDescription>{t("apiIntegrationDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/${slug}/settings`}>
              <Button variant="outline" className="w-full" size="lg">
                <KeyIcon className="mr-2 h-5 w-5" />
                {t("viewApiKeys")}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
