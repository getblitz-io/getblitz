"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { Card, CardContent, CardHeader, CardTitle } from "@getblitz/ui";

import { useTRPC } from "~/trpc/react";
import { AccountList } from "./components/AccountList";
import { ErrorState } from "./components/ErrorState";
import { LoadingState } from "./components/LoadingState";
import { TokenExpiredState } from "./components/TokenExpiredState";

export default function SelectAccountPage() {
  const params = useParams();
  const slug = params.slug as string;
  const connectionId = params.connectionId as string;
  const trpc = useTRPC();
  const t = useTranslations("BankAccountsPage");

  // Get org data including existing bank accounts
  const { data: org } = useQuery(
    trpc.organization.getBySlug.queryOptions({ slug }),
  );

  // Get provider accounts from the bank API
  const {
    data: accounts,
    isLoading: isLoadingAccounts,
    error: accountsError,
    refetch,
  } = useQuery(
    trpc.organization.getProviderAccounts.queryOptions(
      { slug, connectionId },
      { enabled: !!slug && !!connectionId, retry: false },
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

  // Determine provider name for error messages
  const providerName = useMemo(() => {
    return (
      org?.organizationBankConnections.find((c) => c.id === connectionId)
        ?.providerId ?? "Bank"
    );
  }, [org, connectionId]);

  // Helper to check for token expiration
  const isTokenExpired = useMemo(() => {
    if (!accountsError) return false;

    // Fallback to legacy check (stack trace or message)
    if (
      accountsError.data?.code === "PRECONDITION_FAILED" &&
      (accountsError.message.includes("token expired") ||
        accountsError.data.stack?.includes("Bank connection token expired"))
    ) {
      return true;
    }

    return false;
  }, [accountsError]);

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
            <LoadingState />
          ) : isTokenExpired ? (
            <TokenExpiredState
              slug={slug}
              connectionId={connectionId}
              providerName={providerName}
            />
          ) : accountsError ? (
            <ErrorState
              message={accountsError.message}
              onRetry={() => refetch()}
            />
          ) : (
            <AccountList
              accounts={accounts ?? []}
              existingIbans={existingIbans}
              slug={slug}
              connectionId={connectionId}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
