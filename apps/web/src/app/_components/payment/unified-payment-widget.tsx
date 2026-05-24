"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckIcon, Cross2Icon } from "@radix-ui/react-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import * as QRCode from "qrcode";

import type { SessionDetailsResult } from "@getblitz/api";
import type { PaymentEvent } from "@getblitz/shared-types";
import { Card, CardContent } from "@getblitz/ui";
import { Button } from "@getblitz/ui/button";
import { toast } from "@getblitz/ui/toast";

import { CopyButton } from "~/app/_components/copy-button";
import { env } from "~/env";
import { usePaymentSocket } from "~/hooks/use-payment-socket";
import { useTRPC } from "~/trpc/react";

interface UnifiedPaymentWidgetProps {
  session: SessionDetailsResult;
  slug?: string;
  isEmbedded?: boolean;
}

// Main UI Wrapper
const WidgetWrapper = ({
  children,
  isEmbedded,
}: {
  children: React.ReactNode;
  isEmbedded: boolean;
}) => (
  <div
    className={`mx-auto w-full max-w-4xl ${isEmbedded ? "" : "flex h-full w-full flex-col items-center justify-center px-4 py-4 lg:py-8"}`}
  >
    {children}
  </div>
);

// Header with Logo
const WidgetHeader = ({
  organization,
  referenceId,
  tDetails,
}: {
  organization: { name: string; logo?: string | null };
  referenceId: string;
  tDetails: (key: string) => string;
}) => (
  <div className="mb-4 flex flex-col items-center space-y-3 text-center lg:mb-6 lg:items-start lg:text-left">
    {organization.logo ? (
      <div className="relative h-10 w-28 shrink-0">
        <Image
          src={organization.logo}
          alt={organization.name}
          fill
          className="object-contain lg:object-left"
          onError={(e) => {
            // Fallback if logo fails to load
            e.currentTarget.style.display = "none";
          }}
        />
      </div>
    ) : (
      <div className="bg-primary/10 border-primary/20 flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border">
        <span className="text-primary text-2xl font-bold">
          {organization.name.charAt(0)}
        </span>
      </div>
    )}
    <div className="w-full space-y-1">
      <h2 className="text-foreground text-xl font-extrabold tracking-tight lg:text-2xl">
        {organization.name}
      </h2>
      <p className="text-muted-foreground text-[10px] font-bold tracking-[0.2em] uppercase">
        {tDetails("reference")}:{" "}
        <span className="text-foreground font-mono tracking-normal">
          {referenceId}
        </span>
      </p>
    </div>
  </div>
);

function ManualDetailRow({
  label,
  value,
  copyValue,
  mono = false,
}: {
  label: string;
  value: string;
  copyValue?: string;
  mono?: boolean;
}) {
  return (
    <div className="bg-card hover:bg-accent hover:border-border/50 group flex items-center justify-between rounded-lg border border-transparent px-3 py-2.5 transition-all duration-300 hover:shadow-sm">
      <div className="flex min-w-0 flex-col space-y-0.5 pr-3">
        <span className="text-muted-foreground group-hover:text-foreground text-[9px] font-bold tracking-wider uppercase transition-colors">
          {label}
        </span>
        <span
          className={`text-foreground truncate text-xs font-semibold ${mono ? "font-mono" : ""}`}
        >
          {value}
        </span>
      </div>
      <CopyButton value={copyValue ?? value} />
    </div>
  );
}

