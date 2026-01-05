"use client";

import { useRouter } from "next/navigation";
import { GlobeIcon } from "@radix-ui/react-icons";
import { useLocale, useTranslations } from "next-intl";

import { cn } from "@getblitz/ui";
import { Button } from "@getblitz/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@getblitz/ui/dropdown-menu";
import { toast } from "@getblitz/ui/toast";

import { setLocale } from "~/app/actions/locale";

const locales = [
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
] as const;

type LocaleCode = (typeof locales)[number]["code"];

export function LanguageToggle() {
  const router = useRouter();
  const currentLocale = useLocale() as LocaleCode;
  const tCommon = useTranslations("Common");
  const handleLocaleChange = async (locale: LocaleCode) => {
    if (locale === currentLocale) return;

    try {
      await setLocale(locale);
      toast.success(tCommon("language.status.changedSuccessfully"), {
        description: tCommon(
          "language.status.pageWillRefreshToApplyNewLanguage",
        ),
        duration: 3000,
      });
      router.refresh();
    } catch {
      toast.error(tCommon("language.status.failedToChangeLanguage"), {
        description: tCommon("language.status.pleaseTryAgainLater"),
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="[&>svg]:size-5">
          <GlobeIcon />
          <span className="sr-only">
            {tCommon("language.buttons.changeLanguage")}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="min-w-[120px]">
        {locales.map((locale) => (
          <DropdownMenuItem
            key={locale.code}
            onClick={() => handleLocaleChange(locale.code)}
            className={cn(
              "min-h-[44px] cursor-pointer",
              currentLocale === locale.code && "bg-accent",
            )}
          >
            {locale.label}
            {currentLocale === locale.code && " ✓"}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
