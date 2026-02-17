import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@getblitz/ui";
import { Button } from "@getblitz/ui/button";

import { api } from "~/trpc/server";
import { AllowedOriginsSettings } from "./_components/allowed-origins-settings";
import { ApiKeysList } from "./_components/api-keys-list";
import { WebhookSettings } from "./_components/webhook-settings";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = await getTranslations("SettingsPage");

  const caller = await api();

  let organization;
  try {
    organization = await caller.organization.getBySlug({ slug });
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {t("title")}
        </h1>
        <p className="text-muted-foreground">
          {t("description", { organizationName: organization.name })}
        </p>
      </div>

      <div className="grid gap-6">
        {/* General Information */}
        <Card>
          <CardHeader>
            <CardTitle>{t("organizationInformation")}</CardTitle>
            <CardDescription>
              {t("organizationInformationDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-1">
              <p className="text-sm font-medium">{t("name")}</p>
              <p className="text-muted-foreground text-sm">
                {organization.name}
              </p>
            </div>
            <div className="grid gap-1">
              <p className="text-sm font-medium">{t("urlSlug")}</p>
              <p className="text-muted-foreground font-mono text-sm">
                /{organization.slug}
              </p>
            </div>
            <div className="grid gap-1">
              <p className="text-sm font-medium">{t("created")}</p>
              <p className="text-muted-foreground text-sm">
                {organization.createdAt.toLocaleDateString()}
              </p>
            </div>
            <div className="grid gap-1">
              <p className="text-sm font-medium">{t("members")}</p>
              <p className="text-muted-foreground text-sm">
                {t("member", { count: organization._count.members })}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* API Keys Section */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>{t("apiKeys")}</CardTitle>
                <CardDescription>{t("apiKeysDescription")}</CardDescription>
              </div>
              <Link href={`/${slug}/settings/keys/new`} className="shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  {t("generateNewKey")}
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <ApiKeysList keys={organization.secretKeys} slug={slug} />
          </CardContent>
        </Card>

        {/* Allowed Origins Settings */}
        <AllowedOriginsSettings initialOrigins={organization.allowedOrigins} />

        {/* Webhook Settings */}
        <WebhookSettings webhooks={organization.webhooks} slug={slug} />

        {/* Personal Settings Link */}
        <Card>
          <CardHeader>
            <CardTitle>{t("personalSettings")}</CardTitle>
            <CardDescription>
              {t("personalSettingsDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/${slug}/settings/profile`}>
              <Button variant="outline">{t("viewProfileSettings")}</Button>
            </Link>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">
              {t("dangerZone")}
            </CardTitle>
            <CardDescription>{t("dangerZoneDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-destructive/30 flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">{t("deleteOrganization")}</p>
                <p className="text-muted-foreground text-sm">
                  {t("deleteOrganizationDescription")}
                </p>
              </div>
              <Button
                variant="destructive"
                disabled
                className="w-full shrink-0 sm:w-auto"
              >
                {t("delete")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
