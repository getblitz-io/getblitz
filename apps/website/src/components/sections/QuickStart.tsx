"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { useScrollReveal } from "../ScrollReveal";

const TERMINAL_LINES = [
  { text: "# Clone the repo", type: "comment" },
  {
    text: "git clone https://github.com/getblitz-io/getblitz.git",
    type: "command",
  },
  { text: "", type: "blank" },
  { text: "# Install dependencies", type: "comment" },
  { text: "pnpm install", type: "command" },
  { text: "", type: "blank" },
  { text: "# Start infrastructure", type: "comment" },
  { text: "docker compose up -d", type: "command" },
  { text: "", type: "blank" },
  { text: "# Setup database", type: "comment" },
  { text: "pnpm db:push", type: "command" },
  { text: "", type: "blank" },
  { text: "# Start all services", type: "comment" },
  { text: "pnpm dev", type: "command" },
];

function TerminalAnimation() {
  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    if (visibleLines >= TERMINAL_LINES.length) return;

    const delay = TERMINAL_LINES[visibleLines]?.type === "blank" ? 100 : 400;
    const timer = setTimeout(() => {
      setVisibleLines((prev) => prev + 1);
    }, delay);

    return () => clearTimeout(timer);
  }, [visibleLines]);

  return (
    <div className="border-border bg-card/60 mx-auto max-w-2xl overflow-hidden rounded-2xl border backdrop-blur-sm">
      {/* Terminal header */}
      <div className="border-border bg-secondary/30 flex items-center gap-2 border-b px-4 py-3">
        <div className="flex gap-1.5">
          <div className="bg-destructive/60 h-3 w-3 rounded-full" />
          <div
            className="h-3 w-3 rounded-full opacity-40"
            style={{ background: "oklch(0.8 0.15 90)" }}
          />
          <div
            className="h-3 w-3 rounded-full opacity-40"
            style={{ background: "oklch(0.7 0.15 145)" }}
          />
        </div>
        <span className="text-muted-foreground ml-2 text-xs">Terminal</span>
      </div>

      {/* Terminal content */}
      <div className="code-block min-h-64 p-6">
        {TERMINAL_LINES.slice(0, visibleLines).map((line, i) => (
          <div key={i} className="flex items-start gap-2">
            {line.type !== "blank" && (
              <span
                style={{
                  color:
                    line.type === "comment"
                      ? "var(--muted-foreground)"
                      : "oklch(0.65 0.18 145)",
                }}
              >
                {line.type === "command" && (
                  <span style={{ color: "var(--primary)" }}>$ </span>
                )}
                {line.text}
              </span>
            )}
            {line.type === "blank" && <span>&nbsp;</span>}
          </div>
        ))}
        {visibleLines < TERMINAL_LINES.length && (
          <span
            className="terminal-cursor"
            style={{ color: "var(--primary)" }}
          />
        )}
      </div>
    </div>
  );
}

export function QuickStartSection() {
  const t = useTranslations("quickstart");
  const ref = useScrollReveal();

  return (
    <section id="quickstart" className="relative py-32" ref={ref}>
      {/* Background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-5"
        style={{
          background:
            "radial-gradient(ellipse at center, var(--primary) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="mb-12 text-center">
          <span className="reveal-up border-primary/30 bg-primary/10 text-primary mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium">
            {t("badge")}
          </span>
          <h2
            className="reveal-up font-display text-foreground mb-4 font-bold delay-100"
            style={{ fontSize: "clamp(1.8rem, 5vw, 3.5rem)", lineHeight: 1.1 }}
          >
            {t("headline")}
            <br />
            <span className="gradient-text">{t("headlineAccent")}</span>
          </h2>
        </div>

        {/* Terminal */}
        <div className="reveal-up mb-12 delay-200">
          <TerminalAnimation />
        </div>

        {/* CTAs */}
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href="https://github.com/getblitz-io/getblitz"
            target="_blank"
            rel="noopener noreferrer"
            className="border-border bg-secondary/30 text-foreground hover:border-primary/40 hover:bg-primary/5 inline-flex items-center gap-2.5 rounded-xl border px-8 py-3.5 text-base font-semibold backdrop-blur-sm transition-all hover:scale-105"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 fill-current"
              aria-hidden="true"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            ⭐ {t("github")}
          </a>
          <a
            href="https://app.getblitz.io"
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-base font-semibold transition-all hover:scale-105 hover:shadow-xl"
          >
            {t("trial")}
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
