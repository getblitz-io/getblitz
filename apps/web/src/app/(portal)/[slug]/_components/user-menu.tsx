"use client";

import { useRouter } from "next/navigation";
import { ExitIcon } from "@radix-ui/react-icons";
import { useTranslations } from "next-intl";

import type { Session } from "@getblitz/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@getblitz/ui/dropdown-menu";

import { authClient } from "~/auth/client";

export function UserMenu({ session }: { session: Session }) {
  const router = useRouter();
  const t = useTranslations("Navigation");
  const tCommon = useTranslations("Common");

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/sign-in");
        },
      },
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="hover:bg-accent hover:text-accent-foreground flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left outline-hidden transition-colors">
          <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium">
            {session.user.name.charAt(0).toUpperCase() ||
              session.user.email.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 truncate">
            <p className="truncate text-sm font-medium">
              {session.user.name || "User"}
            </p>
            <p className="text-muted-foreground truncate text-xs">
              {session.user.email}
            </p>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{t("myAccount")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          variant="destructive"
          className="cursor-pointer"
        >
          <ExitIcon className="mr-2 h-4 w-4" />
          <span>{tCommon("buttons.signOut")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
