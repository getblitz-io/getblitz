"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

function AuthorizeContent() {
  const searchParams = useSearchParams();
  const redirectUri = searchParams.get("redirect_uri");
  const state = searchParams.get("state");
  const [isAuthorizing, setIsAuthorizing] = useState(false);

  const handleAuthorize = () => {
    if (!redirectUri) return;

    setIsAuthorizing(true);

    // Generate a dummy authorization code
    const code = `test_auth_code_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Redirect back with the code
    const url = new URL(redirectUri);
    url.searchParams.set("code", code);
    if (state) {
      url.searchParams.set("state", state);
    }

    window.location.href = url.toString();
  };

  const handleDeny = () => {
    if (!redirectUri) return;

    const url = new URL(redirectUri);
    url.searchParams.set("error", "access_denied");
    if (state) {
      url.searchParams.set("state", state);
    }

    window.location.href = url.toString();
  };

  if (!redirectUri) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
        <p className="text-red-400">Missing redirect_uri parameter</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="rounded-2xl border border-[var(--tb-accent)]/20 bg-[var(--tb-bg-secondary)]/80 p-8 backdrop-blur-sm">
        <div className="mb-6 text-center">
          <div className="mb-4 text-5xl">🔐</div>
          <h2 className="text-xl font-semibold text-[var(--tb-text)]">
            Authorization Request
          </h2>
          <p className="mt-2 text-sm text-[var(--tb-text-muted)]">
            An application is requesting access to your Test Bank account
          </p>
        </div>

        <div className="mb-6 rounded-lg bg-[var(--tb-bg)]/50 p-4">
          <p className="text-xs text-[var(--tb-text-muted)]/70">Redirect to:</p>
          <p className="mt-1 text-sm break-all text-[var(--tb-text-muted)]">
            {redirectUri}
          </p>
        </div>

        <div className="mb-6 space-y-2 rounded-lg bg-[var(--tb-accent)]/10 p-4">
          <p className="text-sm font-medium text-[var(--tb-accent)]">
            Permissions requested:
          </p>
          <ul className="space-y-1 text-sm text-[var(--tb-text-muted)]">
            <li className="flex items-center gap-2">
              <span className="text-[var(--tb-accent)]">✓</span>
              View account information
            </li>
            <li className="flex items-center gap-2">
              <span className="text-[var(--tb-accent)]">✓</span>
              Receive transaction notifications
            </li>
          </ul>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleDeny}
            disabled={isAuthorizing}
            className="flex-1 rounded-lg border border-[var(--tb-border)] bg-[var(--tb-bg)] px-4 py-3 font-medium text-[var(--tb-text-muted)] transition-colors hover:bg-[var(--tb-border)] disabled:opacity-50"
          >
            Deny
          </button>
          <button
            onClick={handleAuthorize}
            disabled={isAuthorizing}
            className="flex-1 rounded-lg bg-gradient-to-r from-amber-600 to-yellow-600 px-4 py-3 font-medium text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-amber-500/25 disabled:opacity-50"
          >
            {isAuthorizing ? "Authorizing..." : "Authorize"}
          </button>
        </div>
      </div>

      <p className="text-center text-xs text-[var(--tb-text-muted)]/70">
        This is a test bank for development purposes only.
      </p>
    </div>
  );
}

export default function AuthorizePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md rounded-2xl border border-[var(--tb-border)] bg-[var(--tb-bg-secondary)]/80 p-8 text-center">
          <div className="animate-pulse text-[var(--tb-text-muted)]">
            Loading...
          </div>
        </div>
      }
    >
      <AuthorizeContent />
    </Suspense>
  );
}
