"use client";

import { useTranslations } from "next-intl";

import { CopyButton } from "~/app/_components/copy-button";

interface PaymentDetailsProps {
  session: {
    referenceId: string;
    amountCents: number;
    status: "PENDING" | "PAID" | "FAILED" | "EXPIRED";
    expiresAt: string | null;
    bankAccount: {
      accountName: string;
      iban?: string;
      organizationBankConnection: {
        id: string;
        providerId: string;
      };
    } | null;
    provider: {
      displayName: string;
    } | null;
  };
  slug: string;
  showExpires?: boolean;
}

export function PaymentDetails({
  session,
  slug,
  showExpires = false,
}: PaymentDetailsProps) {
  const amountFormatted = (session.amountCents / 100).toFixed(2);
  const connectionId = session.bankAccount?.organizationBankConnection.id;
  const t = useTranslations("PaymentDetails");
  const tCommon = useTranslations("Common");

  return (
    <div className="bg-muted/50 w-full space-y-3 rounded-lg p-4 text-sm">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-3 sm:grid-cols-[120px_minmax(0,1fr)]">
        <span className="text-muted-foreground">{t("reference")}</span>
        <div className="flex items-center justify-end gap-1.5 sm:justify-start">
          <code className="font-mono text-xs break-all">
            {session.referenceId}
          </code>
          <CopyButton value={session.referenceId} />
        </div>

        <span className="text-muted-foreground">{t("status")}</span>
        <div className="flex items-center justify-end sm:justify-start">
          {session.status === "PENDING" ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
              <span className="text-amber-600">
                {tCommon("status.pending")}
              </span>
            </span>
          ) : session.status === "PAID" ? (
            <span className="font-medium text-green-500">
              {tCommon("status.paid")}
            </span>
          ) : (
            <span className="font-medium text-red-500">
              {session.status === "EXPIRED"
                ? tCommon("status.expired")
                : tCommon("status.failed")}
            </span>
          )}
        </div>

        {session.bankAccount && (
          <>
            {session.bankAccount.iban && (
              <>
                <span className="text-muted-foreground">{t("iban")}</span>
                <div className="flex items-center justify-end gap-1.5 sm:justify-start">
                  <code className="font-mono text-xs break-all">
                    {session.bankAccount.iban}
                  </code>
                  <CopyButton value={session.bankAccount.iban} />
                </div>
              </>
            )}

            <span className="text-muted-foreground">{t("account")}</span>
            <div className="flex items-center justify-end gap-1.5 sm:justify-start">
              <span>{session.bankAccount.accountName}</span>
              <CopyButton value={session.bankAccount.accountName} />
            </div>

            <span className="text-muted-foreground">{t("provider")}</span>
            <span className="text-right sm:text-left">
              {session.provider?.displayName ??
                session.bankAccount.organizationBankConnection.providerId}
            </span>
          </>
        )}

        {showExpires && session.expiresAt && (
          <>
            <span className="text-muted-foreground">{t("expires")}</span>
            <span className="text-right sm:text-left">
              {new Date(session.expiresAt).toLocaleTimeString()}
            </span>
          </>
        )}

        <span className="text-muted-foreground">{t("amount")}</span>
        <div className="flex items-center justify-end gap-1.5 sm:justify-start">
          <span className="font-medium">€{amountFormatted}</span>
          <CopyButton value={amountFormatted} />
        </div>

        <span className="text-muted-foreground">{t("slug")}</span>
        <code className="text-right font-mono text-xs break-all sm:text-left">
          {slug}
        </code>

        {connectionId && (
          <>
            <span className="text-muted-foreground">{t("connectionId")}</span>
            <div className="flex items-center justify-end gap-1.5 sm:justify-start">
              <code className="font-mono text-xs break-all">
                {connectionId}
              </code>
              <CopyButton value={connectionId} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
