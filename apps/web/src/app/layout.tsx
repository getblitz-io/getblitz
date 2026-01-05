import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";

import { cn } from "@getblitz/ui";
import { ThemeProvider, ThemeToggle } from "@getblitz/ui/theme";
import { Toaster } from "@getblitz/ui/toast";

import { LanguageToggle } from "~/app/_components/language-toggle";
import { VersionChecker } from "~/app/_components/version-checker";
import { env } from "~/env";
import { TRPCReactProvider } from "~/trpc/react";

import "~/app/styles.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    env.APPLICATION_ENV === "production"
      ? "https://app.getblitz.io"
      : "http://localhost:3000",
  ),
  title: "GetBlitz Payment Gateway",
  description:
    "GetBlitz Payment Gateway is an Open Source Merchant Self-Hosted Payment Gateway that allows merchants to accept payments online and offline via SEPA Instant Transfer across Europe.",
  applicationName: "GetBlitz Payment Gateway",
  authors: [{ name: "GetBlitz Team", url: "https://getblitz.io" }],
  generator: "Next.js",
  keywords: [
    "Payment Gateway",
    "Self-Hosted",
    "Open Source",
    "SEPA Instant",
    "Merchant Payments",
    "Crypto Payments",
    "Fintech",
    "Europe",
    "Banking",
  ],
  referrer: "origin-when-cross-origin",
  creator: "GetBlitz Team",
  publisher: "GetBlitz",
  robots:
    env.APPLICATION_ENV === "production"
      ? {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
          },
        }
      : {
          index: false,
          follow: false,
        },
  alternates: {
    canonical: "https://app.getblitz.io",
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: [{ rel: "icon", url: "/logo-icon.png", type: "image/png" }],
  openGraph: {
    title: "GetBlitz Payment Gateway",
    description:
      "Open Source Merchant Self-Hosted Payment Gateway. Accept payments online and offline via SEPA Instant Transfer across Europe.",
    url: "https://app.getblitz.io",
    siteName: "GetBlitz Payment Gateway",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GetBlitz Payment Gateway",
    description:
      "Open Source Merchant Self-Hosted Payment Gateway. Accept payments online and offline via SEPA Instant Transfer across Europe.",
    site: "@getblitz_io",
    creator: "@getblitz_io",
    images: ["/og-image.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "GetBlitz",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export default async function RootLayout(props: { children: React.ReactNode }) {
  const locale = await getLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={cn(
          "bg-background text-foreground min-h-screen font-sans antialiased",
          geistSans.variable,
          geistMono.variable,
        )}
      >
        <ThemeProvider>
          <NextIntlClientProvider>
            <TRPCReactProvider>{props.children}</TRPCReactProvider>
            <div className="fixed right-2 bottom-4 z-50 flex touch-manipulation gap-2 sm:right-4 sm:bottom-4">
              <LanguageToggle />
              <ThemeToggle />
            </div>
            <Toaster />
            <VersionChecker />
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
