"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "@tanstack/react-query";
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

export default function EditCustomerPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const customerId = params.customerId as string;
  const trpc = useTRPC();
  const t = useTranslations("CustomersPage");
  const tCommon = useTranslations("Common");
  const tToast = useTranslations("Toast");

  // Fetch customer
  const { data: customer, isLoading } = useQuery(
    trpc.customer.get.queryOptions({ slug, id: customerId }),
  );

  // Update customer mutation
  const updateCustomer = useMutation(
    trpc.customer.update.mutationOptions({
      onSuccess: () => {
        toast.success(tToast("customerUpdated"));
        router.push(`/${slug}/customers`);
      },
      onError: (error: { message: string }) => {
        toast.error(error.message);
      },
    }),
  );

  // Delete customer mutation
  const deleteCustomer = useMutation(
    trpc.customer.delete.mutationOptions({
      onSuccess: () => {
        toast.success(tToast("customerDeleted"));
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
      name: customer?.name ?? "",
      email: customer?.email ?? "",
      address: customer?.address ?? "",
      taxId: customer?.taxId ?? "",
    },
    onSubmit: ({ value }) => {
      updateCustomer.mutate({
        slug,
        id: customerId,
        email: value.email || undefined,
        name: value.name || undefined,
        address: value.address || undefined,
        taxId: value.taxId || undefined,
      });
    },
  });

  useEffect(() => {
    if (customer) {
      form.setFieldValue("name", customer.name ?? "");
      form.setFieldValue("email", customer.email ?? "");
      form.setFieldValue("address", customer.address ?? "");
      form.setFieldValue("taxId", customer.taxId ?? "");
    }
  }, [form, customer]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-xl font-semibold">{t("customerNotFound")}</h2>
        <Link href={`/${slug}/customers`} className="text-primary mt-2">
          {t("backToCustomers")}
        </Link>
      </div>
    );
  }

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
          {t("editCustomerTitle")}
        </h1>
        <p className="text-muted-foreground">{t("editCustomerDescription")}</p>
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
                  if (!value) return undefined;
                  const result = z.email(t("emailInvalid")).safeParse(value);
                  if (!result.success) {
                    return result.error.issues[0]?.message;
                  }
                  return undefined;
                },
              }}
            >
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="email">{t("emailLabel")}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={tCommon("placeholders.email")}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    disabled={form.state.isSubmitting}
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

            <div className="flex gap-3">
              <form.Subscribe
                selector={(state) => [state.isSubmitting, state.canSubmit]}
              >
                {([isSubmitting, canSubmit]) => (
                  <Button
                    type="submit"
                    className="flex-1"
                    size="lg"
                    disabled={!!isSubmitting || !canSubmit}
                  >
                    {isSubmitting || updateCustomer.isPending
                      ? t("saving")
                      : t("saveButton")}
                  </Button>
                )}
              </form.Subscribe>

              <Button
                type="button"
                variant="destructive"
                size="lg"
                disabled={deleteCustomer.isPending}
                onClick={() => {
                  if (confirm(t("confirmDelete"))) {
                    deleteCustomer.mutate({ slug, id: customerId });
                  }
                }}
              >
                {deleteCustomer.isPending ? t("deleting") : t("deleteButton")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
