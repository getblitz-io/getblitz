"use client";

import { useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  CheckIcon,
  Cross2Icon,
  ExclamationTriangleIcon,
} from "@radix-ui/react-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import * as QRCode from "qrcode";

import type { PaymentEvent } from "@getblitz/shared-types";
import { Card, CardContent } from "@getblitz/ui";
import { Button } from "@getblitz/ui/button";
import { toast } from "@getblitz/ui/toast";

import { env } from "~/env";
import { usePaymentSocket } from "~/hooks/use-payment-socket";
import { useTRPC } from "~/trpc/react";
import { PaymentDetails } from "../_components/payment-details";

export default function PaymentDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const referenceId = params.referenceId as string;
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const t = useTranslations("PaymentDetailPage");
  const tToast = useTranslations("Toast");

  // Fetch payment session details
  const {
    data: session,
    isLoading,
    error,
  } = useQuery(trpc.payment.getByReference.queryOptions({ slug, referenceId }));

  // Handle payment updates from WebSocket
  const handlePaymentUpdate = useCallback(
    (event: PaymentEvent) => {
      if (event.status === "PAID") {
        toast.success(tToast("paymentReceived"), {
          description: tToast("paymentReceivedDescription"),
        });
        // Invalidate query to refresh session data
        void queryClient.invalidateQueries({
          queryKey: trpc.payment.getByReference.queryKey({ slug, referenceId }),
        });
      } else if (event.status === "EXPIRED") {
        toast.error(tToast("paymentExpired"), {
          description: tToast("paymentExpiredDescription"),
        });
        void queryClient.invalidateQueries({
          queryKey: trpc.payment.getByReference.queryKey({ slug, referenceId }),
        });
      } else if (event.status === "FAILED") {
        toast.error(tToast("paymentFailed"), {
          description: tToast("paymentFailedDescription"),
        });
        void queryClient.invalidateQueries({
          queryKey: trpc.payment.getByReference.queryKey({ slug, referenceId }),
        });
      }
    },
    [queryClient, trpc.payment.getByReference, slug, referenceId, tToast],
  );

  // Connect to WebSocket only if session is pending
  const { isConnected } = usePaymentSocket({
    sessionId: session?.status === "PENDING" ? session.sessionId : "",
    onPaymentUpdate: handlePaymentUpdate,
  });

  // Render QR code when session is loaded
  useEffect(() => {
    if (
      session?.sepaQrString &&
      canvasRef.current &&
      session.status === "PENDING"
    ) {
      void QRCode.toCanvas(canvasRef.current, session.sepaQrString, {
        width: 280,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      });
    }
  }, [session?.sepaQrString, session?.status]);

  // Handle simulate payment
  const handleSimulatePayment = async () => {
    if (!session?.sessionId) return;

    try {
      const res = await fetch(
        `${env.NEXT_PUBLIC_APP_URL}/api/v1/sessions/${session.sessionId}/simulate-payment`,
        { method: "POST" },
      );

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Simulation failed");
      }

      toast.success(tToast("paymentSimulated"), {
        description: tToast("paymentSimulatedDescription"),
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : tToast("simulationFailed"),
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="mx-auto max-w-md space-y-6">
        <Card className="border-red-500/50 bg-red-500/5">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
                <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
              </div>
              <h2 className="text-xl font-bold">{t("paymentNotFound")}</h2>
              <p className="text-muted-foreground text-sm">
                {t("paymentNotFoundDescription", { referenceId })}
              </p>
              <Link href={`/${slug}/payments`}>
                <Button>{t("backToPayments")}</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const amountFormatted = (session.amountCents / 100).toFixed(2);

  // Show success state when paid
  if (session.status === "PAID") {
    return (
      <div className="mx-auto max-w-md space-y-6">
        <div className="text-center">
          <Link
            href={`/${slug}/payments`}
            className="text-muted-foreground hover:text-foreground mb-2 block text-sm"
          >
            {t("backToPayments")}
          </Link>
          <p className="text-primary text-sm font-medium">{slug}</p>
        </div>

        <Card className="border-green-500/50 bg-green-500/5">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
                <CheckIcon className="h-8 w-8 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-green-500">
                {t("paymentComplete")}
              </h2>
              <p className="text-3xl font-bold">€{amountFormatted}</p>

              {/* Payment Details */}
              <div className="w-full text-left">
                <PaymentDetails session={session} slug={slug} />
              </div>

              <Link href={`/${slug}/payments/new`} className="w-full">
                <Button className="w-full">{t("createNewPayment")}</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show expired/failed state
  if (session.status === "EXPIRED" || session.status === "FAILED") {
    return (
      <div className="mx-auto max-w-md space-y-6">
        <div className="text-center">
          <Link
            href={`/${slug}/payments`}
            className="text-muted-foreground hover:text-foreground mb-2 block text-sm"
          >
            {t("backToPayments")}
          </Link>
          <p className="text-primary text-sm font-medium">{slug}</p>
        </div>

        <Card className="border-red-500/50 bg-red-500/5">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
                <Cross2Icon className="h-8 w-8 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-red-500">
                {session.status === "EXPIRED"
                  ? t("paymentExpired")
                  : t("paymentFailed")}
              </h2>
              <p className="text-3xl font-bold">€{amountFormatted}</p>
              <p className="text-muted-foreground text-sm">
                {session.status === "EXPIRED"
                  ? t("expiredDescription")
                  : t("failedDescription")}
              </p>

              {/* Payment Details */}
              <div className="w-full text-left">
                <PaymentDetails session={session} slug={slug} />
              </div>
              <Link href={`/${slug}/payments/new`} className="w-full">
                <Button className="w-full">{t("createNewPayment")}</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show pending state with QR code
  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <Link
          href={`/${slug}/payments`}
          className="text-muted-foreground hover:text-foreground mb-2 block text-sm"
        >
          {t("backToPayments")}
        </Link>
        <p className="text-primary mb-1 text-sm font-medium">{slug}</p>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("title", { referenceId })}
        </h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center space-y-4">
            {/* Connection Status */}
            <div className="flex items-center gap-2 text-sm">
              <span
                className={`h-2 w-2 rounded-full ${
                  isConnected ? "bg-green-500" : "animate-pulse bg-amber-500"
                }`}
              />
              <span className="text-muted-foreground">
                {isConnected ? t("listening") : t("connecting")}
              </span>
            </div>

            {/* QR Code Display */}
            <div className="rounded-xl bg-white p-4">
              <canvas ref={canvasRef} className="rounded-lg" />
            </div>

            {/* Amount */}
            <div className="text-center">
              <p className="text-3xl font-bold">€{amountFormatted}</p>
              <p className="text-muted-foreground text-sm">{t("scanToPay")}</p>
            </div>

            {/* Payment Details */}
            <div className="w-full text-left">
              <PaymentDetails
                session={session}
                slug={slug}
                showExpires={true}
              />
            </div>

            {/* Actions */}
            <div className="flex w-full gap-2">
              <Link href={`/${slug}/payments/new`} className="flex-1">
                <Button variant="outline" className="w-full">
                  {t("newPayment")}
                </Button>
              </Link>
              <Link href={`/${slug}/payments`} className="flex-1">
                <Button variant="outline" className="w-full">
                  {t("viewAll")}
                </Button>
              </Link>
            </div>

            {/* Simulate Payment (Dev Only) */}
            {env.NODE_ENV === "development" && (
              <div className="w-full border-t pt-4">
                <p className="mb-2 text-center text-xs text-amber-500">
                  {t("developmentOnly")}
                </p>
                <Button
                  variant="outline"
                  className="w-full border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
                  onClick={handleSimulatePayment}
                >
                  {t("simulatePayment")}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-center text-sm">
        {t("qrCodeDescription")}
      </p>
    </div>
  );
}
