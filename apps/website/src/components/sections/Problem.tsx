"use client";

import { useTranslations } from "next-intl";

import { useScrollReveal } from "../ScrollReveal";

export function ProblemSection() {
  const t = useTranslations("problem");
  const ref = useScrollReveal();

  const theirItems = t.raw("their.items") as string[];
  const yourItems = t.raw("your.items") as string[];

  return (
    <section id="problem" className="relative overflow-hidden py-32" ref={ref}>
      {/* Dark section */}
      <div className="bg-secondary/30 absolute inset-0" />

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="mb-16 text-center">
          <span className="reveal-up border-destructive/30 bg-destructive/10 text-destructive mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium">
            {t("badge")}
          </span>
          <h2
            className="reveal-up font-display text-foreground mb-4 font-bold delay-100"
            style={{ fontSize: "clamp(1.8rem, 5vw, 3.5rem)", lineHeight: 1.1 }}
          >
            {t("headline")}
          </h2>
          <p className="reveal-up text-muted-foreground mx-auto max-w-2xl text-lg leading-relaxed delay-200">
            {t("subheadline")}
          </p>
        </div>

        {/* Split comparison */}
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Their way */}
          <div className="reveal-left border-destructive/20 bg-card/20 relative flex flex-col overflow-hidden rounded-3xl border p-8 shadow-2xl backdrop-blur-xl lg:p-10">
            {/* Background Glow */}
            <div className="bg-destructive/10 pointer-events-none absolute top-0 right-0 h-96 w-96 translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl" />

            <div className="relative z-10">
              <div className="mb-8 flex items-center gap-4">
                <div className="border-destructive/20 bg-destructive/10 flex h-12 w-12 items-center justify-center rounded-full border shadow-[0_0_15px_rgba(var(--destructive),0.2)]">
                  <svg
                    className="text-destructive h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
                <h3 className="font-display text-foreground text-3xl font-bold tracking-tight">
                  {t("their.title")}
                </h3>
              </div>
              <ul className="mb-10 flex-1 space-y-4">
                {theirItems.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="border-destructive/20 bg-destructive/10 mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border">
                      <div className="bg-destructive h-1.5 w-1.5 rounded-full" />
                    </div>
                    <span className="text-muted-foreground text-sm leading-relaxed">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Your way */}
          <div className="reveal-right border-primary/30 bg-card/20 relative flex flex-col overflow-hidden rounded-3xl border p-8 shadow-2xl backdrop-blur-xl lg:p-10">
            {/* Background Glow */}
            <div
              className="pointer-events-none absolute top-0 right-0 h-96 w-96 translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 blur-3xl"
              style={{ background: "var(--primary)" }}
            />

            <div className="relative z-10">
              <div className="mb-8 flex items-center gap-4">
                <div className="border-primary/30 bg-primary/20 flex h-12 w-12 items-center justify-center rounded-full border shadow-[0_0_20px_rgba(var(--primary),0.3)]">
                  <svg
                    className="text-primary h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h3 className="font-display text-foreground text-3xl font-bold tracking-tight">
                  {t("your.title")}
                </h3>
              </div>
              <ul className="mb-10 flex-1 space-y-4">
                {yourItems.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="border-primary/30 bg-primary/10 mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border">
                      <div
                        className="h-1.5 w-1.5 rounded-full text-transparent"
                        style={{ background: "var(--primary)" }}
                      />
                    </div>
                    <span className="text-muted-foreground text-sm leading-relaxed">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
