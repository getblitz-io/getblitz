"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

import { useScrollReveal } from "../ScrollReveal";

interface BankProvider {
  name: string;
  auth: string;
  bestFor: string;
  flag: string;
}

const logoMap: Record<string, string> = {
  Qonto: "/logos/qonto.svg",
  "Revolut Business": "/logos/revolut.svg",
  Wise: "/logos/wise.png",
};

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
            const logo = logoMap[provider.name];

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
                    {logo ? (
                      <Image
                        src={logo}
                        alt={provider.name}
                        width={28}
                        height={28}
                        className={isComingSoon ? "opacity-50" : "opacity-90"}
                      />
                    ) : (
                      provider.flag
                    )}
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

        {/* Extensibility & Integration Callouts */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* WooCommerce Callout */}
          <div className="reveal-up border-border bg-card/40 flex flex-col items-center justify-between rounded-2xl border p-8 text-center backdrop-blur-sm">
            <div>
              <div className="mb-4 text-3xl">🛍️</div>
              <h4 className="text-foreground mb-2 text-lg font-bold">
                {t("wordpressTitle")}
              </h4>
              <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
                {t("wordpressDescription")}
              </p>
            </div>
            <a
              href="https://wordpress.org/plugins/getblitz-payment-gateway"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all hover:scale-[1.02]"
            >
              {t("wordpressCta")}
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
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          </div>

          {/* Extensibility Callout */}
          <div className="reveal-up border-border bg-card/40 flex flex-col items-center justify-between rounded-2xl border p-8 text-center backdrop-blur-sm">
            <div>
              <div className="mb-4 text-3xl">🔌</div>
              <h4 className="text-foreground mb-2 text-lg font-bold">
                Custom Provider
              </h4>
              <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
                {t("extensibility")}
              </p>
            </div>
            <a
              href="https://github.com/getblitz-io/getblitz/blob/main/CONTRIBUTING.md"
              target="_blank"
              rel="noopener noreferrer"
              className="border-border text-foreground hover:border-primary/40 hover:bg-primary/5 inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-semibold transition-all hover:scale-[1.02]"
            >
              View BankProvider interface
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
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
