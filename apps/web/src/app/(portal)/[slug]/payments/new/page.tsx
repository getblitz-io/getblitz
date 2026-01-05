"use client";

import { useEffect, useMemo } from "react";
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

interface BankAccountWithBank {
  id: string;
  accountName: string;
  accountIban: string;
  accountBic: string;
  isDefault: boolean;
  bankName: string;
}

interface PaymentResult {
  referenceId: string;
}

export default function NewPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const trpc = useTRPC();
  const t = useTranslations("NewPaymentPage");
  const tCommon = useTranslations("Common");
  const tToast = useTranslations("Toast");

  // Get organization with bank accounts
  const { data: org, isLoading } = useQuery(
    trpc.organization.getBySlug.queryOptions({ slug }),
  );

  // Get all bank accounts
  const bankAccounts = useMemo<BankAccountWithBank[]>(() => {
    if (!org) return [];
    return org.organizationBankConnections.flatMap((c) =>
      c.bankAccounts.map((a) => ({
        ...a,
        bankName: c.providerId, // Use providerId as the display name for now
      })),
    );
  }, [org]);

  // Compute default account ID (once when bankAccounts first populates)
  const defaultAccountId = useMemo(() => {
    if (bankAccounts.length === 0) return null;
    const defaultAccount = bankAccounts.find((a) => a.isDefault);
    return defaultAccount?.id ?? bankAccounts[0]?.id ?? null;
  }, [bankAccounts]);

  // Create payment mutation
  const createPayment = useMutation(
    trpc.payment.createPortalPayment.mutationOptions({
      onSuccess: (data: PaymentResult) => {
        toast.success(tToast("paymentCreated"));
        // Immediately redirect to payment detail page
        router.push(`/${slug}/payments/${data.referenceId}`);
      },
      onError: (error: { message: string }) => {
        toast.error(error.message);
      },
    }),
  );

  // Create form
  const form = useForm({
    defaultValues: {
      amount: "",
      bankAccountId: defaultAccountId ?? "",
    },
    onSubmit: ({ value }) => {
      const amountCents = Math.round(parseFloat(value.amount) * 100);
      const accountId = value.bankAccountId || defaultAccountId;

      if (!accountId) {
        toast.error(t("bankAccountRequired"));
        return;
      }

      createPayment.mutate({
        slug,
        amountCents,
        bankAccountId: accountId,
      });
    },
  });

  // Update form when defaultAccountId changes
  useEffect(() => {
    if (defaultAccountId && !form.state.values.bankAccountId) {
      form.setFieldValue("bankAccountId", defaultAccountId);
    }
  }, [defaultAccountId, form]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
      </div>
    );
  }

  if (bankAccounts.length === 0) {
    return (
      <div className="mx-auto max-w-md space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("bankAccountRequiredTitle")}</CardTitle>
            <CardDescription>
              {t("bankAccountRequiredDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/${slug}/banks/connect`}>
              <Button className="w-full">{t("connectBankAccount")}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show payment form
  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <Link
          href={`/${slug}/payments`}
          className="text-muted-foreground hover:text-foreground mb-2 block text-sm"
        >
          {t("backToPayments")}
        </Link>
        <p className="text-primary mb-1 text-sm font-medium">{slug}</p>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("paymentDetails")}</CardTitle>
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
            {/* Amount Input */}
            <form.Field
              name="amount"
              validators={{
                onChange: ({ value }) => {
                  const result = z
                    .string()
                    .min(1, t("amountRequired"))
                    .safeParse(value);
                  if (!result.success) {
                    return result.error.issues[0]?.message;
                  }
                  const numValue = parseFloat(value);
                  if (isNaN(numValue) || numValue <= 0) {
                    return t("amountInvalid");
                  }
                  return undefined;
                },
              }}
            >
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="amount">{t("amountLabel")}</Label>
                  <div className="relative">
                    <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
                      €
                    </span>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder={tCommon("placeholders.amount")}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="pl-8 text-lg"
                      autoFocus
                      disabled={form.state.isSubmitting}
                    />
                  </div>
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-red-500">
                      {field.state.meta.errors.join(", ")}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            {/* Bank Account Selector */}
            <form.Field
              name="bankAccountId"
              validators={{
                onChange: ({ value }) => {
                  if (!value && !defaultAccountId) {
                    return t("bankAccountRequired");
                  }
                  return undefined;
                },
              }}
            >
              {(field) => (
                <div className="space-y-2">
                  <Label>{t("bankAccountLabel")}</Label>
                  <div className="space-y-2">
                    {bankAccounts.map((account) => {
                      const activeAccountId =
                        field.state.value || defaultAccountId;
                      return (
                        <div
                          key={account.id}
                          className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                            activeAccountId === account.id
                              ? "border-primary bg-primary/5"
                              : "hover:bg-muted/50"
                          }`}
                          onClick={() => field.handleChange(account.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">
                                {account.accountName}
                              </p>
                              <p className="text-muted-foreground text-sm">
                                {account.bankName}
                              </p>
                            </div>
                            {account.isDefault && (
                              <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium">
                                {tCommon("labels.default")}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-red-500">
                      {field.state.meta.errors.join(", ")}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            <form.Subscribe
              selector={(state) => [
                state.isSubmitting,
                state.canSubmit,
                state.values.amount,
              ]}
            >
              {([isSubmitting, isCanSubmit]) => (
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={!!isSubmitting || !isCanSubmit}
                >
                  {isSubmitting || createPayment.isPending
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
