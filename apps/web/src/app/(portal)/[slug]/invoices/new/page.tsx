"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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

import type { LineItem } from "../_components";
import { useTRPC } from "~/trpc/react";
import { calculateSubtotalCents, LineItemsEditor } from "../_components";

interface BankAccountWithBank {
  id: string;
  accountName: string;
  accountIban: string;
  accountBic: string;
  isDefault: boolean;
  bankName: string;
}

interface CustomerOption {
  id: string;
  email: string | null;
  name: string | null;
}

export default function NewInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const trpc = useTRPC();
  const t = useTranslations("InvoicesPage");
  const tCommon = useTranslations("Common");
  const tToast = useTranslations("Toast");

  // Form state
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerTaxId, setCustomerTaxId] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [taxRatePercent, setTaxRatePercent] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [emailError, setEmailError] = useState<string | undefined>();

  // Get organization with bank accounts
  const { data: org, isLoading: isLoadingOrg } = useQuery(
    trpc.organization.getBySlug.queryOptions({ slug }),
  );

  // Get existing customers
  const { data: customersData } = useQuery(
    trpc.customer.list.queryOptions({ slug, take: 100 }),
  );
  const customers: CustomerOption[] = customersData ?? [];

  // Get all bank accounts
  const bankAccounts = useMemo<BankAccountWithBank[]>(() => {
    if (!org) return [];
    return org.organizationBankConnections.flatMap((c) =>
      c.bankAccounts.map((a) => ({
        ...a,
        bankName: c.providerId,
      })),
    );
  }, [org]);

  const defaultAccountId = useMemo(() => {
    if (bankAccounts.length === 0) return null;
    const defaultAccount = bankAccounts.find((a) => a.isDefault);
    return defaultAccount?.id ?? bankAccounts[0]?.id ?? null;
  }, [bankAccounts]);

  // Calculate subtotal from line items
  const subtotalCents = useMemo(
    () => calculateSubtotalCents(lineItems),
    [lineItems],
  );

  // Create invoice mutation
  const createInvoice = useMutation(
    trpc.invoice.create.mutationOptions({
      onSuccess: (data) => {
        toast.success(tToast("invoiceCreated"));
        router.push(`/${slug}/invoices/${data.invoiceId}`);
      },
      onError: (error: { message: string }) => {
        toast.error(error.message);
      },
    }),
  );

  // Update form when defaultAccountId changes
  useEffect(() => {
    if (defaultAccountId && !bankAccountId) {
      setBankAccountId(defaultAccountId);
    }
  }, [defaultAccountId, bankAccountId]);

  // When selecting an existing customer, populate their details
  const handleCustomerSelect = (selectedCustomerId: string) => {
    if (selectedCustomerId === "new") {
      setShowNewCustomerForm(true);
      setCustomerId("");
      setCustomerEmail("");
      setCustomerName("");
      setCustomerAddress("");
      setCustomerTaxId("");
    } else {
      setShowNewCustomerForm(false);
      const customer = customers.find((c) => c.id === selectedCustomerId);
      if (customer) {
        setCustomerId(customer.id);
        setCustomerEmail(customer.email ?? "");
        setCustomerName(customer.name ?? "");
      }
    }
  };

  const validateEmail = (value: string) => {
    const result = z
      .email(t("emailInvalid"))
      .min(1, t("emailRequired"))
      .safeParse(value);
    if (!result.success) {
      setEmailError(result.error.issues[0]?.message);
      return false;
    }
    setEmailError(undefined);
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const accountId = bankAccountId || defaultAccountId;

    if (!accountId) {
      toast.error(t("bankAccountRequired"));
      return;
    }

    if (!customerEmail || !validateEmail(customerEmail)) {
      toast.error(t("customerEmailRequired"));
      return;
    }

    // Calculate amounts
    const taxRateBps = taxRatePercent
      ? Math.round(parseFloat(taxRatePercent) * 100)
      : 0;
    const discountCents = discountAmount
      ? Math.round(parseFloat(discountAmount) * 100)
      : 0;

    // Use line items subtotal if we have line items, otherwise use manual amount
    let finalSubtotalCents: number;
    if (lineItems.length > 0) {
      finalSubtotalCents = subtotalCents;
    } else {
      finalSubtotalCents = Math.round(parseFloat(amount) * 100);
    }

    const taxAmountCents = Math.round(
      (finalSubtotalCents * taxRateBps) / 10000,
    );
    const totalAmountCents =
      finalSubtotalCents + taxAmountCents - discountCents;

    // Validate total
    if (totalAmountCents <= 0) {
      toast.error(t("amountInvalid"));
      return;
    }

    // Validate password confirmation
    if (password && password !== passwordConfirm) {
      toast.error(t("passwordMismatch"));
      return;
    }

    // Calculate expiration minutes if set
    let expiresInMinutes: number | null = null;
    if (expiresAt) {
      const expiresDate = new Date(expiresAt);
      const now = new Date();
      const diffMs = expiresDate.getTime() - now.getTime();
      if (diffMs > 0) {
        expiresInMinutes = Math.ceil(diffMs / 60000);
      }
    }

    createInvoice.mutate({
      slug,
      amountCents: totalAmountCents,
      subtotalCents: finalSubtotalCents,
      taxRateBps,
      taxAmountCents,
      discountCents,
      bankAccountId: accountId,
      lineItems: lineItems.length > 0 ? lineItems : undefined,
      customerId: customerId || undefined,
      customerEmail: customerEmail,
      customerName: customerName || undefined,
      customerAddress: customerAddress || undefined,
      customerTaxId: customerTaxId || undefined,
      description: description || undefined,
      notes: notes || undefined,
      invoiceNumber: invoiceNumber || undefined,
      expiresInMinutes,
      password: password || undefined,
    });
  };

  if (isLoadingOrg) {
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

  // Calculate totals for display
  const taxRateBps = taxRatePercent
    ? Math.round(parseFloat(taxRatePercent) * 100)
    : 0;
  const discountCents = discountAmount
    ? Math.round(parseFloat(discountAmount) * 100)
    : 0;
  const displaySubtotal =
    lineItems.length > 0
      ? subtotalCents
      : amount
        ? Math.round(parseFloat(amount) * 100)
        : 0;
  const taxAmountCents = Math.round((displaySubtotal * taxRateBps) / 10000);
  const totalAmountCents = displaySubtotal + taxAmountCents - discountCents;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href={`/${slug}/invoices`}
          className="text-muted-foreground hover:text-foreground mb-2 block text-sm"
        >
          {t("backToInvoices")}
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("newInvoiceTitle")}
        </h1>
        <p className="text-muted-foreground">{t("newInvoiceDescription")}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Selection Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t("customerSection")}</CardTitle>
            <CardDescription>{t("customerSectionDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Customer Selector */}
            <div className="space-y-2">
              <Label>{t("selectCustomer")}</Label>
              <select
                className="border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm"
                onChange={(e) => handleCustomerSelect(e.target.value)}
                defaultValue=""
              >
                <option value="" disabled>
                  {t("selectCustomerPlaceholder")}
                </option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name ?? customer.email ?? customer.id}
                  </option>
                ))}
                <option value="new">{t("createNewCustomer")}</option>
              </select>
            </div>

            {/* New Customer Form */}
            {showNewCustomerForm && (
              <div className="border-muted space-y-4 rounded-lg border p-4">
                <p className="text-sm font-medium">{t("newCustomerDetails")}</p>

                <div className="space-y-2">
                  <Label>{t("emailLabel")} *</Label>
                  <Input
                    type="email"
                    placeholder={tCommon("placeholders.email")}
                    value={customerEmail}
                    onChange={(e) => {
                      setCustomerEmail(e.target.value);
                      setEmailError(undefined);
                    }}
                    onBlur={() => validateEmail(customerEmail)}
                  />
                  {emailError && (
                    <p className="text-sm text-red-500">{emailError}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>{t("nameLabel")}</Label>
                  <Input
                    type="text"
                    placeholder={tCommon("placeholders.name")}
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t("addressLabel")}</Label>
                  <Input
                    type="text"
                    placeholder={tCommon("placeholders.address")}
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t("taxIdLabel")}</Label>
                  <Input
                    type="text"
                    placeholder={tCommon("placeholders.taxId")}
                    value={customerTaxId}
                    onChange={(e) => setCustomerTaxId(e.target.value)}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Line Items */}
        <LineItemsEditor
          lineItems={lineItems}
          onLineItemsChange={setLineItems}
          showSubtotal={false}
        />

        {/* Invoice Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t("invoiceDetails")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Only show amount field if no line items */}
            {lineItems.length === 0 && (
              <div className="space-y-2">
                <Label>{t("amountLabel")} *</Label>
                <div className="relative">
                  <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
                    €
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder={tCommon("placeholders.amount")}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("taxRateLabel")}</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    placeholder="0"
                    value={taxRatePercent}
                    onChange={(e) => setTaxRatePercent(e.target.value)}
                    className="pr-8"
                  />
                  <span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2">
                    %
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("discountLabel")}</Label>
                <div className="relative">
                  <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
                    €
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
            </div>

            {/* Total Summary */}
            {(lineItems.length > 0 || displaySubtotal > 0) && (
              <div className="space-y-2 border-t pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("subtotal")}</span>
                  <span>€{(displaySubtotal / 100).toFixed(2)}</span>
                </div>
                {taxAmountCents > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t("tax")} ({(taxRateBps / 100).toFixed(1)}%)
                    </span>
                    <span>€{(taxAmountCents / 100).toFixed(2)}</span>
                  </div>
                )}
                {discountCents > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t("discount")}
                    </span>
                    <span className="text-green-600">
                      -€{(discountCents / 100).toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2 text-lg font-semibold">
                  <span>{t("total")}</span>
                  <span>€{(totalAmountCents / 100).toFixed(2)}</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>{t("invoiceNumberLabel")}</Label>
              <Input
                type="text"
                placeholder={t("invoiceNumberPlaceholder")}
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("descriptionLabel")}</Label>
              <Input
                type="text"
                placeholder={t("descriptionPlaceholder")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("notesLabel")}</Label>
              <Input
                type="text"
                placeholder={t("notesPlaceholder")}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Expiration & Security Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t("expirationSecuritySection")}</CardTitle>
            <CardDescription>
              {t("expirationSecurityDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t("expiresAtLabel")}</Label>
              <Input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
              />
              <p className="text-muted-foreground text-xs">
                {t("expiresAtHint")}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("passwordLabel")}</Label>
                <Input
                  type="password"
                  placeholder={t("passwordPlaceholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>{t("passwordConfirmLabel")}</Label>
                <Input
                  type="password"
                  placeholder={t("passwordConfirmPlaceholder")}
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                />
              </div>
            </div>
            <p className="text-muted-foreground text-xs">{t("passwordHint")}</p>
          </CardContent>
        </Card>

        {/* Bank Account Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t("bankAccountSection")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {bankAccounts.map((account) => {
                const activeAccountId = bankAccountId || defaultAccountId;
                return (
                  <div
                    key={account.id}
                    className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                      activeAccountId === account.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => setBankAccountId(account.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{account.accountName}</p>
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
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={createInvoice.isPending}
        >
          {createInvoice.isPending ? t("creating") : t("createButton")}
        </Button>
      </form>
    </div>
  );
}
