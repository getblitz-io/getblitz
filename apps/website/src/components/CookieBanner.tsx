"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

export function CookieBanner() {
  const t = useTranslations("cookieBanner");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if the user has already accepted the banner.
    const hasAccepted = localStorage.getItem("getblitz-cookie-consent");
    if (!hasAccepted) {
      // Delay state update to avoid synchronous setState warning
      const timer = setTimeout(() => setIsVisible(true), 0);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!isVisible) return null;

  const acceptCookies = () => {
    localStorage.setItem("getblitz-cookie-consent", "true");
    setIsVisible(false);
  };

  return (
    <div className="border-border bg-background/95 supports-backdrop-filter:bg-background/80 fixed right-0 bottom-0 left-0 z-100 border-t p-4 shadow-lg shadow-black/20 backdrop-blur sm:p-6">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="text-muted-foreground max-w-3xl flex-1 pr-6 text-sm">
          {t("message")}
        </p>
        <button
          onClick={acceptCookies}
          className="bg-primary text-primary-foreground hover:bg-primary/90 w-full shrink-0 rounded-lg px-6 py-2.5 text-sm font-semibold transition-colors sm:w-auto"
        >
          {t("accept")}
        </button>
      </div>
    </div>
  );
}
