"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@getblitz/ui";
import { Button } from "@getblitz/ui/button";

import { authClient } from "~/auth/client";

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const t = useTranslations("ProfilePage");
  const tCommon = useTranslations("Common");

  const { data: session } = authClient.useSession();

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/sign-in");
        },
      },
    });
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/${slug}/settings`}
          className="text-muted-foreground hover:text-foreground mb-2 block text-sm"
        >
          {t("backToSettings")}
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      <div className="grid gap-6">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle>{t("profileInformation")}</CardTitle>
            <CardDescription>
              {t("profileInformationDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 text-primary flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold">
                {session.user.name.charAt(0).toUpperCase() ||
                  session.user.email.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-lg font-medium">{session.user.name}</p>
                <p className="text-muted-foreground text-sm">
                  {session.user.email}
                </p>
              </div>
            </div>

            <div className="grid gap-4 pt-4">
              <div className="grid gap-1">
                <p className="text-sm font-medium">{t("email")}</p>
                <p className="text-muted-foreground text-sm">
                  {session.user.email}
                </p>
              </div>
              <div className="grid gap-1">
                <p className="text-sm font-medium">{t("emailVerified")}</p>
                <p className="text-muted-foreground text-sm">
                  {session.user.emailVerified
                    ? tCommon("labels.yes")
                    : tCommon("labels.no")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Session */}
        <Card>
          <CardHeader>
            <CardTitle>{t("session")}</CardTitle>
            <CardDescription>{t("sessionDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={handleSignOut}>
              {t("signOut")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
