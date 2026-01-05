import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Test Bank | Payment Simulator",
  description:
    "Test bank for simulating payments in the GetBlitz payment gateway",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen text-[var(--tb-text)] antialiased">
        <div className="mx-auto max-w-4xl px-4 py-12">
          <header className="mb-10 text-center">
            <div className="relative mx-auto mb-4 flex h-20 w-20 items-center justify-center">
              {/* Decorative rings */}
              <div className="absolute inset-0 rounded-full border-2 border-[var(--tb-accent)]/20" />
              <div className="absolute inset-2 rounded-full border border-[var(--tb-accent)]/30" />
              <div className="absolute inset-4 rounded-full bg-[var(--tb-accent)]/10" />
              <span className="relative text-4xl">🏦</span>
            </div>
            <h1 className="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
              Test Bank
            </h1>
            <p className="mt-2 text-sm text-[var(--tb-text-muted)]">
              Payment Simulator for GetBlitz
            </p>
            <div className="mx-auto mt-3 flex max-w-xs items-center justify-center gap-2">
              <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[var(--tb-accent)]/50" />
              <span className="rounded-full bg-[var(--tb-accent)]/20 px-3 py-1 text-xs font-medium text-[var(--tb-accent)]">
                Sandbox Mode
              </span>
              <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[var(--tb-accent)]/50" />
            </div>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
