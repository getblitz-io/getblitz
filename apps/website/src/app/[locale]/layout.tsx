import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

import { themeDetectorScript } from "@getblitz/ui/theme-detector";

import { AppProviders } from "../providers";

import "../../app/globals.css";

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
        <Script
          id="theme-detector"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeDetectorScript }}
        />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AppProviders>{children}</AppProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
