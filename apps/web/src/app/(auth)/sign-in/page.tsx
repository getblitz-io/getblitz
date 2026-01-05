"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { useTranslations } from "next-intl";
import { z } from "zod";

import { GoogleIcon } from "@getblitz/icon";
import { Button } from "@getblitz/ui/button";
import { Input } from "@getblitz/ui/input";
import { Label } from "@getblitz/ui/label";
import { toast } from "@getblitz/ui/toast";

import { authClient } from "~/auth/client";

export default function SignInPage() {
  const router = useRouter();
  const t = useTranslations("AuthPage.signIn");
  const tCommon = useTranslations("Common");

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      await authClient.signIn.email(
        {
          email: value.email,
          password: value.password,
        },
        {
          onSuccess: () => {
            router.push("/");
            router.refresh();
          },
          onError: (ctx: { error: { message: string } }) => {
            toast.error(ctx.error.message);
          },
        },
      );
    },
  });

  const handleGoogleSignIn = async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/",
    });
  };

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {t("description")}
        </p>
      </div>

      <div className="grid gap-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <div className="grid gap-4">
            <form.Field
              name="email"
              validators={{
                onChange: ({ value }) => {
                  const result = z.email(t("invalidEmail")).safeParse(value);
                  return result.success
                    ? undefined
                    : result.error.issues[0]?.message;
                },
              }}
              children={(field) => (
                <div className="grid gap-2">
                  <Label htmlFor="email">{t("emailLabel")}</Label>
                  <Input
                    id="email"
                    placeholder={tCommon("placeholders.email")}
                    type="email"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect="off"
                    disabled={form.state.isSubmitting}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  {field.state.meta.errors.length > 0 ? (
                    <p className="text-sm text-red-500">
                      {field.state.meta.errors.join(", ")}
                    </p>
                  ) : null}
                </div>
              )}
            />

            <form.Field
              name="password"
              validators={{
                onChange: ({ value }) => {
                  const result = z
                    .string()
                    .min(1, t("passwordRequired"))
                    .safeParse(value);
                  return result.success
                    ? undefined
                    : result.error.issues[0]?.message;
                },
              }}
              children={(field) => (
                <div className="grid gap-2">
                  <Label htmlFor="password">{t("passwordLabel")}</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    disabled={form.state.isSubmitting}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  {field.state.meta.errors.length > 0 ? (
                    <p className="text-sm text-red-500">
                      {field.state.meta.errors.join(", ")}
                    </p>
                  ) : null}
                </div>
              )}
            />

            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
              children={([canSubmit, isSubmitting]) => (
                <Button disabled={!canSubmit}>
                  {isSubmitting && (
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  )}
                  {t("signInButton")}
                </Button>
              )}
            />
          </div>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-zinc-200 dark:border-zinc-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
              {t("orContinue")}
            </span>
          </div>
        </div>

        <Button variant="outline" type="button" onClick={handleGoogleSignIn}>
          <GoogleIcon className="mr-2 h-4 w-4" />
          Google
        </Button>
      </div>

      <p className="px-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
        <Link
          href="/sign-up"
          className="underline underline-offset-4 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          {t("noAccount")}
        </Link>
      </p>
    </div>
  );
}
