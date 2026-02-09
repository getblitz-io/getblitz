import Link from "next/link";
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
import { InvoiceForm } from "../_components";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function NewInvoicePage({ params }: Props) {
  const { slug } = await params;
  const t = await getTranslations("InvoicesPage");

  // Get the tRPC caller
  const caller = await api();

  // Fetch organization with bank accounts
  const org = await caller.organization.getBySlug({ slug });

  // Extract bank accounts from organization
  const bankAccounts = org.organizationBankConnections.flatMap((c) =>
    c.bankAccounts.map((a) => ({
      ...a,
      bankName: c.providerId,
    })),
  );

  // Determine default account
  const defaultAccount = bankAccounts.find((a) => a.isDefault);
  const defaultAccountId = defaultAccount?.id ?? bankAccounts[0]?.id ?? null;

  // Show message if no bank accounts connected
  if (bankAccounts.length === 0) {
    return (
      <div className="mx-auto max-w-md space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("bankAccountRequiredTitle")}</CardTitle>
            <CardDescription>
              {t("bankAccountRequiredDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/${slug}/banks/connect`}>
              <Button className="w-full">{t("connectBankAccount")}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <InvoiceForm
      slug={slug}
      mode="create"
      bankAccounts={bankAccounts}
      defaultAccountId={defaultAccountId}
    />
  );
}
