"use client";

import { useTranslations } from "next-intl";

import { useScrollReveal } from "../ScrollReveal";

interface BankProvider {
  name: string;
  auth: string;
  bestFor: string;
  flag: string;
}

export function BanksSection() {
  const t = useTranslations("banks");
  const ref = useScrollReveal();
  const providers = t.raw("providers") as BankProvider[];

  return (
    <section id="banks" className="bg-secondary/20 relative py-32" ref={ref}>
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
          <p className="reveal-up text-muted-foreground mx-auto max-w-xl text-lg leading-relaxed delay-200">
            {t("subheadline")}
          </p>
        </div>

        {/* Bank provider cards */}
        <div className="mb-16 grid grid-cols-1 gap-6 md:grid-cols-3">
          {providers.map((provider, i) => {
            const isComingSoon = i === providers.length - 1;

            return (
              <div
                key={i}
                className={`reveal-up group bg-card/40 relative flex h-full flex-col rounded-3xl p-8 backdrop-blur-xl transition-all duration-500 ${
                  isComingSoon
                    ? "border-border hover:border-primary/30 border-2 border-dashed"
                    : "border-border/60 hover:border-primary/50 border shadow-[0_4px_24px_rgba(0,0,0,0.05)] hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(var(--primary),0.15)]"
                }`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                {/* Subtle Hover Glow */}
                {!isComingSoon && (
                  <div className="from-primary/5 absolute inset-0 -z-10 rounded-3xl rounded-tl-none bg-linear-to-br to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                )}

                <div className="mb-8 flex items-center justify-between">
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl text-3xl shadow-inner ${
                      isComingSoon
                        ? "bg-white/5 opacity-50 grayscale"
                        : "border border-white/10 bg-white/5"
                    }`}
                  >
                    {provider.flag}
                  </div>

                  {isComingSoon ? (
                    <span className="bg-secondary text-muted-foreground border-border inline-flex h-full animate-pulse items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium">
                      <span className="bg-muted-foreground/50 h-1.5 w-1.5 rounded-full" />
                      {provider.auth}
                    </span>
                  ) : (
                    <span className="bg-primary/10 text-primary border-primary/20 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium">
                      <svg
                        className="h-3 w-3"
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
                      {provider.auth}
                    </span>
                  )}
                </div>

                <h3
                  className={`font-display mb-2 text-xl font-bold transition-colors duration-300 ${
                    isComingSoon
                      ? "text-muted-foreground"
                      : "text-foreground group-hover:text-primary"
                  }`}
                >
                  {provider.name}
                </h3>

                <p className="text-muted-foreground mt-auto text-sm leading-relaxed">
                  {provider.bestFor}
                </p>
              </div>
            );
          })}
        </div>

        {/* Extensibility callout */}
        <div className="reveal-up border-border bg-card/40 rounded-2xl border p-8 text-center backdrop-blur-sm">
          <div className="mb-4 text-3xl">🔌</div>
          <p className="text-foreground mb-2 font-medium">
            {t("extensibility")}
          </p>
          <a
            href="https://github.com/getblitz-io/getblitz/blob/main/CONTRIBUTING.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary mt-2 inline-flex items-center gap-2 text-sm hover:underline"
          >
            View the BankProvider interface
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
