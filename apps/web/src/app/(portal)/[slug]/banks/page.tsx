import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@getblitz/ui/button";

import { BankAccountsList } from "./_components/bank-accounts-list";

export default async function BanksPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = await getTranslations("BanksPage");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {t("title")}
          </h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <Link href={`/${slug}/banks/connect`} className="shrink-0">
          <Button className="w-full sm:w-auto">{t("bankProviders")}</Button>
        </Link>
      </div>

      {/* Bank Accounts List */}
      <BankAccountsList slug={slug} />
    </div>
  );
}
