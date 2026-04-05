"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { Card, CardContent } from "@getblitz/ui";
import { Button } from "@getblitz/ui/button";

import { UnifiedPaymentWidget } from "~/app/_components/payment/unified-payment-widget";
import { useTRPC } from "~/trpc/react";

export default function PaymentDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const referenceId = params.referenceId as string;
  const trpc = useTRPC();
  const t = useTranslations("PaymentDetailPage");

  // Fetch payment session details
  const {
    data: session,
    isLoading,
    error,
  } = useQuery(trpc.payment.getByReference.queryOptions({ slug, referenceId }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="border-primary h-12 w-12 animate-spin rounded-full border-4 border-t-transparent" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="mx-auto max-w-md space-y-6 py-12">
        <Card className="border-red-500/50 bg-red-500/5 shadow-lg">
          <CardContent className="pt-8">
            <div className="flex flex-col items-center space-y-6 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/20">
                <ExclamationTriangleIcon className="h-10 w-10 text-red-500" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">{t("paymentNotFound")}</h2>
                <p className="text-muted-foreground max-w-[280px] text-sm">
                  {t("paymentNotFoundDescription", { referenceId })}
                </p>
              </div>
              <Link href={`/${slug}/payments`} className="w-full">
                <Button className="w-full">{t("backToPayments")}</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <Link
            href={`/${slug}/payments`}
            className="text-muted-foreground hover:text-foreground mb-2 inline-flex items-center text-sm font-medium transition-colors"
          >
            {t("backToPayments")}
          </Link>
        </div>

        <UnifiedPaymentWidget
          session={session}
          slug={slug}
          isEmbedded={false}
        />
      </div>
    </div>
  );
}
