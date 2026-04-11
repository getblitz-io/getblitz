import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CodeIcon, GearIcon, HomeIcon } from "@radix-ui/react-icons";
import { getTranslations } from "next-intl/server";

import {
  BuildingIcon,
  CreditCardIcon,
  CustomerIcon,
  InvoiceIcon,
} from "@getblitz/icon";

import { auth, getSession } from "~/auth/server";
import { api } from "~/trpc/server";
import { MobileNav } from "./_components/mobile-nav";
import { OrgSwitcher } from "./_components/org-switcher";
import { UserMenu } from "./_components/user-menu";

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getSession();
  const t = await getTranslations("Navigation");

  if (!session) {
    redirect("/sign-in");
  }

  // Get all user's organizations for the switcher
  const organizations = await auth.api.listOrganizations({
    headers: await headers(),
  });

  // Verify org exists and user has access
  const caller = await api();
  let organization;
  try {
    organization = await caller.organization.getBySlug({ slug });
  } catch {
    notFound();
  }

  const navItems = [
    { href: `/${slug}`, labelKey: "dashboard", icon: "home" },
    { href: `/${slug}/banks`, labelKey: "banks", icon: "building" },
    { href: `/${slug}/payments`, labelKey: "payments", icon: "credit-card" },
    { href: `/${slug}/customers`, labelKey: "customers", icon: "users" },
    { href: `/${slug}/invoices`, labelKey: "invoices", icon: "receipt" },
    { href: "/api-reference", labelKey: "apiReference", icon: "code" },
    { href: "https://docs.getblitz.io", labelKey: "docs", icon: "code" },
    { href: `/${slug}/settings`, labelKey: "settings", icon: "settings" },
  ] as const;

  return (
    <div className="bg-background flex min-h-screen">
      {/* Sidebar - Desktop only */}
      <aside className="border-border/50 bg-muted/20 hidden w-64 shrink-0 border-r md:flex md:flex-col">
        {/* Logo and Brand */}
        <div className="border-border/50 border-b p-4">
          <Link href={`/${slug}`} className="flex items-center gap-2.5">
            <Image
              src="/logo-icon.png"
              alt="GetBlitz"
              className="h-8 w-8"
              width={32}
              height={32}
            />
            <span className="text-foreground text-lg font-semibold">
              GetBlitz
            </span>
          </Link>
        </div>

        {/* Organization Switcher */}
        <div className="border-border/50 border-b p-3">
          <OrgSwitcher
            organizations={organizations}
            currentOrg={organization}
          />
        </div>

        <nav className="flex-1 space-y-1 p-3">
          <p className="text-muted-foreground mb-2 px-3 text-xs font-medium tracking-wider uppercase">
            {t("menu")}
          </p>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-muted-foreground hover:bg-accent hover:text-accent-foreground flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
            >
              <NavIcon name={item.icon} />
              {t(item.labelKey)}
            </Link>
          ))}
        </nav>

        {/* User section at bottom */}
        <div className="border-border/50 border-t p-3">
          <UserMenu session={session} />
        </div>
      </aside>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="border-border/50 bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-0 z-40 flex h-14 items-center gap-3 border-b px-4 backdrop-blur md:hidden">
          <MobileNav
            organizations={organizations}
            currentOrg={organization}
            session={session}
          />
          <Link
            href={`/${slug}`}
            className="flex items-center gap-2 font-semibold"
          >
            <Image
              src="/logo-icon.png"
              alt="GetBlitz"
              className="h-7 w-7"
              width={28}
              height={28}
            />
            <span className="truncate">{organization.name}</span>
          </Link>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="px-4 py-6 md:container md:max-w-6xl md:py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function NavIcon({
  name,
}: {
  name:
    | "home"
    | "building"
    | "credit-card"
    | "users"
    | "receipt"
    | "settings"
    | "code";
}) {
  const icons = {
    home: <HomeIcon className="h-4 w-4" />,
    building: <BuildingIcon className="h-4 w-4" />,
    "credit-card": <CreditCardIcon className="h-4 w-4" />,
    users: <CustomerIcon className="h-4 w-4" />,
    receipt: <InvoiceIcon className="h-4 w-4" />,
    settings: <GearIcon className="h-4 w-4" />,
    code: <CodeIcon className="h-4 w-4" />,
  };
  return icons[name];
}
