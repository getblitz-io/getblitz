"use client";

import dynamic from "next/dynamic";

import { ThemeProvider } from "@getblitz/ui/theme-provider";

import { CookieBanner } from "../components/CookieBanner";
import { LanguageSwitcher } from "../components/LanguageSwitcher";

const ThemeToggle = dynamic(
  () => import("@getblitz/ui/theme-toggle").then((m) => m.ThemeToggle),
  { ssr: false },
);

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      {children}
      <div className="fixed right-2 bottom-4 z-90 flex touch-manipulation gap-2 sm:right-4 sm:bottom-4">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
      <CookieBanner />
    </ThemeProvider>
  );
}
