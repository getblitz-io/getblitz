import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

import { ThemeProvider, ThemeToggle } from "@getblitz/ui";

import "../../app/globals.css";

import { CookieBanner } from "../../components/CookieBanner";
import { LanguageSwitcher } from "../../components/LanguageSwitcher";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GetBlitz — Open-Source SEPA Payment Gateway",
  description:
    "Self-hosted SEPA Instant Transfer gateway for European businesses. Zero transaction fees, full data sovereignty, MIT licensed. Your bank data stays yours.",
  keywords: [
    "SEPA",
    "payment gateway",
    "open source",
    "self-hosted",
    "European payments",
    "GDPR",
    "Instant Transfer",
  ],
  openGraph: {
    title: "GetBlitz — Open-Source SEPA Payment Gateway",
    description:
      "Self-hosted SEPA Instant Transfer gateway for European businesses. Zero transaction fees, full data sovereignty.",
    type: "website",
    locale: "en_EU",
  },
  icons: [{ rel: "icon", url: "/logo-icon.png", type: "image/png" }],
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>
            {children}
            <div className="fixed right-2 bottom-4 z-90 flex touch-manipulation gap-2 sm:right-4 sm:bottom-4">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
            <CookieBanner />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
