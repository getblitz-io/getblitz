"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { CheckIcon, ChevronDownIcon, PlusIcon } from "@radix-ui/react-icons";
import { useTranslations } from "next-intl";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@getblitz/ui/dropdown-menu";

interface Organization {
  id: string;
  name: string;
  slug: string;
}

export function OrgSwitcher({
  organizations,
  currentOrg,
}: {
  organizations: Organization[];
  currentOrg: Organization;
}) {
  const params = useParams();
  const currentSlug = params.slug as string;
  const t = useTranslations("OrgSwitcher");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="hover:bg-accent flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left outline-hidden transition-colors">
          <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold">
            {currentOrg.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 truncate">
            <p className="truncate text-sm font-semibold">{currentOrg.name}</p>
            <p className="text-muted-foreground truncate text-xs">
              /{currentOrg.slug}
            </p>
          </div>
          <ChevronDownIcon className="text-muted-foreground h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>{t("switchOrganization")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {organizations.map((org) => (
          <DropdownMenuItem key={org.id} asChild>
            <Link
              href={`/${org.slug}`}
              className={`flex cursor-pointer items-center gap-3 ${
                org.slug === currentSlug ? "bg-accent" : ""
              }`}
            >
              <div className="bg-primary/10 text-primary flex h-6 w-6 items-center justify-center rounded text-xs font-medium">
                {org.name.charAt(0).toUpperCase()}
              </div>
              <span className="truncate">{org.name}</span>
              {org.slug === currentSlug && (
                <CheckIcon className="text-primary ml-auto h-4 w-4" />
              )}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/onboarding" className="cursor-pointer">
            <PlusIcon className="mr-2 h-4 w-4" />
            {t("createOrganization")}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
