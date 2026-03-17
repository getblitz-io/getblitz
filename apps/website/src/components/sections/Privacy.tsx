"use client";

import { useTranslations } from "next-intl";

import { useScrollReveal } from "../ScrollReveal";

interface PrivacyItem {
  icon: string;
  title: string;
  description: string;
}

export function PrivacySection() {
  const t = useTranslations("privacy");
  const ref = useScrollReveal();
  const items = t.raw("items") as PrivacyItem[];

  return (
    <section id="privacy" className="relative overflow-hidden py-32" ref={ref}>
      {/* Background glow */}
      <div
        className="max-h-2xl pointer-events-none absolute top-1/2 left-1/2 h-[60vw] w-[60vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-full opacity-5 blur-3xl"
        style={{ background: "var(--primary)" }}
      />

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
        </div>

        {/* Privacy items as large editorial blocks - 6 Item Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => (
            <div
              key={i}
              className="reveal-up border-border/50 bg-card/60 hover:border-primary/40 hover:bg-primary/5 group relative overflow-hidden rounded-3xl border p-8 shadow-lg backdrop-blur-md transition-all duration-500"
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              {/* Enormous Watermark Icon */}
              <div
                className="group-hover:blur-0 pointer-events-none absolute -right-8 -bottom-8 text-[120px] leading-none opacity-[0.03] blur-[2px] grayscale filter transition-all duration-700 select-none group-hover:-translate-x-2 group-hover:-translate-y-2 group-hover:opacity-[0.08] group-hover:grayscale-0"
                aria-hidden="true"
              >
                {item.icon}
              </div>

              {/* Smaller visible icon */}
              <div className="bg-secondary/50 border-border/50 group-hover:bg-primary/20 group-hover:border-primary/30 group-hover:text-primary mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border text-xl shadow-inner transition-all duration-300">
                {item.icon}
              </div>

              <h3
                className="font-display text-foreground group-hover:text-primary mb-3 font-bold tracking-tight transition-colors duration-300"
                style={{ fontSize: "1.25rem" }}
              >
                {item.title}
              </h3>
              <p className="text-muted-foreground relative z-10 text-sm leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>

        {/* Values statement */}
        <div className="reveal-up mt-16 text-center">
          <blockquote
            className="font-display text-foreground/70 mx-auto max-w-3xl font-bold"
            style={{ fontSize: "clamp(1.2rem, 3vw, 2rem)", lineHeight: 1.4 }}
          >
            "European companies deserve European infrastructure.{" "}
            <span className="gradient-text">Built in Europe, for Europe.</span>"
          </blockquote>
        </div>
      </div>
    </section>
  );
}
