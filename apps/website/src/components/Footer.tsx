"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("footer");

  return (
    <footer className="border-border bg-secondary/20 relative border-t py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-12 grid grid-cols-1 gap-12 md:grid-cols-3">
          {/* Brand */}
          <div>
            <Link href="/" className="mb-4 flex items-center gap-2">
              <div className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-lg font-bold">
                ⚡
              </div>
              <span className="font-display text-foreground text-xl font-bold">
                GetBlitz
              </span>
            </Link>
            <p className="text-muted-foreground max-w-xs text-sm leading-relaxed">
              {t("tagline")}
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-foreground mb-4 text-sm font-semibold tracking-wider uppercase">
              Resources
            </h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://github.com/getblitz-io/getblitz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm transition-colors"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4 fill-current"
                    aria-hidden="true"
                  >
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  {t("links.github")}
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/getblitz-io/getblitz/blob/main/README.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  {t("links.docs")}
                </a>
              </li>
              <li>
                <Link
                  href="#pricing"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  {t("links.pricing")}
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/getblitz-io/getblitz#self-hosting"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  {t("links.selfHost")}
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/getblitz-io/getblitz/releases"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  {t("links.changelog")}
                </a>
              </li>
            </ul>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-foreground mb-4 text-sm font-semibold tracking-wider uppercase">
              Product
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="#features"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  href="#how-it-works"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  How It Works
                </Link>
              </li>
              <li>
                <Link
                  href="#banks"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  Supported Banks
                </Link>
              </li>
              <li>
                <Link
                  href="#privacy"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  Privacy & GDPR
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-border flex flex-col items-center justify-between gap-4 border-t pt-8 md:flex-row">
          <div className="text-muted-foreground flex flex-wrap items-center justify-center gap-4 text-xs sm:gap-6">
            <Link
              href="/terms"
              className="hover:text-foreground transition-colors"
            >
              {t("links.terms")}
            </Link>
            <Link
              href="/privacy"
              className="hover:text-foreground transition-colors"
            >
              {t("links.privacy")}
            </Link>
            <Link
              href="/impressum"
              className="hover:text-foreground transition-colors"
            >
              {t("links.impressum")}
            </Link>
            <span>{t("legal")}</span>
          </div>
          <p className="text-muted-foreground text-xs">
            © {new Date().getFullYear()} GetBlitz. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
