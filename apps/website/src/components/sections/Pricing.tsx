"use client";

import { useTranslations } from "next-intl";

import { useScrollReveal } from "../ScrollReveal";

export function PricingSection() {
  const t = useTranslations("pricing");
  const ref = useScrollReveal();
  const saasFeatures = t.raw("saas.features") as string[];
  const selfHostedFeatures = t.raw("selfHosted.features") as string[];

  return (
    <section id="pricing" className="bg-secondary/20 relative py-32" ref={ref}>
      <div className="bg-grid-pattern absolute inset-0 opacity-20" />

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="mb-16 text-center">
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
          <p className="reveal-up text-muted-foreground mx-auto max-w-xl text-sm leading-relaxed delay-200">
            {t("note")}
          </p>
        </div>

        {/* Pricing cards */}
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-2">
          {/* SaaS Plan (Hero) */}
          <div className="reveal-left border-primary/40 from-primary/10 group relative flex transform flex-col overflow-hidden rounded-[32px] border bg-linear-to-b to-transparent p-8 shadow-2xl backdrop-blur-xl transition-transform duration-500 hover:scale-[1.02] lg:p-10">
            {/* Shimmer Effect */}
            <div className="absolute inset-0 -translate-x-full bg-linear-to-tr from-transparent via-white/5 to-transparent opacity-0 transition-opacity duration-1000 group-hover:animate-[shimmer_2s_infinite] group-hover:opacity-100" />

            {/* Glow */}
            <div
              className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full opacity-40 blur-[80px] transition-opacity duration-500 group-hover:opacity-60"
              style={{ background: "var(--primary)" }}
            />

            <div className="relative z-10">
              <div className="border-primary/30 bg-primary/20 text-primary mb-6 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium backdrop-blur-md">
                ✨ Most Popular
              </div>
              <h3 className="font-display text-foreground mb-2 text-2xl font-bold">
                {t("saas.title")}
              </h3>
              <div className="mb-2 flex items-baseline gap-1">
                <span
                  className="font-display gradient-text font-black tracking-tight"
                  style={{ fontSize: "4rem" }}
                >
                  {t("saas.price")}
                </span>
                <span className="text-muted-foreground font-medium">
                  {t("saas.period")}
                </span>
              </div>

              <div className="from-primary/30 my-6 h-px bg-linear-to-r to-transparent" />

              <ul className="my-8 flex-1 space-y-4">
                {saasFeatures.map((feature, i) => (
                  <li
                    key={i}
                    className="text-foreground/90 flex items-start gap-3 text-sm"
                  >
                    <div className="bg-primary/20 mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full">
                      <svg
                        className="text-primary h-3 w-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>

              <a
                href="https://app.getblitz.io"
                className="bg-primary text-primary-foreground hover:bg-primary/90 mt-8 block w-full rounded-2xl px-6 py-4 text-center text-lg font-bold transition-all duration-300 hover:shadow-[0_0_20px_rgba(var(--primary),0.4)]"
              >
                {t("saas.cta")}
              </a>
            </div>
          </div>

          {/* Self-hosted (Terminal Aesthetic) */}
          <div className="reveal-right group relative flex flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[#0A0A0B] p-8 font-mono shadow-2xl backdrop-blur-md lg:p-10">
            {/* Subtle Top Border Glow */}
            <div className="absolute top-0 right-0 left-0 h-px bg-linear-to-r from-transparent via-white/20 to-transparent opacity-50" />

            <div className="mb-8 flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-zinc-700" />
              <div className="h-3 w-3 rounded-full bg-zinc-700" />
              <div className="h-3 w-3 rounded-full bg-zinc-700" />
            </div>

            <h3 className="mb-2 text-xl font-bold tracking-tight text-zinc-300">
              {t("selfHosted.title")}
            </h3>
            <div className="mb-2 flex items-baseline gap-3">
              <span
                className="font-bold tracking-tighter text-white"
                style={{ fontSize: "3rem" }}
              >
                {t("selfHosted.price")}
              </span>
              <span className="text-xs tracking-widest text-zinc-500 uppercase">
                {t("selfHosted.period")}
              </span>
            </div>

            <div className="my-6 h-px bg-white/5" />

            <ul className="my-8 flex-1 space-y-4">
              {selfHostedFeatures.map((feature, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-sm text-zinc-400"
                >
                  <span className="shrink-0 font-bold text-zinc-600">
                    {">"}
                  </span>
                  {feature}
                </li>
              ))}
            </ul>

            <a
              href="https://github.com/getblitz-io/getblitz"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 block w-full rounded-2xl border border-white/20 bg-white/5 px-6 py-4 text-center font-semibold text-zinc-300 transition-all duration-300 hover:border-white/40 hover:bg-white/10 hover:text-white"
            >
              {t("selfHosted.cta")}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
