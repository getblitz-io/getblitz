"use client";

import { useEffect, useState } from "react";
import BaseLink from "next/link";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export function Navbar() {
  const t = useTranslations("nav");
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 right-0 left-0 z-50 transition-all duration-300 ${
        scrolled ? "nav-scrolled" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-2">
          <div className="relative">
            <div className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-lg text-lg font-bold transition-all group-hover:scale-110">
              ⚡
            </div>
          </div>
          <span className="font-display text-foreground text-xl font-bold tracking-tight">
            GetBlitz
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-8 md:flex">
          <Link
            href="#features"
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            {t("features")}
          </Link>
          <Link
            href="#how-it-works"
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            {t("howItWorks")}
          </Link>
          <Link
            href="#pricing"
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            {t("pricing")}
          </Link>
          <a
            href="https://docs.getblitz.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            {t("docs")}
          </a>
          <a
            href="https://github.com/getblitz-io/getblitz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm transition-colors"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4 fill-current"
              aria-hidden="true"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            {t("github")}
          </a>
          <BaseLink
            href="/api-reference"
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            {t("apiReference")}
          </BaseLink>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <a
            href="https://app.getblitz.io"
            className="bg-primary text-primary-foreground hover:bg-primary/90 hidden items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors md:inline-flex"
          >
            {t("getStarted")}
          </a>
          {/* Mobile menu button */}
          <button
            className="text-foreground p-2 md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <div className="flex h-4 w-5 flex-col justify-between">
              <span
                className={`block h-0.5 bg-current transition-all ${menuOpen ? "translate-y-1.5 rotate-45" : ""}`}
              />
              <span
                className={`block h-0.5 bg-current transition-all ${menuOpen ? "opacity-0" : ""}`}
              />
              <span
                className={`block h-0.5 bg-current transition-all ${menuOpen ? "-translate-y-1.5 -rotate-45" : ""}`}
              />
            </div>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="bg-background/95 border-border flex flex-col gap-4 border-t px-6 py-4 backdrop-blur-xl md:hidden">
          <Link
            href="#features"
            className="text-foreground text-sm"
            onClick={() => setMenuOpen(false)}
          >
            {t("features")}
          </Link>
          <Link
            href="#how-it-works"
            className="text-foreground text-sm"
            onClick={() => setMenuOpen(false)}
          >
            {t("howItWorks")}
          </Link>
          <Link
            href="#pricing"
            className="text-foreground text-sm"
            onClick={() => setMenuOpen(false)}
          >
            {t("pricing")}
          </Link>
          <a
            href="https://docs.getblitz.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground text-sm"
            onClick={() => setMenuOpen(false)}
          >
            {t("docs")}
          </a>
          <a
            href="https://github.com/getblitz-io/getblitz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground text-sm"
          >
            {t("github")}
          </a>
          <BaseLink
            href="/api-reference"
            className="text-foreground text-sm"
            onClick={() => setMenuOpen(false)}
          >
            {t("apiReference")}
          </BaseLink>
          <a
            href="https://app.getblitz.io"
            className="bg-primary text-primary-foreground inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium"
          >
            {t("getStarted")}
          </a>
        </div>
      )}
    </header>
  );
}
