"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { z } from "zod";

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

import { useTRPC } from "~/trpc/react";

export default function NewCustomerPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const trpc = useTRPC();
  const t = useTranslations("CustomersPage");
  const tCommon = useTranslations("Common");
  const tToast = useTranslations("Toast");

  // Create customer mutation
  const createCustomer = useMutation(
    trpc.customer.create.mutationOptions({
      onSuccess: () => {
        toast.success(tToast("customerCreated"));
        router.push(`/${slug}/customers`);
      },
      onError: (error: { message: string }) => {
        toast.error(error.message);
      },
    }),
  );

  // Create form
  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      address: "",
      taxId: "",
    },
    onSubmit: ({ value }) => {
      createCustomer.mutate({
        slug,
        email: value.email,
        name: value.name || undefined,
        address: value.address || undefined,
        taxId: value.taxId || undefined,
      });
    },
  });

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <Link
          href={`/${slug}/customers`}
          className="text-muted-foreground hover:text-foreground mb-2 block text-sm"
        >
          {t("backToCustomers")}
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("newCustomerTitle")}
        </h1>
        <p className="text-muted-foreground">{t("newCustomerDescription")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("customerDetails")}</CardTitle>
          <CardDescription>{t("customerDetailsDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void form.handleSubmit();
            }}
            className="space-y-6"
          >
            {/* Email Input */}
            <form.Field
              name="email"
              validators={{
                onChange: ({ value }) => {
                  const result = z
                    .email(t("emailInvalid"))
                    .min(1, t("emailRequired"))
                    .safeParse(value);
                  if (!result.success) {
                    return result.error.issues[0]?.message;
                  }
                  return undefined;
                },
              }}
            >
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="email">{t("emailLabel")} *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={tCommon("placeholders.email")}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    disabled={form.state.isSubmitting}
                    autoFocus
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-red-500">
                      {field.state.meta.errors.join(", ")}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            {/* Name Input */}
            <form.Field name="name">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="name">{t("nameLabel")}</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder={tCommon("placeholders.name")}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    disabled={form.state.isSubmitting}
                  />
                </div>
              )}
            </form.Field>

            {/* Address Input */}
            <form.Field name="address">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="address">{t("addressLabel")}</Label>
                  <Input
                    id="address"
                    type="text"
                    placeholder={tCommon("placeholders.address")}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    disabled={form.state.isSubmitting}
                  />
                </div>
              )}
            </form.Field>

            {/* Tax ID Input */}
            <form.Field name="taxId">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="taxId">{t("taxIdLabel")}</Label>
                  <Input
                    id="taxId"
                    type="text"
                    placeholder={tCommon("placeholders.taxId")}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    disabled={form.state.isSubmitting}
                  />
                </div>
              )}
            </form.Field>

            <form.Subscribe
              selector={(state) => [state.isSubmitting, state.canSubmit]}
            >
              {([isSubmitting, canSubmit]) => (
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={!!isSubmitting || !canSubmit}
                >
                  {isSubmitting || createCustomer.isPending
                    ? t("creating")
                    : t("createButton")}
                </Button>
              )}
            </form.Subscribe>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
