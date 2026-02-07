"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import {
  CheckIcon,
  Cross2Icon,
  ExclamationTriangleIcon,
  LockClosedIcon,
} from "@radix-ui/react-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import * as QRCode from "qrcode";

import type { PaymentEvent } from "@getblitz/shared-types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@getblitz/ui";
import { Button } from "@getblitz/ui/button";
import { Input } from "@getblitz/ui/input";
import { Label } from "@getblitz/ui/label";
import { toast } from "@getblitz/ui/toast";

import { env } from "~/env";
import { usePaymentSocket } from "~/hooks/use-payment-socket";
import { useTRPC } from "~/trpc/react";

export default function InvoicePaymentPage() {
  const params = useParams();
  const invoiceId = params.invoiceId as string;
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const t = useTranslations("InvoicePaymentPage");
  const tToast = useTranslations("Toast");
  const tCommon = useTranslations("Common");

  const [password, setPassword] = useState("");
  const [submittedPassword, setSubmittedPassword] = useState<
    string | undefined
  >(undefined);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Fetch invoice details
  const {
    data: invoice,
    isLoading,
    error,
  } = useQuery(
    trpc.invoice.get.queryOptions({
      invoiceId,
      password: submittedPassword,
    }),
  );

  // Verify password mutation
  const verifyPasswordMutation = useMutation(
    trpc.invoice.verifyPassword.mutationOptions({
      onSuccess: (data) => {
        if (data.valid) {
          setSubmittedPassword(password);
          setPasswordError(null);
        } else {
          setPasswordError(t("incorrectPassword"));
        }
      },
      onError: () => {
        setPasswordError(t("passwordVerificationFailed"));
      },
    }),
  );

  // Handle payment updates from WebSocket
  const handlePaymentUpdate = useCallback(
    (event: PaymentEvent) => {
      if (event.status === "PAID") {
        toast.success(tToast("paymentReceived"), {
          description: tToast("paymentReceivedDescription"),
        });
        void queryClient.invalidateQueries({
          queryKey: trpc.invoice.get.queryKey({
            invoiceId,
            password: submittedPassword,
          }),
        });
      } else if (event.status === "EXPIRED") {
        toast.error(tToast("paymentExpired"), {
          description: tToast("paymentExpiredDescription"),
        });
        void queryClient.invalidateQueries({
          queryKey: trpc.invoice.get.queryKey({
            invoiceId,
            password: submittedPassword,
          }),
        });
      } else if (event.status === "FAILED") {
        toast.error(tToast("paymentFailed"), {
          description: tToast("paymentFailedDescription"),
        });
        void queryClient.invalidateQueries({
          queryKey: trpc.invoice.get.queryKey({
            invoiceId,
            password: submittedPassword,
          }),
        });
      }
    },
    [queryClient, trpc.invoice.get, invoiceId, submittedPassword, tToast],
  );

  // Connect to WebSocket only if session is pending
  const { isConnected } = usePaymentSocket({
    sessionId:
      invoice?.status === "PENDING" ? invoice.paymentSession.sessionId : "",
    onPaymentUpdate: handlePaymentUpdate,
  });

  // Render QR code when session is loaded
  useEffect(() => {
    if (
      invoice?.paymentSession.sepaQrString &&
      canvasRef.current &&
      invoice.status === "PENDING"
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
  }, [invoice?.paymentSession.sepaQrString, invoice?.status]);

  // Handle password form submission
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setPasswordError(t("passwordRequired"));
      return;
    }
    verifyPasswordMutation.mutate({ invoiceId, password });
  };

  // Handle simulate payment (dev only)
  const handleSimulatePayment = async () => {
    if (!invoice?.paymentSession.sessionId) return;

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

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
      </div>
    );
  }

  // Error state - invoice not found
  if (error || !invoice) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md border-red-500/50 bg-red-500/5">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
                <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
              </div>
              <h2 className="text-xl font-bold">{t("invoiceNotFound")}</h2>
              <p className="text-muted-foreground text-sm">
                {t("invoiceNotFoundDescription")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Password protection state
  if (invoice.isPasswordProtected && !submittedPassword) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/20">
              <LockClosedIcon className="h-8 w-8 text-amber-500" />
            </div>
            <CardTitle>{t("passwordProtected")}</CardTitle>
            <CardDescription>
              {t("passwordProtectedDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">{tCommon("labels.password")}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t("passwordPlaceholder")}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError(null);
                  }}
                  className={passwordError ? "border-red-500" : ""}
                />
                {passwordError && (
                  <p className="text-sm text-red-500">{passwordError}</p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={verifyPasswordMutation.isPending}
              >
                {verifyPasswordMutation.isPending
                  ? tCommon("buttons.loading")
                  : t("unlockInvoice")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const amountFormatted = (invoice.amountCents / 100).toFixed(2);

  // Payment complete state
  if (invoice.status === "PAID") {
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
  if (invoice.status === "EXPIRED" || invoice.status === "FAILED") {
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
                  {invoice.status === "EXPIRED"
                    ? t("paymentExpired")
                    : t("paymentFailed")}
                </h2>
                <p className="text-3xl font-bold">€{amountFormatted}</p>
                <p className="text-muted-foreground text-sm">
                  {invoice.status === "EXPIRED"
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
              <div className="rounded-xl bg-white p-4">
                <canvas ref={canvasRef} className="rounded-lg" />
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

// Invoice Details Component
interface InvoiceDetailsProps {
  invoice: {
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
    dueDate: string | null;
    expiresAt: string | null;
    description: string | null;
    notes: string | null;
    customerName: string | null;
    paymentSession: {
      bankAccount: {
        accountName: string;
        iban?: string;
      } | null;
    };
  };
  showExpires?: boolean;
}

function InvoiceDetails({ invoice, showExpires = false }: InvoiceDetailsProps) {
  const t = useTranslations("InvoicePaymentPage");
  const tInvoice = useTranslations("InvoicesPage");

  const lineItems = invoice.lineItems ?? [];

  return (
    <div className="bg-muted/50 w-full space-y-3 rounded-lg p-4 text-sm">
      <div className="space-y-2">
        {/* Reference */}
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("reference")}</span>
          <code className="font-mono text-xs">{invoice.referenceId}</code>
        </div>

        {/* Customer Name */}
        {invoice.customerName && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("customer")}</span>
            <span>{invoice.customerName}</span>
          </div>
        )}

        {/* Bank Account */}
        {invoice.paymentSession.bankAccount && (
          <>
            {invoice.paymentSession.bankAccount.iban && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("iban")}</span>
                <code className="font-mono text-xs">
                  {invoice.paymentSession.bankAccount.iban}
                </code>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("account")}</span>
              <span>{invoice.paymentSession.bankAccount.accountName}</span>
            </div>
          </>
        )}

        {/* Description */}
        {invoice.description && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("description")}</span>
            <span className="max-w-[200px] truncate text-right">
              {invoice.description}
            </span>
          </div>
        )}

        {/* Due Date */}
        {invoice.dueDate && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("dueDate")}</span>
            <span>{new Date(invoice.dueDate).toLocaleDateString()}</span>
          </div>
        )}

        {/* Expires */}
        {showExpires && invoice.expiresAt && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("expires")}</span>
            <span>{new Date(invoice.expiresAt).toLocaleTimeString()}</span>
          </div>
        )}

        {/* Line Items Table */}
        {lineItems.length > 0 && (
          <div className="mt-3 border-t pt-3">
            <p className="text-muted-foreground mb-2 text-xs">
              {tInvoice("lineItemsSection")}
            </p>
            <div className="space-y-1">
              {lineItems.map((item, index) => (
                <div key={index} className="flex justify-between text-xs">
                  <span className="flex-1 truncate">
                    {item.description || "-"}
                  </span>
                  <span className="text-muted-foreground w-12 text-right">
                    ×{item.quantity}
                  </span>
                  <span className="w-20 text-right">
                    €{((item.quantity * item.unitPriceCents) / 100).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Financial Breakdown */}
        {(invoice.subtotalCents > 0 ||
          invoice.taxAmountCents > 0 ||
          invoice.discountCents > 0) && (
          <div className="mt-2 space-y-1 border-t pt-2">
            {invoice.subtotalCents > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("subtotal")}</span>
                <span>€{(invoice.subtotalCents / 100).toFixed(2)}</span>
              </div>
            )}
            {invoice.taxAmountCents > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("tax")} ({(invoice.taxRateBps / 100).toFixed(1)}%)
                </span>
                <span>€{(invoice.taxAmountCents / 100).toFixed(2)}</span>
              </div>
            )}
            {invoice.discountCents > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("discount")}</span>
                <span className="text-green-600">
                  -€{(invoice.discountCents / 100).toFixed(2)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
