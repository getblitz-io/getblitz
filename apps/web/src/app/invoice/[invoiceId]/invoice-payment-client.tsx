"use client";

import { useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { CheckIcon, Cross2Icon } from "@radix-ui/react-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import * as QRCode from "qrcode";

import type { PaymentEvent } from "@getblitz/shared-types";
import { Card, CardContent } from "@getblitz/ui";
import { Button } from "@getblitz/ui/button";
import { toast } from "@getblitz/ui/toast";

import { env } from "~/env";
import { usePaymentSocket } from "~/hooks/use-payment-socket";
import { useTRPC } from "~/trpc/react";
import { InvoiceDetails } from "./invoice-details";

export interface InvoiceData {
  invoiceId: string;
  referenceId: string;
  invoiceNumber: string | null;
  amountCents: number;
  currency: string;
  subtotalCents: number;
  taxRateBps: number;
  taxAmountCents: number;
  discountCents: number;
  lineItems:
    | {
        description: string;
        quantity: number;
        unitPriceCents: number;
      }[]
    | null;
  status: string;
  expiresAt: string | null;
  dueDate: string | null;
  customerEmail: string | null;
  customerName: string | null;
  customerAddress: string | null;
  customerTaxId: string | null;
  description: string | null;
  notes: string | null;
  organization: {
    name: string;
    logo: string | null;
  };
  isPasswordProtected: boolean;
  paymentSession: {
    sessionId: string;
    status: string;
    amountCents: number;
    currency: string;
    sepaQrString: string | null;
    clientToken: string;
    bankAccount: {
      accountName: string;
      iban?: string;
      bic?: string;
      bankName?: string;
    } | null;
  };
}

interface InvoicePaymentClientProps {
  invoice: InvoiceData;
  previewToken?: string;
  password?: string;
}

export function InvoicePaymentClient({
  invoice,
  previewToken,
  password,
}: InvoicePaymentClientProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const t = useTranslations("InvoicePaymentPage");
  const tToast = useTranslations("Toast");

  const amountFormatted = (invoice.amountCents / 100).toFixed(2);

  // Handle payment updates from WebSocket
  const handlePaymentUpdate = useCallback(
    (event: PaymentEvent) => {
      if (event.status === "PAID") {
        toast.success(tToast("paymentReceived"), {
          description: tToast("paymentReceivedDescription"),
        });
        router.refresh();
        void queryClient.invalidateQueries({
          queryKey: trpc.invoice.getByReference.queryKey({
            referenceId: invoice.referenceId,
            password,
          }),
        });
      } else if (event.status === "EXPIRED") {
        toast.error(tToast("paymentExpired"), {
          description: tToast("paymentExpiredDescription"),
        });
        router.refresh();
        void queryClient.invalidateQueries({
          queryKey: trpc.invoice.getByReference.queryKey({
            referenceId: invoice.referenceId,
            password,
          }),
        });
      } else if (event.status === "FAILED") {
        toast.error(tToast("paymentFailed"), {
          description: tToast("paymentFailedDescription"),
        });
        router.refresh();
        void queryClient.invalidateQueries({
          queryKey: trpc.invoice.getByReference.queryKey({
            referenceId: invoice.referenceId,
            password,
            previewToken,
          }),
        });
      }
    },
    [
      router,
      queryClient,
      trpc.invoice.getByReference,
      invoice.referenceId,
      password,
      tToast,
      previewToken,
    ],
  );

  // Connect to WebSocket only if session is pending
  const { isConnected } = usePaymentSocket({
    sessionId:
      invoice.paymentSession.status === "PENDING"
        ? invoice.paymentSession.sessionId
        : "",
    clientToken: invoice.paymentSession.clientToken,
    onPaymentUpdate: handlePaymentUpdate,
  });

  // Render QR code when session is loaded
  useEffect(() => {
    if (
      invoice.paymentSession.sepaQrString &&
      canvasRef.current &&
      invoice.paymentSession.status === "PENDING"
    ) {
      void QRCode.toCanvas(
        canvasRef.current,
        invoice.paymentSession.sepaQrString,
        {
          width: 280,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#ffffff",
          },
        },
      );
    }
  }, [invoice.paymentSession.sepaQrString, invoice.paymentSession.status]);

  // Handle simulate payment (dev only)
  const handleSimulatePayment = async () => {
    if (!invoice.paymentSession.sessionId) return;

    try {
      const res = await fetch(
        `${env.NEXT_PUBLIC_APP_URL}/api/v1/sessions/${invoice.paymentSession.sessionId}/simulate-payment`,
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

  // Payment complete state
  if (invoice.paymentSession.status === "PAID") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Organization Header */}
          <div className="flex flex-col items-center space-y-2">
            {invoice.organization.logo && (
              <Image
                src={invoice.organization.logo}
                alt={invoice.organization.name}
                width={64}
                height={64}
                className="rounded-lg"
              />
            )}
            <p className="text-primary text-sm font-medium">
              {invoice.organization.name}
            </p>
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

                {/* Invoice Details */}
                <InvoiceDetails invoice={invoice} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Expired/Failed state
  if (
    invoice.paymentSession.status === "EXPIRED" ||
    invoice.paymentSession.status === "FAILED"
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Organization Header */}
          <div className="flex flex-col items-center space-y-2">
            {invoice.organization.logo && (
              <Image
                src={invoice.organization.logo}
                alt={invoice.organization.name}
                width={64}
                height={64}
                className="rounded-lg"
              />
            )}
            <p className="text-primary text-sm font-medium">
              {invoice.organization.name}
            </p>
          </div>

          <Card className="border-red-500/50 bg-red-500/5">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
                  <Cross2Icon className="h-8 w-8 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-red-500">
                  {invoice.paymentSession.status === "EXPIRED"
                    ? t("paymentExpired")
                    : t("paymentFailed")}
                </h2>
                <p className="text-3xl font-bold">€{amountFormatted}</p>
                <p className="text-muted-foreground text-sm">
                  {invoice.paymentSession.status === "EXPIRED"
                    ? t("expiredDescription")
                    : t("failedDescription")}
                </p>

                {/* Invoice Details */}
                <InvoiceDetails invoice={invoice} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Pending state with QR code
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {previewToken && (
          <div
            className="rounded border-l-4 border-amber-500 bg-amber-100 p-4 text-amber-700 shadow-sm"
            role="alert"
          >
            <p className="font-bold">{t("previewMode")}</p>
            <p>{t("previewModeDescription")}</p>
          </div>
        )}
        {/* Organization Header */}
        <div className="flex flex-col items-center space-y-2">
          {invoice.organization.logo && (
            <Image
              src={invoice.organization.logo}
              alt={invoice.organization.name}
              width={64}
              height={64}
              className="rounded-lg"
            />
          )}
          <p className="text-primary text-sm font-medium">
            {invoice.organization.name}
          </p>
          <h1 className="text-2xl font-bold tracking-tight">
            {invoice.invoiceNumber ?? t("invoiceTitle")}
          </h1>
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
              <div className="flex max-w-full justify-center overflow-hidden rounded-xl bg-white p-2 sm:p-4">
                <canvas
                  ref={canvasRef}
                  className="h-auto max-w-full rounded-lg"
                />
              </div>

              {/* Amount */}
              <div className="text-center">
                <p className="text-3xl font-bold">€{amountFormatted}</p>
                <p className="text-muted-foreground text-sm">
                  {t("scanToPay")}
                </p>
              </div>

              {/* Invoice Details */}
              <InvoiceDetails invoice={invoice} showExpires />

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
    </div>
  );
}
