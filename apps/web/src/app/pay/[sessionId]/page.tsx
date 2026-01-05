import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { api } from "~/trpc/server";

export default async function PaymentPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const t = await getTranslations("PaymentPage");

  // Fetch session via tRPC (public endpoint)
  const caller = await api();
  const session = await caller.payment.getSession({ sessionId });

  if (!session) notFound();

  // The service already handles expiration status
  const displayStatus = session.status;

  return (
    <div className="bg-muted/30 flex min-h-screen items-center justify-center">
      <div className="bg-background w-full max-w-md space-y-6 rounded-lg border p-6 shadow-lg">
        <div className="text-center">
          <h1 className="text-xl font-semibold">
            {t("title", { organizationName: session.organization.name })}
          </h1>
          <p className="mt-2 text-3xl font-bold">
            €{(session.amountCents / 100).toFixed(2)}
          </p>
        </div>

        {displayStatus === "PENDING" && (
          <div className="space-y-4">
            <p className="text-muted-foreground text-center text-sm">
              {t("reference")}{" "}
              <code className="font-mono">{session.referenceId}</code>
            </p>

            {/* Tabs for Crypto / SEPA will go here */}
            <div className="text-muted-foreground rounded border p-4 text-center">
              {t("paymentWidget")}
            </div>

            <p className="text-muted-foreground text-center text-xs">
              {t("expires")} {new Date(session.expiresAt).toLocaleString()}
            </p>
          </div>
        )}

        {displayStatus === "PAID" && (
          <div className="rounded-lg bg-green-50 p-4 text-center text-green-700 dark:bg-green-950 dark:text-green-300">
            <p className="font-semibold">{t("paymentComplete")}</p>
          </div>
        )}

        {displayStatus === "EXPIRED" && (
          <div className="rounded-lg bg-red-50 p-4 text-center text-red-700 dark:bg-red-950 dark:text-red-300">
            <p className="font-semibold">{t("paymentExpired")}</p>
          </div>
        )}

        {displayStatus === "FAILED" && (
          <div className="rounded-lg bg-red-50 p-4 text-center text-red-700 dark:bg-red-950 dark:text-red-300">
            <p className="font-semibold">{t("paymentFailed")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
