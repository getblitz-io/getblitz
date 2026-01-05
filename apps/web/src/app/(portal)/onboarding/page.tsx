"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { useTranslations } from "next-intl";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@getblitz/ui";
import { Button } from "@getblitz/ui/button";
import { Input } from "@getblitz/ui/input";
import { Label } from "@getblitz/ui/label";
import { toast } from "@getblitz/ui/toast";

import { authClient } from "~/auth/client";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function OnboardingPage() {
  const router = useRouter();
  const t = useTranslations("OnboardingPage");

  const form = useForm({
    defaultValues: {
      name: "",
      slug: "",
    },
    onSubmit: async ({ value }) => {
      const slug = value.slug || slugify(value.name);
      const result = await authClient.organization.create({
        name: value.name,
        slug,
      });

      if (result.error) {
        toast.error(result.error.message ?? t("error"));
        return;
      }

      toast.success(t("success"));
      router.push(`/${slug}`);
    },
  });

  return (
    <div className="from-background to-muted/30 flex min-h-screen flex-col items-center justify-center bg-linear-to-b px-4">
      <div className="mb-8 flex flex-col items-center">
        <Image
          src="/logo-icon.svg"
          alt="Logo"
          width={56}
          height={56}
          className="mb-4"
        />
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground mt-2 text-center">
          {t("description")}
        </p>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("cardTitle")}</CardTitle>
          <CardDescription>{t("cardDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void form.handleSubmit();
            }}
            className="space-y-6"
          >
            <form.Field name="name">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="name">{t("organizationNameLabel")}</Label>
                  <Input
                    id="name"
                    value={field.state.value}
                    onChange={(e) => {
                      const newName = e.target.value;
                      const currentSlug = form.getFieldValue("slug");
                      const autoSlug = slugify(field.state.value);

                      field.handleChange(newName);

                      if (!currentSlug || currentSlug === autoSlug) {
                        form.setFieldValue("slug", slugify(newName));
                      }
                    }}
                    placeholder={t("organizationNamePlaceholder")}
                    autoFocus
                  />
                  <p className="text-muted-foreground text-xs">
                    {t("organizationNameHint")}
                  </p>
                </div>
              )}
            </form.Field>

            <form.Field name="slug">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="slug">{t("urlLabel")}</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">/</span>
                    <Input
                      id="slug"
                      value={field.state.value}
                      onChange={(e) =>
                        field.handleChange(slugify(e.target.value))
                      }
                      placeholder={t("urlPlaceholder")}
                    />
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {t("urlHint")}
                  </p>
                </div>
              )}
            </form.Field>

            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => (
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full"
                  size="lg"
                >
                  {isSubmitting ? t("creating") : t("createButton")}
                </Button>
              )}
            </form.Subscribe>
          </form>
        </CardContent>
      </Card>

      <p className="text-muted-foreground mt-6 text-center text-sm">
        {t("footer")}
      </p>
    </div>
  );
}
