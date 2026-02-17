"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import type { GetBlitz } from "@getblitz/client";

import { env } from "~/env";

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const productId = searchParams.get("product");
  const amount = parseInt(searchParams.get("amount") ?? "0", 10);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [clientToken, setClientToken] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "paid" | "error">(
    "loading",
  );
  const [error, setError] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const paymentRef = useRef<GetBlitz | null>(null);
  const mountedRef = useRef(false);
  const sessionCreatedRef = useRef(false);

  const handleSimulatePayment = async () => {
    if (!sessionId || isSimulating) return;

    setIsSimulating(true);
    try {
      const res = await fetch(
        `${env.NEXT_PUBLIC_GETBLITZ_API_URL}/api/v1/sessions/${sessionId}/simulate-payment`,
        { method: "POST" },
      );

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Simulation failed");
      }
      // Success will be handled by WebSocket event
    } catch (err) {
      setError(err instanceof Error ? err.message : "Simulation failed");
    } finally {
      setIsSimulating(false);
    }
  };

  // Create payment session
  useEffect(() => {
    if (!amount || amount <= 0) {
      setError("Invalid amount");
      setStatus("error");
      return;
    }

    // Prevent duplicate session creation (React StrictMode / fast remounts)
    if (sessionCreatedRef.current) return;
    sessionCreatedRef.current = true;

    async function createPayment() {
      try {
        const res = await fetch("/api/create-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount, productId }),
        });

        if (!res.ok) throw new Error("Failed to create payment");

        const data = (await res.json()) as {
          sessionId: string;
          clientToken: string;
        };
        setSessionId(data.sessionId);
        setClientToken(data.clientToken);
        setStatus("ready");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setStatus("error");
      }
    }

    void createPayment();
  }, [amount, productId]);

  // Initialize GetBlitz SDK when session is ready
  useEffect(() => {
    if (status !== "ready" || !sessionId || !clientToken) return;
    // Prevent double mount in React StrictMode
    if (mountedRef.current) return;
    mountedRef.current = true;

    const currentSessionId = sessionId;
    const currentClientToken = clientToken;
    let cancelled = false;

    async function initWidget() {
      // Dynamic import of GetBlitz client
      const { GetBlitz } = await import("@getblitz/client");

      // Check if cleanup was called during async import
      if (cancelled) return;

      // Clear any existing content in the container (defensive)
      const container = document.querySelector("#getblitz-widget");
      if (container) container.innerHTML = "";

      const payment = new GetBlitz({
        sessionId: currentSessionId,
        clientToken: currentClientToken,
        wssUrl: env.NEXT_PUBLIC_GETBLITZ_WSS_URL,
        apiUrl: env.NEXT_PUBLIC_GETBLITZ_API_URL,
      });

      paymentRef.current = payment;

      payment.on("onSuccess", (token: string) => {
        console.log("Payment successful! Token:", token);
        setStatus("paid");
        // Redirect after short delay
        setTimeout(() => {
          router.push(`/success?session=${currentSessionId}&token=${token}`);
        }, 1500);
      });

      payment.on("onError", (err: Error) => {
        console.error("Payment error:", err);
        setError(err.message);
      });

      await payment.mount("#getblitz-widget");
    }

    void initWidget();

    return () => {
      cancelled = true;
      if (paymentRef.current) {
        paymentRef.current.destroy();
        paymentRef.current = null;
      }
      mountedRef.current = false;
    };
  }, [status, sessionId, clientToken, router]);

  if (status === "error") {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-red-500/50 bg-red-500/10 p-6 text-center">
        <p className="text-red-400">{error}</p>
        <Link
          href="/"
          className="mt-4 inline-block text-sm text-slate-400 hover:text-white"
        >
          ← Back to store
        </Link>
      </div>
    );
  }

  if (status === "paid") {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-emerald-500/50 bg-emerald-500/10 p-6 text-center">
        <div className="mb-4 text-5xl">✓</div>
        <h2 className="text-xl font-bold text-emerald-400">
          Payment Received!
        </h2>
        <p className="mt-2 text-slate-400">Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Complete Payment</h1>
        <p className="mt-1 text-slate-400">
          Amount: €{(amount / 100).toFixed(2)}
        </p>
      </div>

      {status === "loading" ? (
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-8 text-center">
          <div className="animate-pulse text-slate-400">
            Creating payment session...
          </div>
        </div>
      ) : (
        <>
          {/* GetBlitz Widget Container */}
          <div id="getblitz-widget" className="min-h-[400px]" />

          {/* Simulate Payment Button (for testing) */}
          <div className="mt-4 border-t border-slate-700 pt-4">
            <p className="mb-2 text-center text-xs text-amber-500/80">
              Test Mode
            </p>
            <button
              onClick={handleSimulatePayment}
              disabled={isSimulating}
              className="w-full rounded-lg bg-amber-600 px-4 py-3 font-medium text-white transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSimulating ? "Simulating..." : "⚡ Simulate Payment"}
            </button>
          </div>
        </>
      )}

      <Link
        href="/"
        className="block text-center text-sm text-slate-400 hover:text-white"
      >
        ← Cancel and return to store
      </Link>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md rounded-xl border border-slate-700 bg-slate-800/50 p-8 text-center">
          <div className="animate-pulse text-slate-400">Loading...</div>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
