"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

function AnimatedNumber({
  target,
  suffix = "",
}: {
  target: number;
  suffix?: string;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !started.current) {
          started.current = true;
          const duration = 1500;
          const step = target / (duration / 16);
          let current = 0;
          const timer = setInterval(() => {
            current += step;
            if (current >= target) {
              setCount(target);
              clearInterval(timer);
            } else {
              setCount(Math.floor(current));
            }
          }, 16);
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target]);

  return (
    <span ref={ref}>
      {count}
      {suffix}
    </span>
  );
}

export function HeroSection() {
  const t = useTranslations("hero");

  return (
    <section
      className="relative flex min-h-screen items-center justify-center overflow-hidden pt-16"
      id="hero"
    >
      {/* Background grid */}
      <div className="bg-grid-pattern absolute inset-0 opacity-40" />

      {/* Gradient orbs */}
      <div
        className="pointer-events-none absolute top-1/4 left-1/4 h-96 w-96 rounded-full opacity-20 blur-3xl"
        style={{ background: "var(--primary)" }}
      />
      <div
        className="pointer-events-none absolute right-1/4 bottom-1/4 h-80 w-80 rounded-full opacity-10 blur-3xl"
        style={{ background: "oklch(0.6 0.2 210)" }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-24 text-center">
        {/* Badge */}
        <div className="border-border bg-secondary/50 text-muted-foreground mb-8 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs backdrop-blur-sm">
          <span className="live-pulse" />
          {t("badge")}
        </div>

        {/* Headline */}
        <h1
          className="font-display mb-6 font-bold tracking-tight"
          style={{
            fontSize: "clamp(2.5rem, 8vw, 6rem)",
            lineHeight: 1.05,
          }}
        >
          <span className="text-foreground">{t("headline")}</span>
          <br />
          <span className="gradient-text">{t("headlineAccent")}</span>
        </h1>

        {/* Subheadline */}
        <p className="text-muted-foreground mx-auto mb-10 max-w-2xl text-lg leading-relaxed">
          {t("subheadline")}
        </p>

        {/* CTAs */}
        <div className="mb-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href="https://app.getblitz.io"
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-base font-semibold transition-all hover:scale-105 hover:shadow-xl"
          >
            {t("ctaPrimary")}
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
          <a
            href="https://github.com/getblitz-io/getblitz"
            target="_blank"
            rel="noopener noreferrer"
            className="border-border bg-secondary/30 text-foreground hover:bg-secondary/60 inline-flex items-center gap-2 rounded-xl border px-8 py-3.5 text-base font-semibold backdrop-blur-sm transition-all hover:scale-105"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 fill-current"
              aria-hidden="true"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            {t("ctaSecondary")}
          </a>
        </div>

        {/* Trust bar */}
        <div className="text-muted-foreground mb-16 flex flex-wrap items-center justify-center gap-6 text-sm">
          <span className="flex items-center gap-2">
            🇪🇺 {t("trustBar.sepa")}
          </span>
          <span className="text-border">|</span>
          <span className="flex items-center gap-2">
            🔐 {t("trustBar.selfHosted")}
          </span>
          <span className="text-border">|</span>
          <span className="flex items-center gap-2">
            ⚡ {t("trustBar.realtime")}
          </span>
          <span className="text-border">|</span>
          <span className="flex items-center gap-2">
            🧩 {t("trustBar.mit")}
          </span>
        </div>

        {/* Stats */}
        <div className="mx-auto grid max-w-3xl grid-cols-2 gap-6 sm:grid-cols-4">
          {[
            { value: 36, suffix: "", label: t("stats.countries") },
            { value: 10, suffix: "s", label: t("stats.settlement") },
            { value: 99, suffix: "%", label: t("stats.uptime") },
            { value: 100, suffix: "%", label: t("stats.openSource") },
          ].map((stat, i) => (
            <div
              key={i}
              className="border-border bg-card/30 rounded-xl border p-4 text-center backdrop-blur-sm"
            >
              <div
                className="font-display gradient-text mb-1 font-bold"
                style={{ fontSize: "2rem" }}
              >
                <AnimatedNumber target={stat.value} suffix={stat.suffix} />
              </div>
              <div className="text-muted-foreground text-xs">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 opacity-50">
        <div className="border-muted-foreground flex h-8 w-5 items-start justify-center rounded-full border p-1">
          <div
            className="bg-muted-foreground h-2 w-1 rounded-full"
            style={{ animation: "counter-up 1.5s ease-in-out infinite" }}
          />
        </div>
      </div>
    </section>
  );
}
