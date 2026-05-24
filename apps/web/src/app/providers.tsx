"use client";

import dynamic from "next/dynamic";

import { ThemeProvider } from "@getblitz/ui/theme-provider";
import { Toaster } from "@getblitz/ui/toast";

import { LanguageToggle } from "~/app/_components/language-toggle";
import { VersionChecker } from "~/app/_components/version-checker";
import { TRPCReactProvider } from "~/trpc/react";

const ThemeToggle = dynamic(
  () => import("@getblitz/ui/theme-toggle").then((m) => m.ThemeToggle),
  { ssr: false },
);

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <TRPCReactProvider>{children}</TRPCReactProvider>
      <div className="fixed right-2 bottom-4 z-50 flex touch-manipulation gap-2 sm:right-4 sm:bottom-4">
        <LanguageToggle />
        <ThemeToggle />
      </div>
      <Toaster />
      <VersionChecker />
    </ThemeProvider>
  );
}
