"use client";

import { useTranslations } from "next-intl";

import { useScrollReveal } from "../ScrollReveal";

interface FeatureItem {
  icon: string;
  title: string;
  description: string;
}

export function FeaturesSection() {
  const t = useTranslations("features");
  const ref = useScrollReveal();
  const items = t.raw("items") as FeatureItem[];

  return (
    <section id="features" className="relative py-32" ref={ref}>
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
          <p className="reveal-up text-muted-foreground mx-auto max-w-2xl text-lg leading-relaxed delay-200">
            {t("subheadline")}
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => (
            <div
              key={i}
              className="reveal-up group border-border bg-card/40 hover:border-primary/40 hover:bg-primary/5 rounded-2xl border p-6 backdrop-blur-sm transition-all duration-300 hover:shadow-lg"
              style={{ transitionDelay: `${(i % 3) * 100}ms` }}
            >
              <div className="mb-4 text-3xl">{item.icon}</div>
              <h3 className="text-foreground group-hover:text-primary mb-2 text-lg font-semibold transition-colors">
                {item.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
