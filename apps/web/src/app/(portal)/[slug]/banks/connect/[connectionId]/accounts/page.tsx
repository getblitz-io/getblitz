"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { Card, CardContent, CardHeader, CardTitle } from "@getblitz/ui";
import { Button } from "@getblitz/ui/button";
import { toast } from "@getblitz/ui/toast";

import { useTRPC } from "~/trpc/react";

export default function SelectAccountPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const connectionId = params.connectionId as string;
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const t = useTranslations("BankAccountsPage");
  const tCommon = useTranslations("Common");
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(
    new Set(),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get org data including existing bank accounts
  const { data: org } = useQuery(
    trpc.organization.getBySlug.queryOptions({ slug }),
  );

  // Get provider accounts from the bank API
  const { data: accounts, isLoading: isLoadingAccounts } = useQuery(
    trpc.organization.getProviderAccounts.queryOptions(
      { slug, connectionId },
      { enabled: !!slug && !!connectionId },
    ),
  );

  // Get existing bank accounts for this provider from org data
  const existingIbans = useMemo(() => {
    if (!org?.organizationBankConnections) return new Set<string>();

    const connection = org.organizationBankConnections.find(
      (conn) => conn.id === connectionId,
    );

    if (!connection?.bankAccounts) return new Set<string>();

    return new Set(connection.bankAccounts.map((acc) => acc.accountIban));
  }, [org, connectionId]);

  const addBankAccount = useMutation(
    trpc.organization.addBankAccount.mutationOptions({
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const toggleAccount = (iban: string) => {
    setSelectedAccounts((prev) => {
      const next = new Set(prev);
      if (next.has(iban)) {
        next.delete(iban);
      } else {
        next.add(iban);
      }
      return next;
    });
  };

  const handleConnect = async () => {
    if (selectedAccounts.size === 0 || !slug || !connectionId) {
      toast.error(t("selectAtLeastOne"));
      return;
    }

    setIsSubmitting(true);

    const accountsToAdd = accounts?.filter((acc) =>
      selectedAccounts.has(acc.iban),
    );

    const results = await Promise.allSettled(
      accountsToAdd?.map((account) =>
        addBankAccount.mutateAsync({
          slug,
          connectionId,
          accountName: account.name,
          accountIban: account.iban,
          accountBic: account.bic,
          isDefault: false,
        }),
      ) ?? [],
    );

    const successCount = results.filter((r) => r.status === "fulfilled").length;
    const failCount = results.filter((r) => r.status === "rejected").length;

    if (successCount > 0) {
      toast.success(
        t("accountsConnected", {
          count: successCount,
        }),
      );
      // Invalidate org query to refresh the data
      await queryClient.invalidateQueries({
        queryKey: trpc.organization.getBySlug.queryKey({ slug }),
      });
    }

    if (failCount > 0) {
      toast.error(
        t("accountsFailed", {
          count: failCount,
        }),
      );
    }

    setIsSubmitting(false);
    setSelectedAccounts(new Set());

    if (successCount > 0 && failCount === 0) {
      router.push(`/${slug}/banks`);
    }
  };

  // Filter out only accounts that can be selected (not already added)
  const selectableCount =
    accounts?.filter((acc) => !existingIbans.has(acc.iban)).length ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/${slug}/banks/connect`}
          className="text-muted-foreground hover:text-foreground mb-2 block text-sm"
        >
          {t("backToBanks")}
        </Link>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {t("title")}
        </h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("availableAccounts")}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingAccounts || !org ? (
            <div className="flex items-center justify-center py-8">
              <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
            </div>
          ) : accounts && accounts.length > 0 ? (
            <div className="space-y-4">
              {accounts.map((account) => {
                const isExisting = existingIbans.has(account.iban);
                const isSelected = selectedAccounts.has(account.iban);

                return (
                  <div
                    key={account.id}
                    className={`flex items-center gap-4 rounded-lg border p-4 transition-colors ${
                      isExisting
                        ? "bg-muted/50 cursor-not-allowed opacity-60"
                        : isSelected
                          ? "border-primary bg-accent cursor-pointer"
                          : "hover:bg-accent cursor-pointer"
                    }`}
                    onClick={() => !isExisting && toggleAccount(account.iban)}
                  >
                    <div className="flex h-5 w-5 items-center justify-center">
                      {isExisting ? (
                        <div className="border-muted-foreground/50 bg-muted h-4 w-4 rounded border-2" />
                      ) : (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleAccount(account.iban)}
                          className="border-primary text-primary focus:ring-primary h-4 w-4 rounded"
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{account.name}</span>
                        {isExisting && (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            {t("alreadyAdded")}
                          </span>
                        )}
                      </div>
                      <code className="text-muted-foreground text-xs break-all sm:text-sm">
                        {account.iban}
                      </code>
                    </div>
                    <div className="shrink-0 text-sm font-medium">
                      {account.currency}
                    </div>
                  </div>
                );
              })}

              <div className="flex flex-col gap-4 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-muted-foreground text-sm">
                  {t("accountsSelected", {
                    selected: selectedAccounts.size,
                    total: selectableCount,
                  })}
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push(`/${slug}/banks`)}
                    className="order-2 sm:order-1"
                  >
                    {tCommon("buttons.cancel")}
                  </Button>
                  <Button
                    onClick={handleConnect}
                    disabled={selectedAccounts.size === 0 || isSubmitting}
                    className="order-1 sm:order-2"
                  >
                    {isSubmitting
                      ? t("connecting")
                      : t("connect", {
                          count: selectedAccounts.size,
                        })}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground py-8 text-center">
              {t("noAccounts")}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
