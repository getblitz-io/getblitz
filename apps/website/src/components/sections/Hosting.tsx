"use client";

import { useTranslations } from "next-intl";

import { useScrollReveal } from "../ScrollReveal";

interface HostingOption {
  icon: string;
  title: string;
  price: string;
  description: string;
  features: string[];
  cta: string;
  highlighted: boolean;
}

export function HostingSection() {
  const t = useTranslations("hosting");
  const ref = useScrollReveal();
  const options = t.raw("options") as HostingOption[];

  return (
    <section id="hosting" className="relative py-32" ref={ref}>
      <div className="mx-auto max-w-7xl px-6">
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
        </div>

        {/* Hosting cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {options.map((option, i) => (
            <div
              key={i}
              className={`reveal-up flex flex-col rounded-2xl border p-8 transition-all duration-300 ${
                option.highlighted
                  ? "border-primary/50 bg-primary/10 shadow-primary/10 scale-[1.02] shadow-xl"
                  : "border-border bg-card/40 hover:border-primary/30 hover:bg-primary/5"
              }`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              {option.highlighted && (
                <div className="mb-3">
                  <span className="bg-primary text-primary-foreground inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium">
                    ✨ Recommended
                  </span>
                </div>
              )}

              <div className="mb-4 text-3xl">{option.icon}</div>
              <h3 className="font-display text-foreground mb-1 text-xl font-bold">
                {option.title}
              </h3>
              <div
                className={`mb-3 text-sm font-semibold ${option.highlighted ? "text-primary" : "text-muted-foreground"}`}
              >
                {option.price}
              </div>
              <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
                {option.description}
              </p>

              <ul className="mb-8 flex-1 space-y-2.5">
                {option.features.map((feature, fi) => (
                  <li
                    key={fi}
                    className="text-muted-foreground flex items-center gap-2 text-sm"
                  >
                    <svg
                      className="h-4 w-4 shrink-0"
                      style={{ color: "var(--primary)" }}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <a
                href={
                  option.highlighted
                    ? "https://app.getblitz.io"
                    : "https://github.com/getblitz-io/getblitz"
                }
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all hover:scale-[1.02] ${
                  option.highlighted
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "border-border text-foreground hover:border-primary/40 hover:bg-primary/5 border"
                }`}
              >
                {option.cta}
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
          ))}
        </div>

        {/* Additional options */}
        <div className="reveal-up text-muted-foreground mt-8 text-center text-sm">
          Also available:{" "}
          <a
            href="https://render.com"
            className="text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Render.com
          </a>{" "}
          one-click deploy and{" "}
          <a
            href="https://vercel.com"
            className="text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Vercel
          </a>{" "}
          for the Next.js dashboard.
        </div>
      </div>
    </section>
  );
}
