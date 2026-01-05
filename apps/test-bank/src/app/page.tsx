"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import type { EpcQrData } from "./qr-scanner";
import { env } from "~/env";
import { QrScanner } from "./qr-scanner";

interface PaymentFormData {
  reference: string;
  amount: string;
  selectedDomain: string;
  connectionId: string;
}

/**
 * Parse allowed domains from env, filtering out empty strings
 */
function parseAllowedDomains(envValue: string): string[] {
  return envValue
    .split(",")
    .map((d) => d.trim())
    .filter((d) => d.length > 0);
}

function PayContent() {
  const searchParams = useSearchParams();

  const allowedDomains = useMemo(
    () => parseAllowedDomains(env.NEXT_PUBLIC_ALLOWED_WEBHOOK_DOMAINS),
    [],
  );

  const [formData, setFormData] = useState<PaymentFormData>({
    reference: searchParams.get("reference") ?? "",
    amount: searchParams.get("amount") ?? "",
    selectedDomain: allowedDomains[0] ?? "http://localhost:3000",
    connectionId: searchParams.get("connectionId") ?? "",
  });

  const [showScanner, setShowScanner] = useState(false);
  const [scannedBeneficiary, setScannedBeneficiary] = useState<string | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Build the webhook URL from domain and slug
  const webhookUrl = useMemo(() => {
    if (!formData.connectionId.trim()) return "";
    return `${formData.selectedDomain.trim()}/api/webhooks/connection/${formData.connectionId.trim()}`;
  }, [formData.selectedDomain, formData.connectionId]);

  const handleChange = (field: keyof PaymentFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleQrScan = (data: EpcQrData) => {
    setFormData((prev) => ({
      ...prev,
      reference: data.reference,
      amount: data.amount.toFixed(2),
    }));
    setScannedBeneficiary(data.beneficiaryName);
    setShowScanner(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setResult(null);

    try {
      // Validate slug
      if (!formData.connectionId.trim()) {
        throw new Error("Connection ID is required.");
      }

      // Parse amount
      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error("Invalid amount. Please enter a positive number.");
      }

      // Call our API route which will handle the server-to-server webhook call
      const response = await fetch("/api/send-webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reference: formData.reference,
          amount: amount,
          webhookUrl: webhookUrl,
        }),
      });

      const responseData = (await response.json()) as unknown;

      if (!response.ok) {
        throw new Error(
          (responseData as { message?: string; error?: string }).message ??
            (responseData as { message?: string; error?: string }).error ??
            "Failed to send webhook",
        );
      }

      setResult({
        success: true,
        message:
          (responseData as { message?: string }).message ??
          `Payment notification sent successfully! Reference: ${formData.reference}`,
      });

      console.log(
        "Webhook response:",
        (responseData as { data?: unknown }).data,
      );
    } catch (error) {
      setResult({
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-(--tb-text)">
          Payment Simulator
        </h2>
        <p className="mt-1 text-(--tb-text-muted)">
          Scan QR or enter details to simulate bank transfer
        </p>
      </div>

      {/* QR Scanner Button */}
      <button
        type="button"
        onClick={() => setShowScanner(true)}
        className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed border-(--tb-accent)/30 bg-(--tb-accent)/5 px-6 py-8 text-[var(--tb-accent)] transition-all hover:border-[var(--tb-accent)]/50 hover:bg-[var(--tb-accent)]/10"
      >
        <svg
          className="h-8 w-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
          />
        </svg>
        <div className="text-left">
          <span className="block font-semibold">Scan Payment QR Code</span>
          <span className="block text-sm text-(--tb-accent)/70">
            Use camera to auto-fill payment details
          </span>
        </div>
      </button>

      {showScanner && (
        <QrScanner
          onScan={handleQrScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-2xl border border-[var(--tb-accent)]/20 bg-[var(--tb-bg-secondary)]/80 p-6 backdrop-blur-sm">
          <h3 className="mb-4 font-semibold text-[var(--tb-text)]">
            Payment Details
          </h3>

          {scannedBeneficiary && (
            <div className="mb-4 rounded-lg border border-[var(--tb-accent)]/20 bg-[var(--tb-accent)]/10 p-3">
              <p className="text-xs text-[var(--tb-accent)]/70">
                Scanned from QR:
              </p>
              <p className="font-medium text-[var(--tb-accent)]">
                {scannedBeneficiary}
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--tb-text-muted)]">
                Reference ID <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.reference}
                onChange={(e) => handleChange("reference", e.target.value)}
                placeholder="GB-ABC12345"
                className="w-full rounded-lg border border-[var(--tb-border)] bg-[var(--tb-bg)]/70 px-4 py-3 font-mono text-[var(--tb-accent)] placeholder-[var(--tb-text-muted)]/50 focus:border-[var(--tb-accent)] focus:ring-1 focus:ring-[var(--tb-accent)] focus:outline-none"
                required
              />
              <p className="mt-1 text-xs text-[var(--tb-text-muted)]/70">
                The GetBlitz (GB) reference from the payment QR code
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--tb-text-muted)]">
                Amount (EUR) <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute top-1/2 left-4 -translate-y-1/2 text-[var(--tb-text-muted)]">
                  €
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.amount}
                  onChange={(e) => handleChange("amount", e.target.value)}
                  placeholder="9.99"
                  className="w-full rounded-lg border border-[var(--tb-border)] bg-[var(--tb-bg)]/70 py-3 pr-4 pl-8 text-[var(--tb-text)] placeholder-[var(--tb-text-muted)]/50 focus:border-[var(--tb-accent)] focus:ring-1 focus:ring-[var(--tb-accent)] focus:outline-none"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--tb-border)] bg-[var(--tb-bg-secondary)]/80 p-6 backdrop-blur-sm">
          <h3 className="mb-4 font-semibold text-[var(--tb-text)]">
            Webhook Configuration
          </h3>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--tb-text-muted)]">
                Target Domain <span className="text-red-400">*</span>
              </label>
              <select
                value={formData.selectedDomain}
                onChange={(e) => handleChange("selectedDomain", e.target.value)}
                className="w-full rounded-lg border border-[var(--tb-border)] bg-[var(--tb-bg)]/70 px-4 py-3 text-[var(--tb-text)] focus:border-[var(--tb-accent)] focus:ring-1 focus:ring-[var(--tb-accent)] focus:outline-none"
              >
                {allowedDomains.map((domain) => (
                  <option key={domain} value={domain}>
                    {domain}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-[var(--tb-text-muted)]/70">
                Select the target application domain
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--tb-text-muted)]">
                Connection ID <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.connectionId}
                onChange={(e) => handleChange("connectionId", e.target.value)}
                placeholder="connection-id"
                className="w-full rounded-lg border border-[var(--tb-border)] bg-[var(--tb-bg)]/70 px-4 py-3 text-[var(--tb-text)] placeholder-[var(--tb-text-muted)]/50 focus:border-[var(--tb-accent)] focus:ring-1 focus:ring-[var(--tb-accent)] focus:outline-none"
                required
              />
              <p className="mt-1 text-xs text-(--tb-text-muted)/70">
                The connection ID for webhook routing
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--tb-text-muted)]">
                Webhook URL (auto-generated)
              </label>
              <div className="w-full rounded-lg border border-[var(--tb-border)] bg-[var(--tb-bg)]/50 px-4 py-3 font-mono text-xs break-all text-[var(--tb-text-muted)]">
                {webhookUrl || (
                  <span className="text-[var(--tb-text-muted)]/50 italic">
                    Enter organization slug to generate URL
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-lg bg-[var(--tb-bg)]/50 p-4">
            <p className="text-xs text-[var(--tb-text-muted)]/70">
              Bank Provider:
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-[var(--tb-accent)]/20 px-3 py-1 text-sm font-medium text-[var(--tb-accent)]">
                test-bank
              </span>
              <span className="text-xs text-[var(--tb-text-muted)]/70">
                (this simulated bank)
              </span>
            </div>
          </div>
        </div>

        {result && (
          <div
            className={`rounded-lg p-4 ${
              result.success
                ? "border border-green-500/30 bg-green-500/10 text-green-400"
                : "border border-red-500/30 bg-red-500/10 text-red-400"
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-lg">{result.success ? "✓" : "✗"}</span>
              <p className="text-sm">{result.message}</p>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !webhookUrl}
          className="w-full rounded-lg bg-gradient-to-r from-amber-600 to-yellow-600 px-4 py-4 font-semibold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-amber-500/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Sending Payment Notification...
            </span>
          ) : (
            "💸 Complete Payment & Send Webhook"
          )}
        </button>
      </form>

      <div className="rounded-xl border border-[var(--tb-border)] bg-(--tb-bg-secondary)/80 p-6">
        <h4 className="mb-3 font-medium text-[var(--tb-text)]">
          What happens when you submit?
        </h4>
        <ol className="space-y-2 text-sm text-[var(--tb-text-muted)]">
          <li className="flex gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--tb-accent)]/20 text-xs text-[var(--tb-accent)]">
              1
            </span>
            Test Bank generates a transaction matching the Qonto webhook format
          </li>
          <li className="flex gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--tb-accent)]/20 text-xs text-[var(--tb-accent)]">
              2
            </span>
            The webhook is sent to:{" "}
            <code className="break-all text-[var(--tb-accent)]/70">
              {webhookUrl || "..."}
            </code>
          </li>
          <li className="flex gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-(--tb-accent)/20 text-xs text-[var(--tb-accent)]">
              3
            </span>
            Your app processes the payment and updates the session status
          </li>
          <li className="flex gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-(--tb-accent)/20 text-xs text-[var(--tb-accent)]">
              4
            </span>
            The client widget receives the success event via WebSocket
          </li>
        </ol>
      </div>

      <div className="text-center text-sm text-(--tb-text-muted)/70">
        <p>
          This is a test bank for development purposes. No real transactions are
          processed.
        </p>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-xl rounded-2xl border border-(--tb-border) bg-(--tb-bg-secondary)/80 p-8 text-center">
          <div className="animate-pulse text-(--tb-text-muted)">Loading...</div>
        </div>
      }
    >
      <PayContent />
    </Suspense>
  );
}
