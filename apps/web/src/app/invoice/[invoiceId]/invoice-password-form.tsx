"use client";

import { useState } from "react";
import { LockClosedIcon } from "@radix-ui/react-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
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

import { useTRPC } from "~/trpc/react";
import { InvoicePaymentClient } from "./invoice-payment-client";

interface InvoicePasswordFormProps {
  referenceId: string;
  previewToken?: string;
}

export function InvoicePasswordForm({
  referenceId,
  previewToken,
}: InvoicePasswordFormProps) {
  const trpc = useTRPC();
  const t = useTranslations("InvoicePaymentPage");
  const tCommon = useTranslations("Common");

  const [password, setPassword] = useState("");
  const [submittedPassword, setSubmittedPassword] = useState<
    string | undefined
  >(undefined);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Fetch invoice after password is submitted
  const { data: invoice } = useQuery({
    ...trpc.invoice.getByReference.queryOptions({
      referenceId,
      password: submittedPassword,
      previewToken,
    }),
    enabled: !!submittedPassword,
    retry: false, // Don't retry on FORBIDDEN
  });

  // Verify password mutation
  const verifyPasswordMutation = useMutation(
    trpc.invoice.verifyPassword.mutationOptions({
      onSuccess: (data) => {
        if (data.valid) {
          setSubmittedPassword(password);
          setPasswordError(null);
        } else {
          setPasswordError(t("incorrectPassword"));
        }
      },
      onError: () => {
        setPasswordError(t("passwordVerificationFailed"));
      },
    }),
  );

  // Handle password form submission
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setPasswordError(t("passwordRequired"));
      return;
    }
    verifyPasswordMutation.mutate({ invoiceId: referenceId, password });
  };

  // If we have a valid password and invoice data, show the invoice
  if (submittedPassword && invoice) {
    return (
      <InvoicePaymentClient
        invoice={invoice}
        previewToken={previewToken}
        password={submittedPassword}
      />
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/20">
            <LockClosedIcon className="h-8 w-8 text-amber-500" />
          </div>
          <CardTitle>{t("passwordProtected")}</CardTitle>
          <CardDescription>{t("passwordProtectedDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">{tCommon("labels.password")}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t("passwordPlaceholder")}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError(null);
                }}
                className={passwordError ? "border-red-500" : ""}
              />
              {passwordError && (
                <p className="text-sm text-red-500">{passwordError}</p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={verifyPasswordMutation.isPending}
            >
              {verifyPasswordMutation.isPending
                ? tCommon("buttons.loading")
                : t("unlockInvoice")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
