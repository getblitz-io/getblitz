import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import Link from "next/link";

import "~/app/styles.css";

export const metadata: Metadata = {
  title: "Demo Store - GetBlitz Payment Demo",
  description: "Demonstration of GetBlitz Payment Gateway",
};

export const viewport: Viewport = {
  themeColor: "#0c1222",
};

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`min-h-screen bg-[#0c1222] font-sans text-white antialiased ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
        style={{
          backgroundImage: `
                        radial-gradient(ellipse 80% 50% at 50% -20%, rgba(56, 189, 248, 0.15), transparent),
                        radial-gradient(ellipse 60% 40% at 80% 100%, rgba(168, 85, 247, 0.1), transparent)
                    `,
        }}
      >
        <header className="border-b border-white/5 bg-black/20 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
            <Link
              href="/"
              className="flex items-center gap-2 text-xl font-bold tracking-tight"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-cyan-400 to-blue-500 text-sm">
                ⚡
              </span>
              <span className="text-white">Demo</span>
              <span className="bg-linear-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Store
              </span>
            </Link>
            <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 font-mono text-xs text-cyan-400">
              GetBlitz Demo
            </span>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-6 py-12">{children}</main>
      </body>
    </html>
  );
}