export function UnifiedPaymentWidget({
  session: initialSession,
  slug,
  isEmbedded = false,
}: UnifiedPaymentWidgetProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [session, setSession] = useState<SessionDetailsResult>(initialSession);
  const [redirecting, setRedirecting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const t = useTranslations("PaymentDetailPage");

  // Sync session state if initialSession changes from parent (e.g., background refetch)
  useEffect(() => {
    setSession(initialSession);
  }, [initialSession]);

  // Manage redirect side effect with cleanup
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (redirecting && session.redirectUrl) {
      const url = session.redirectUrl;
      timeout = setTimeout(() => {
        window.location.href = url;
      }, 3000);
    }
    return () => clearTimeout(timeout);
  }, [redirecting, session.redirectUrl]);
  const tCommon = useTranslations("Common");
  const tToast = useTranslations("Toast");
  const tDetails = useTranslations("PaymentDetails");

  const amountFormatted = (session.amountCents / 100).toFixed(2);
  const amountPaidFormatted = (session.amountPaidCents / 100).toFixed(2);
  const remainingCents = Math.max(
    0,
    session.amountCents - session.amountPaidCents,
  );
  const remainingFormatted = (remainingCents / 100).toFixed(2);

  // Decide which amount to show based on status
  const displayAmount =
    session.status === "PARTIAL" ? remainingFormatted : amountFormatted;

  // Handle payment updates from WebSocket
  const handlePaymentUpdate = useCallback(
    (event: PaymentEvent) => {
      // Update local state for immediate feedback
      setSession((prev) => ({
        ...prev,
        status: event.status,
        amountPaidCents: event.amountPaidCents ?? prev.amountPaidCents,
      }));

      if (event.status === "PAID") {
        toast.success(tToast("paymentReceived"), {
          description: tToast("paymentReceivedDescription"),
        });

        // Trigger redirect if configured
        if (session.redirectUrl) {
          setRedirecting(true);
        }
      } else if (event.status === "EXPIRED") {
        toast.error(tToast("paymentExpired"));
      } else if (event.status === "FAILED") {
        toast.error(tToast("paymentFailed"));
      }

      // Refresh any queries that might depend on this session
      if (slug) {
        void queryClient.invalidateQueries({
          queryKey: trpc.payment.getByReference.queryKey({
            slug,
            referenceId: session.referenceId,
          }),
        });
      }
    },
    [
      queryClient,
      trpc.payment.getByReference,
      slug,
      session.referenceId,
      session.redirectUrl,
      tToast,
    ],
  );

  const { isConnected } = usePaymentSocket({
    sessionId:
      session.status === "PENDING" || session.status === "PARTIAL"
        ? session.sessionId
        : "",
    clientToken: session.clientToken,
    onPaymentUpdate: handlePaymentUpdate,
  });

  const handleSimulatePayment = async () => {
    try {
      const res = await fetch(
        `${env.NEXT_PUBLIC_APP_URL}/api/v1/sessions/${session.sessionId}/simulate-payment`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.clientToken}`,
          },
        },
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

  // Render QR code when in pending state
  useEffect(() => {
    if (
      session.sepaQrString &&
      canvasRef.current &&
      (session.status === "PENDING" || session.status === "PARTIAL")
    ) {
      void QRCode.toCanvas(canvasRef.current, session.sepaQrString, {
        width: 180,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff", // Force white behind QR for scanning
        },
      });
    }
  }, [session.sepaQrString, session.status]);

  // Success State
  if (session.status === "PAID") {
    return (
      <WidgetWrapper isEmbedded={isEmbedded}>
        <div className="mx-auto w-full max-w-md">
          <Card className="relative overflow-hidden rounded-3xl border border-green-500/30 bg-green-500/5 shadow-2xl backdrop-blur-sm dark:bg-green-950/20">
            <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-green-400 to-green-600" />
            <div
              className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
              aria-hidden="true"
            >
              <div className="relative left-[calc(50%-11rem)] aspect-1155/678 w-144.5 -translate-x-1/2 rotate-30 bg-linear-to-tr from-green-500 to-emerald-300 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
            </div>

            <CardContent className="z-10 flex flex-col items-center space-y-6 p-6 text-center sm:p-8">
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-green-500/20 bg-green-500/20 shadow-[0_0_40px_rgba(34,197,94,0.3)]">
                <CheckIcon className="h-12 w-12 text-green-500 drop-shadow-md" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-extrabold tracking-tight text-green-600 dark:text-green-400">
                  {t("paymentComplete")}
                </h2>
                <p className="text-foreground text-5xl font-black tracking-tighter">
                  €{amountFormatted}
                </p>
              </div>

              <div className="border-border/50 bg-card/50 w-full space-y-4 rounded-2xl border p-5 text-left shadow-sm backdrop-blur-md">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-medium">
                    {tDetails("status")}
                  </span>
                  <span className="rounded-md bg-green-500/10 px-2.5 py-1 text-[10px] font-black tracking-widest text-green-700 uppercase dark:text-green-300">
                    {tCommon("status.paid")}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-medium">
                    {tDetails("reference")}
                  </span>
                  <span className="text-foreground bg-secondary/50 rounded px-2 py-1 font-mono text-xs font-bold">
                    {session.referenceId}
                  </span>
                </div>
              </div>

              {redirecting && (
                <div className="flex w-full flex-col items-center space-y-3 pt-4">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-green-500/20">
                    <div className="animate-progress h-full rounded-full bg-green-500" />
                  </div>
                  <p className="text-muted-foreground animate-pulse text-[10px] font-bold tracking-widest uppercase">
                    Redirecting...
                  </p>
                </div>
              )}

              {!isEmbedded && slug && (
                <Link href={`/${slug}/payments/new`} className="w-full pt-2">
                  <Button className="h-14 w-full rounded-xl text-sm font-black tracking-widest uppercase shadow-lg shadow-green-500/20 transition-shadow hover:shadow-green-500/40">
                    {t("createNewPayment")}
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </div>
      </WidgetWrapper>
    );
  }

  // Failed/Expired State
  if (session.status === "FAILED" || session.status === "EXPIRED") {
    const isExpired = session.status === "EXPIRED";
    return (
      <WidgetWrapper isEmbedded={isEmbedded}>
        <div className="mx-auto w-full max-w-md">
          <Card className="relative overflow-hidden rounded-3xl border border-red-500/30 bg-red-500/5 shadow-2xl backdrop-blur-sm dark:bg-red-950/20">
            <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-red-400 to-red-600" />
            <CardContent className="z-10 flex flex-col items-center space-y-6 p-6 text-center sm:p-8">
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-red-500/20 bg-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                <Cross2Icon className="h-12 w-12 text-red-500 drop-shadow-md" />
              </div>
              <div className="space-y-4">
                <h2 className="text-3xl font-extrabold tracking-tight text-red-600 dark:text-red-400">
                  {isExpired ? t("paymentExpired") : t("paymentFailed")}
                </h2>
                <p className="text-muted-foreground rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm leading-relaxed font-medium">
                  {isExpired ? t("expiredDescription") : t("failedDescription")}
                </p>
              </div>

              {!isEmbedded && slug && (
                <Link href={`/${slug}/payments/new`} className="w-full pt-4">
                  <Button
                    className="h-14 w-full rounded-xl text-sm font-black tracking-widest uppercase shadow-lg shadow-red-500/20 transition-shadow hover:shadow-red-500/40"
                    variant="destructive"
                  >
                    {t("createNewPayment")}
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </div>
      </WidgetWrapper>
    );
  }

  // Pending State (Default)
  return (
    <WidgetWrapper isEmbedded={isEmbedded}>
      <div className="grid w-full grid-cols-1 items-start gap-8 lg:grid-cols-2 lg:gap-10">
        {/* Left Column: QR Code & Status */}
        <div className="order-1 flex w-full flex-col items-center space-y-5 pt-2 lg:space-y-6 lg:pt-0">
          {!isEmbedded && (
            <div className="flex w-full justify-center lg:hidden">
              <WidgetHeader
                organization={session.organization}
                referenceId={session.referenceId}
                tDetails={tDetails}
              />
            </div>
          )}

          <Card className="border-border/40 bg-card group dark:bg-card/40 relative w-full max-w-[340px] overflow-hidden rounded-3xl border shadow-lg backdrop-blur-xl lg:max-w-none lg:rounded-4xl lg:shadow-2xl">
            {/* Ambient Background Glow */}
            <div className="from-primary/10 pointer-events-none absolute inset-0 bg-linear-to-br via-transparent to-transparent opacity-50" />

            <CardContent className="relative flex flex-col items-center space-y-6 p-6">
              {/* Connection Status */}
              <div className="bg-secondary/80 border-border/50 text-foreground z-10 flex w-fit items-center gap-2.5 rounded-full border px-5 py-2 text-[10px] font-black tracking-[0.2em] uppercase shadow-sm backdrop-blur-md">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    isConnected
                      ? "bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.8)]"
                      : "animate-pulse bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.8)]"
                  }`}
                />
                <span className="opacity-90">
                  {isConnected ? t("listening") : t("connecting")}
                </span>
              </div>

              {/* Amount Info */}
              <div className="group/amount relative space-y-1 text-center">
                {session.status === "PARTIAL" && (
                  <p className="mb-2 text-xs font-bold tracking-wider text-amber-500 uppercase">
                    Partial Payment: €{amountPaidFormatted} Received
                  </p>
                )}
                <div className="flex items-center justify-center gap-2">
                  <p className="text-foreground text-4xl font-black tracking-tighter drop-shadow-sm lg:text-5xl">
                    €{displayAmount}
                  </p>
                  <div className="opacity-0 transition-opacity duration-300 group-hover/amount:opacity-100">
                    <CopyButton
                      value={displayAmount}
                      className="bg-secondary/80 hover:bg-secondary h-8 w-8 [&>svg]:h-4 [&>svg]:w-4"
                    />
                  </div>
                </div>
                {session.status === "PARTIAL" && (
                  <p className="text-muted-foreground mt-2 text-[10px] font-bold tracking-widest uppercase">
                    Remaining of €{amountFormatted} Total
                  </p>
                )}
              </div>

              {/* QR Code */}
              <div className="group/qr relative w-full max-w-[200px]">
                <div className="bg-primary absolute -inset-2 rounded-4xl opacity-20 blur-3xl transition duration-1000 group-hover/qr:opacity-50 group-hover/qr:duration-300" />
                <div className="border-muted ring-muted/20 relative flex items-center justify-center rounded-3xl border bg-white p-4 shadow-xl ring-4">
                  <canvas
                    ref={canvasRef}
                    className="block h-auto max-w-full rounded-xl"
                  />
                  <div className="border-border absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-white p-2 shadow-lg">
                    <span className="text-primary text-[8px] font-black tracking-tighter uppercase">
                      GetBlitz
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-muted-foreground flex w-full items-center justify-center gap-2 text-[9px] font-bold tracking-[0.2em] uppercase">
                <span className="bg-border/80 h-px w-6" />
                Scan with Bank App
                <span className="bg-border/80 h-px w-6" />
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Organization Branding & Manual Details */}
        <div className="order-2 mx-auto flex w-full max-w-[340px] flex-col space-y-5 self-stretch pt-2 lg:mx-0 lg:max-w-none lg:space-y-6 lg:pt-0">
          {!isEmbedded && (
            <div className="hidden lg:block">
              <WidgetHeader
                organization={session.organization}
                referenceId={session.referenceId}
                tDetails={tDetails}
              />
            </div>
          )}

          <div className="flex flex-col space-y-4 lg:pl-2">
            <div className="flex items-center gap-3">
              <div className="bg-border/60 h-px flex-1" />
              <p className="text-foreground/80 dark:text-muted-foreground text-[10px] font-black tracking-widest whitespace-nowrap uppercase">
                Or Transfer Manually
              </p>
              <div className="bg-border/60 h-px flex-1" />
            </div>

            <div className="flex flex-col space-y-2">
              <ManualDetailRow
                label={tDetails("amount")}
                value={`€${displayAmount}`}
                copyValue={displayAmount}
              />
              {session.bankAccount?.iban && (
                <ManualDetailRow
                  label={tDetails("iban")}
                  value={session.bankAccount.iban}
                  mono
                />
              )}
              <ManualDetailRow
                label="Account Name"
                value={session.bankAccount?.accountName ?? ""}
              />
              <ManualDetailRow
                label={tDetails("reference")}
                value={session.referenceId}
                mono
              />
            </div>
          </div>

          <div className="border-border/50 mt-auto flex flex-col space-y-4 border-t pt-6 lg:pl-2">
            <div className="text-muted-foreground flex w-full items-center justify-between">
              {session.provider && (
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold tracking-widest uppercase opacity-70">
                    Bank Provider:
                  </span>
                  <span className="text-foreground text-[10px] font-black uppercase">
                    {session.provider.displayName}
                  </span>
                </div>
              )}

              {session.expiresAt && (
                <div className="flex shrink-0 flex-col items-end">
                  <span className="rounded-md border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[9px] font-bold tracking-[0.1em] text-amber-600 uppercase dark:text-amber-400">
                    Expires{" "}
                    <span suppressHydrationWarning>
                      {mounted
                        ? new Date(session.expiresAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                    </span>
                  </span>
                </div>
              )}
            </div>

            {env.NODE_ENV === "development" && (
              <div className="w-full border-t border-amber-500/20 pt-4">
                <p className="mb-2 text-center text-xs text-amber-500">
                  {t("developmentOnly")}
                </p>
                <Button
                  variant="outline"
                  className="w-full border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
                  onClick={() => void handleSimulatePayment()}
                >
                  {t("simulatePayment")}
                </Button>
              </div>
            )}

            {!isEmbedded && (
              <div className="w-full">
                <p className="text-muted-foreground max-w-[200px] text-left text-[9px] leading-relaxed font-black tracking-[0.3em] uppercase opacity-40">
                  Payment handled securely by GetBlitz
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </WidgetWrapper>
  );
}
