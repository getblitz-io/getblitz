"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import {
  CodeIcon,
  GearIcon,
  HamburgerMenuIcon,
  HomeIcon,
} from "@radix-ui/react-icons";
import { useTranslations } from "next-intl";

import type { Session } from "@getblitz/auth";
import {
  BuildingIcon,
  CreditCardIcon,
  CustomerIcon,
  InvoiceIcon,
} from "@getblitz/icon";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@getblitz/ui/sheet";

import { OrgSwitcher } from "./org-switcher";
import { UserMenu } from "./user-menu";

interface Organization {
  id: string;
  name: string;
  slug: string;
}

interface MobileNavProps {
  organizations: Organization[];
  currentOrg: Organization;
  session: Session;
}

const navItems = [
  { path: "", labelKey: "dashboard", icon: "home" },
  { path: "/banks", labelKey: "banks", icon: "building" },
  { path: "/payments", labelKey: "payments", icon: "credit-card" },
  { path: "/customers", labelKey: "customers", icon: "users" },
  { path: "/invoices", labelKey: "invoices", icon: "receipt" },
  {
    path: "/api-reference",
    labelKey: "apiReference",
    icon: "code",
    absolute: true,
  },
  { path: "/settings", labelKey: "settings", icon: "settings" },
] as const;

export function MobileNav({
  organizations,
  currentOrg,
  session,
}: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const params = useParams();
  const pathname = usePathname();
  const slug = params.slug as string;
  const t = useTranslations("Navigation");

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <button
        onClick={() => setOpen(true)}
        className="hover:bg-accent flex h-9 w-9 items-center justify-center rounded-lg"
        aria-label="Open menu"
      >
        <MenuIcon className="h-5 w-5" />
      </button>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-border/50 border-b p-4">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <OrgSwitcher organizations={organizations} currentOrg={currentOrg} />
        </SheetHeader>

        <nav className="flex-1 space-y-1 p-3">
          <p className="text-muted-foreground mb-2 px-3 text-xs font-medium tracking-wider uppercase">
            {t("menu")}
          </p>
          {navItems.map((item) => {
            const href =
              "absolute" in item ? item.path : `/${slug}${item.path}`;
            const isActive =
              item.path === ""
                ? pathname === `/${slug}`
                : pathname.startsWith(href);

            return (
              <SheetClose asChild key={item.path}>
                <Link
                  href={href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <NavIcon name={item.icon} />
                  {t(item.labelKey)}
                </Link>
              </SheetClose>
            );
          })}
        </nav>

        <div className="border-border/50 mt-auto border-t p-3">
          <UserMenu session={session} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return <HamburgerMenuIcon className={className} />;
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
