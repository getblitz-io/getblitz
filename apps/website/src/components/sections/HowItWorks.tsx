"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { useScrollReveal } from "../ScrollReveal";

const SDK_CODE = `<script src="https://cdn.yourdomain.com/getblitz.js"></script>
<script>
  const payment = new GetBlitz({
    sessionId: "sess_123",
    apiUrl: "https://pay.yourdomain.com",
    wssUrl: "wss://wss.yourdomain.com",
  });

  payment.mount("#payment-container");

  payment
    .on("onSuccess", (token) => {
      // Payment confirmed — fulfil the order
    })
    .on("onExpired", () => {
      // Session expired — prompt user to retry
    });
</script>`;

interface Step {
  title: string;
  description: string;
}

export function HowItWorksSection() {
  const t = useTranslations("howItWorks");
  const ref = useScrollReveal();
  const steps = t.raw("steps") as Step[];
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(SDK_CODE).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <section
      id="how-it-works"
      className="bg-secondary/20 relative py-32"
      ref={ref}
    >
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
        </div>

        {/* Steps flow - 4 Step Connected Timeline */}
        <div className="relative mx-auto mb-24 max-w-5xl">
          {/* Connecting Line (Desktop) */}
          <div className="via-primary/30 absolute top-12 right-[10%] left-[10%] hidden h-px bg-linear-to-r from-transparent to-transparent lg:block" />

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <div
                key={i}
                className="reveal-up group relative flex flex-col items-center text-center"
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                {/* Step Connector (Mobile/Tablet) */}
                {i > 0 && (
                  <div className="to-primary/30 absolute -top-6 left-1/2 h-6 w-px bg-linear-to-b from-transparent lg:hidden" />
                )}

                {/* Glowing Number Icon */}
                <div className="bg-card border-primary/20 group-hover:border-primary/50 relative z-10 mb-6 flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl border shadow-lg transition-transform duration-500 group-hover:scale-110">
                  <div className="bg-primary/5 absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                  <div className="bg-primary/20 absolute top-1/2 left-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100" />
                  <span className="font-display text-primary relative z-10 text-3xl font-bold drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]">
                    {i + 1}
                  </span>
                </div>

                <h3 className="font-display text-foreground group-hover:text-primary mb-2 text-lg font-bold transition-colors">
                  {step.title}
                </h3>
                <p className="text-muted-foreground px-2 text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Code block - macOS IDE Style */}
        <div className="reveal-up group relative mx-auto max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c0e] shadow-2xl delay-200">
          {/* Decorative glow behind code block */}
          <div className="from-primary/30 to-primary/10 absolute -inset-1 -z-10 rounded-[20px] bg-linear-to-br via-transparent opacity-0 blur-xl transition-opacity duration-1000 group-hover:opacity-100" />

          {/* IDE Window Header */}
          <div className="flex items-center justify-between border-b border-white/5 bg-[#121214] px-4 py-3">
            <div className="flex items-center gap-6">
              {/* Traffic Lights */}
              <div className="flex gap-2">
                <div className="h-3 w-3 rounded-full border border-[#E0443E] bg-[#FF5F56]" />
                <div className="h-3 w-3 rounded-full border border-[#DEA123] bg-[#FFBD2E]" />
                <div className="h-3 w-3 rounded-full border border-[#1AAB29] bg-[#27C93F]" />
              </div>

              {/* File Tabs */}
              <div className="flex items-center gap-1">
                <div className="text-foreground/80 flex items-center gap-2 rounded-md border border-white/5 bg-[#1E1E21] px-3 py-1 text-xs shadow-sm">
                  <svg
                    className="text-primary h-3 w-3"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M14.659 10.375l-4.502-4.504L1.751 14.28 12.016 24l4.505-4.503-6.195-6.194 4.333-2.928zm4.339-2.937L10.597.001 6.096 4.5l6.191 6.196-4.331 2.929 8.404 8.404 4.504-4.505-1.865-10.086z" />
                  </svg>
                  <span>{t("sdkTitle")}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleCopy}
              className="text-muted-foreground hover:text-foreground flex items-center gap-2 rounded bg-white/5 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-white/10"
            >
              {copied ? (
                <>
                  <svg
                    className="h-3.5 w-3.5 text-green-400"
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
                  Copied
                </>
              ) : (
                <>
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
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  Copy SDK
                </>
              )}
            </button>
          </div>

          {/* Code content */}
          <pre className="overflow-x-auto p-6 font-mono text-[13px] leading-[1.6] text-zinc-300">
            <code>
              {SDK_CODE.split("\n").map((line, i) => (
                <div
                  key={i}
                  className="-mx-6 flex px-6 transition-colors hover:bg-white/2"
                >
                  <span className="mr-4 w-8 shrink-0 border-r border-white/10 pr-4 text-right text-zinc-600 select-none">
                    {i + 1}
                  </span>
                  <span className="flex-1">
                    {/* Syntax highlighting for dark theme */}
                    {line.startsWith("//") ? (
                      <span className="text-zinc-500 italic">{line}</span>
                    ) : line.includes('"') ? (
                      <span
                        dangerouslySetInnerHTML={{
                          __html: line
                            .replace(
                              /(".*?")/g,
                              '<span class="text-[#9ECBFF]">$1</span>',
                            )
                            .replace(
                              /\b(const|new|script|src)\b/g,
                              '<span class="text-[#F97583]">$1</span>',
                            )
                            .replace(
                              /\b(GetBlitz|payment|mount|on)\b/g,
                              '<span class="text-[#B392F0]">$1</span>',
                            ),
                        }}
                      />
                    ) : (
                      <span
                        dangerouslySetInnerHTML={{
                          __html: line.replace(
                            /\b(GetBlitz|payment|mount|on)\b/g,
                            '<span class="text-[#B392F0]">$1</span>',
                          ),
                        }}
                      />
                    )}
                  </span>
                </div>
              ))}
            </code>
          </pre>
        </div>
      </div>
    </section>
  );
}
