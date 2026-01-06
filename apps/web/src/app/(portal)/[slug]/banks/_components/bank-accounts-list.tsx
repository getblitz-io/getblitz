"use client";

import { TrashIcon } from "@radix-ui/react-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import type { OrganizationWithDetails } from "@getblitz/api";
import { Card, CardContent } from "@getblitz/ui";
import { Button } from "@getblitz/ui/button";
import { toast } from "@getblitz/ui/toast";

import { useTRPC } from "~/trpc/react";

interface BankAccountsListProps {
  slug: string;
}

export function BankAccountsList({ slug }: BankAccountsListProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const t = useTranslations("BanksPage");
  const tCommon = useTranslations("Common");
  const tToast = useTranslations("Toast");

  const { data: organization, isLoading } = useQuery(
    trpc.organization.getBySlug.queryOptions({ slug }),
  );

  const bankConnections = organization?.organizationBankConnections ?? [];

  const deleteAccount = useMutation(
    trpc.organization.deleteBankAccount.mutationOptions({
      onSuccess: async () => {
        toast.success(tToast("bankAccountDeleted"));
        await queryClient.invalidateQueries({
          queryKey: trpc.organization.getBySlug.queryKey({ slug }),
        });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const setDefaultAccount = useMutation(
    trpc.organization.setDefaultBankAccount.mutationOptions({
      onSuccess: async () => {
        toast.success(tToast("defaultBankAccountUpdated"));
        await queryClient.invalidateQueries({
          queryKey: trpc.organization.getBySlug.queryKey({ slug }),
        });
      },
      onError: (error: unknown) => {
        toast.error(
          error instanceof Error
            ? error.message
            : tCommon("errors.unknownError"),
        );
      },
    }),
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">{t("loading")}</p>
        </CardContent>
      </Card>
    );
  }

  const allBankAccounts = bankConnections.flatMap(
    (
      connection: OrganizationWithDetails["organizationBankConnections"][number],
    ) =>
      connection.bankAccounts.map((account) => ({
        ...account,
        connection,
      })),
  ) as {
    id: string;
    accountName: string;
    accountIban: string;
    accountBic: string;
    isDefault: boolean;
    connection: OrganizationWithDetails["organizationBankConnections"][number];
  }[];

  if (allBankAccounts.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">{t("noAccounts")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <div className="divide-y">
        {allBankAccounts.map((account) => (
          <div key={account.id} className="p-4">
            <div className="space-y-3">
              {/* Account info */}
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{account.accountName}</span>
                  <span className="bg-secondary rounded-full px-2 py-0.5 text-xs font-medium uppercase">
                    {account.connection.providerId}
                  </span>
                  {account.isDefault && (
                    <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium">
                      {tCommon("labels.default")}
                    </span>
                  )}
                </div>
                <div className="text-muted-foreground space-y-1 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="w-10 shrink-0 font-medium">
                      {tCommon("labels.iban")}:
                    </span>
                    <code className="text-xs break-all sm:text-sm">
                      {account.accountIban}
                    </code>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-10 shrink-0 font-medium">
                      {tCommon("labels.bic")}:
                    </span>
                    <code className="text-xs sm:text-sm">
                      {account.accountBic}
                    </code>
                  </div>
                </div>
                <p className="text-muted-foreground text-xs">
                  {t("provider")}: {account.connection.providerId}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                {!account.isDefault && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setDefaultAccount.mutate({
                        bankAccountId: account.id,
                        slug,
                      })
                    }
                    disabled={setDefaultAccount.isPending}
                    className="flex-1 sm:flex-none"
                  >
                    {t("setAsDefault")}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    deleteAccount.mutate({ bankAccountId: account.id, slug })
                  }
                  disabled={deleteAccount.isPending}
                  className="text-destructive hover:text-destructive"
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
