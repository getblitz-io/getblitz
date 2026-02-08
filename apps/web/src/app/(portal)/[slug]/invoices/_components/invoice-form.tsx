"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import type { InvoiceFormValues, LineItem } from "@getblitz/validators";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@getblitz/ui";
import { Button } from "@getblitz/ui/button";
import { Label } from "@getblitz/ui/label";
import { toast } from "@getblitz/ui/toast";
import { InvoiceFormSchema } from "@getblitz/validators";

import { useTRPC } from "~/trpc/react";
import {
  calculateSubtotalCents,
  CustomerAsyncSelect,
  CustomerFields,
  FinancialDetails,
  InvoiceContentFields,
  LineItemsEditor,
  PasswordFields,
  PreviewButton,
} from ".";

// Helper to extract error messages from TanStack Form validation errors
// Errors can be strings, objects with a message property, or undefined
function getErrorMessages(errors: unknown[] | undefined): string {
  if (!errors || errors.length === 0) return "";
  return errors
    .map((e) => {
      if (typeof e === "string") return e;
      if (e && typeof e === "object" && "message" in e) {
        return String((e as { message: unknown }).message);
      }
      return "";
    })
    .filter(Boolean)
    .join(", ");
}

// Types for bank accounts and customers passed from server
interface BankAccountWithBank {
  id: string;
  accountName: string;
  accountIban: string;
  accountBic: string;
  isDefault: boolean;
  bankName: string;
}

// Default values for edit mode
interface InvoiceDefaultValues {
  invoiceId: string;
  referenceId: string;
  customerEmail?: string | null;
  customerName?: string | null;
  customerAddress?: string | null;
  customerTaxId?: string | null;
  description?: string | null;
  notes?: string | null;
  invoiceNumber?: string | null;
  lineItems?: LineItem[];
  isPasswordProtected?: boolean;
  // Financial fields for edit mode
  subtotalCents?: number;
  taxRateBps?: number;
  taxAmountCents?: number;
  discountCents?: number;
  amountCents?: number;
  status?: "DRAFT" | "FINALIZED" | "PAID" | "CANCELLED";
}

interface InvoiceFormProps {
  slug: string;
  mode: "create" | "edit";
  // Create mode props
  bankAccounts?: BankAccountWithBank[];
  defaultAccountId?: string | null;
  // Edit mode props
  defaultValues?: InvoiceDefaultValues;
}

export function InvoiceForm({
  slug,
  mode,
  bankAccounts = [],
  defaultAccountId = null,
  defaultValues,
}: InvoiceFormProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const t = useTranslations("InvoicesPage");
  const tCommon = useTranslations("Common");
  const tToast = useTranslations("Toast");

  // Refs to track form initialization (edit mode)
  const formLoadedRef = useRef(false);
  const lineItemsLoadedRef = useRef(false);

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

  // Update invoice mutation
  const updateInvoice = useMutation(
    trpc.invoice.update.mutationOptions({
      onSuccess: () => {
        toast.success(tToast("invoiceUpdated"));
        router.push(`/${slug}/invoices/${defaultValues?.invoiceId}`);
      },
      onError: (error: { message: string }) => {
        toast.error(error.message);
      },
    }),
  );

  const isPending =
    mode === "create" ? createInvoice.isPending : updateInvoice.isPending;

  const isReadOnly =
    mode === "edit" &&
    defaultValues?.status &&
    defaultValues.status !== "DRAFT";

  // Finalize invoice mutation
  const finalizeInvoice = useMutation(
    trpc.invoice.finalize.mutationOptions({
      onSuccess: () => {
        toast.success(tToast("invoiceFinalized"));
        router.refresh();
      },
      onError: (error: { message: string }) => {
        toast.error(error.message);
      },
    }),
  );

  // Form with TanStack React Form
  const form = useForm({
    validators: {
      onChange: InvoiceFormSchema,
    },
    defaultValues: {
      // Customer fields (create mode with selection)
      showNewCustomerForm: false,
      customerId: "",
      // Customer fields (shared)
      customerEmail: "",
      customerName: "",
      customerAddress: "",
      customerTaxId: "",
      // Invoice content fields
      currency: "EUR",
      description: "",
      notes: "",
      invoiceNumber: "",
      // Line items
      lineItems: [] as LineItem[],
      // Password fields
      password: "",
      passwordConfirm: "",
      removePassword: false,
      // Create-only fields
      amount: "",
      bankAccountId: "",
      taxRatePercent: "",
      discountAmount: "",
      expiresAt: "",
    } as InvoiceFormValues,
    onSubmit: ({ value }) => {
      // Manual check for amount/line items since it involves calculation
      if (mode === "create") {
        handleCreate(value);
      } else {
        handleUpdate(value);
      }
    },
  });

  // Handle create submission
  const handleCreate = (value: InvoiceFormValues) => {
    const accountId = value.bankAccountId || defaultAccountId;

    if (!accountId) {
      toast.error(t("bankAccountRequired"));
      return;
    }

    if (!value.customerEmail) {
      toast.error(t("customerEmailRequired"));
      return;
    }

    // Calculate amounts
    const taxRateBps = value.taxRatePercent
      ? Math.round(parseFloat(value.taxRatePercent) * 100)
      : 0;
    const discountCents = value.discountAmount
      ? Math.round(parseFloat(value.discountAmount) * 100)
      : 0;

    // Use line items subtotal if we have line items, otherwise use manual amount
    let finalSubtotalCents: number;
    if (value.lineItems.length > 0) {
      finalSubtotalCents = calculateSubtotalCents(value.lineItems);
    } else {
      finalSubtotalCents = Math.round(
        parseFloat(
          value.amount && value.amount.length > 0 ? value.amount : "0",
        ) * 100,
      );
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

    // Calculate expiration minutes if set
    let expiresInMinutes: number | null = null;
    if (value.expiresAt) {
      const expiresDate = new Date(value.expiresAt);
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
      lineItems: value.lineItems.length > 0 ? value.lineItems : [],
      customerId:
        value.customerId && value.customerId.length > 0
          ? value.customerId
          : undefined,
      customerEmail: value.customerEmail,
      customerName: value.customerName ?? undefined,
      customerAddress: value.customerAddress ?? undefined,
      customerTaxId: value.customerTaxId ?? undefined,
      description: value.description ?? undefined,
      notes: value.notes ?? undefined,
      invoiceNumber: value.invoiceNumber ?? undefined,
      expiresInMinutes,
      password:
        value.password && value.password.length > 0
          ? value.password
          : undefined,
    });
  };

  // Handle update submission
  const handleUpdate = (value: InvoiceFormValues) => {
    if (!defaultValues?.invoiceId) return;

    // Calculate financial values
    const lineItemsSubtotal = calculateSubtotalCents(value.lineItems);
    const subtotalCents =
      value.lineItems.length > 0
        ? lineItemsSubtotal
        : (defaultValues.subtotalCents ?? 0);

    const taxRateBps = value.taxRatePercent
      ? Math.round(parseFloat(value.taxRatePercent) * 100)
      : (defaultValues.taxRateBps ?? 0);
    const discountCents = value.discountAmount
      ? Math.round(parseFloat(value.discountAmount) * 100)
      : (defaultValues.discountCents ?? 0);
    const taxAmountCents = Math.round((subtotalCents * taxRateBps) / 10000);

    updateInvoice.mutate({
      slug,
      id: defaultValues.invoiceId,
      customerEmail: value.customerEmail,
      customerName: value.customerName ?? undefined,
      customerAddress: value.customerAddress ?? undefined,
      customerTaxId: value.customerTaxId ?? undefined,
      description: value.description ?? undefined,
      notes: value.notes ?? undefined,
      invoiceNumber: value.invoiceNumber ?? undefined,
      lineItems: value.lineItems.length > 0 ? value.lineItems : undefined,
      subtotalCents,
      taxRateBps,
      taxAmountCents,
      discountCents,
      password:
        value.password && value.password.length > 0
          ? value.password
          : undefined,
    });
  };

  // Update form when defaultAccountId changes (create mode)
  useEffect(() => {
    if (
      mode === "create" &&
      defaultAccountId &&
      !form.state.values.bankAccountId
    ) {
      form.setFieldValue("bankAccountId", defaultAccountId);
    }
  }, [mode, defaultAccountId, form]);

  // Reset refs when invoice changes (edit mode) - fixes navigation between invoices
  useEffect(() => {
    formLoadedRef.current = false;
    lineItemsLoadedRef.current = false;
  }, [defaultValues?.invoiceId]);

  // Populate form when defaultValues change (edit mode)
  useEffect(() => {
    if (mode === "edit" && defaultValues && !formLoadedRef.current) {
      formLoadedRef.current = true;
      form.setFieldValue("customerEmail", defaultValues.customerEmail ?? "");
      form.setFieldValue("customerName", defaultValues.customerName ?? "");
      form.setFieldValue(
        "customerAddress",
        defaultValues.customerAddress ?? "",
      );
      form.setFieldValue("customerTaxId", defaultValues.customerTaxId ?? "");
      form.setFieldValue("description", defaultValues.description ?? "");
      form.setFieldValue("notes", defaultValues.notes ?? "");
      form.setFieldValue("invoiceNumber", defaultValues.invoiceNumber ?? "");
      // Set tax and discount values (convert from bps/cents to display values)
      if (defaultValues.taxRateBps !== undefined) {
        form.setFieldValue(
          "taxRatePercent",
          (defaultValues.taxRateBps / 100).toString(),
        );
      }
      if (defaultValues.discountCents !== undefined) {
        form.setFieldValue(
          "discountAmount",
          (defaultValues.discountCents / 100).toString(),
        );
      }
    }
  }, [mode, defaultValues, form]);

  // Initialize line items from defaultValues (edit mode)
  useEffect(() => {
    if (
      mode === "edit" &&
      defaultValues?.lineItems &&
      Array.isArray(defaultValues.lineItems) &&
      !lineItemsLoadedRef.current
    ) {
      lineItemsLoadedRef.current = true;
      const items = defaultValues.lineItems;
      const timeoutId = setTimeout(() => {
        form.setFieldValue("lineItems", items);
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [mode, defaultValues?.lineItems, form]);

  // When selecting an existing customer, populate their details (create mode)
  const handleCustomerSelect = (customer: {
    id: string;
    email: string | null;
    name: string | null;
    isNew: boolean;
  }) => {
    if (customer.isNew) {
      form.setFieldValue("showNewCustomerForm", true);
      form.setFieldValue("customerId", "");
      form.setFieldValue("customerEmail", customer.email ?? "");
      form.setFieldValue("customerName", "");
      form.setFieldValue("customerAddress", "");
      form.setFieldValue("customerTaxId", "");
    } else {
      form.setFieldValue("showNewCustomerForm", false);
      form.setFieldValue("customerId", customer.id);
      form.setFieldValue("customerEmail", customer.email ?? "");
      form.setFieldValue("customerName", customer.name ?? "");
    }
  };

  // Back link and title based on mode
  const backLink =
    mode === "create"
      ? `/${slug}/invoices`
      : `/${slug}/invoices/${defaultValues?.invoiceId}`;
  const backLabel =
    mode === "create" ? t("backToInvoices") : t("backToInvoiceDetails");
  const title =
    mode === "create"
      ? t("newInvoiceTitle")
      : `${t("editInvoiceTitle")} - ${defaultValues?.invoiceNumber ?? defaultValues?.referenceId}`;
  const description =
    mode === "create"
      ? t("newInvoiceDescription")
      : t("editInvoiceDescription");
  const submitLabel =
    mode === "create"
      ? isPending
        ? t("creating")
        : t("createButton")
      : isPending
        ? t("saving")
        : t("saveButton");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href={backLink}
          className="text-muted-foreground hover:text-foreground mb-2 block text-sm"
        >
          {backLabel}
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void form.handleSubmit();
        }}
        className={`space-y-6 ${isReadOnly ? "pointer-events-none opacity-60" : ""}`}
      >
        {/* Customer Section */}
        <form.Subscribe
          selector={(state) => ({
            showNewCustomerForm: state.values.showNewCustomerForm,
            email: state.values.customerEmail,
            name: state.values.customerName,
            address: state.values.customerAddress,
            taxId: state.values.customerTaxId,
            errors: state.errors,
            fieldErrors: {
              email: getErrorMessages(state.fieldMeta.customerEmail?.errors),
              name: getErrorMessages(state.fieldMeta.customerName?.errors),
              address: getErrorMessages(
                state.fieldMeta.customerAddress?.errors,
              ),
              taxId: getErrorMessages(state.fieldMeta.customerTaxId?.errors),
            },
          })}
        >
          {({
            showNewCustomerForm,
            email,
            name,
            address,
            taxId,
            fieldErrors,
          }) => (
            <>
              {/* Customer Selector (Create Mode Only) */}
              {mode === "create" && (
                <Card>
                  <CardHeader>
                    <CardTitle>{t("customerSection")}</CardTitle>
                    <CardDescription>
                      {t("customerSectionDescription")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>{t("selectCustomer")}</Label>
                      <CustomerAsyncSelect
                        slug={slug}
                        onSelect={handleCustomerSelect}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Customer Fields (shown when new customer form is active in create mode, or always in edit mode) */}
              {(mode === "edit" || showNewCustomerForm) && (
                <CustomerFields
                  email={email}
                  name={name ?? ""}
                  address={address ?? ""}
                  taxId={taxId ?? ""}
                  onEmailChange={(v) => form.setFieldValue("customerEmail", v)}
                  onNameChange={(v) => form.setFieldValue("customerName", v)}
                  onAddressChange={(v) =>
                    form.setFieldValue("customerAddress", v)
                  }
                  onTaxIdChange={(v) => form.setFieldValue("customerTaxId", v)}
                  emailRequired={mode === "create"}
                  emailError={fieldErrors.email}
                  nameError={fieldErrors.name}
                  addressError={fieldErrors.address}
                  taxIdError={fieldErrors.taxId}
                />
              )}
            </>
          )}
        </form.Subscribe>

        {/* Line Items */}
        <form.Field name="lineItems">
          {(field) => (
            <LineItemsEditor
              lineItems={field.state.value}
              onLineItemsChange={(items) => field.handleChange(items)}
              showSubtotal={mode === "edit"}
              error={getErrorMessages(field.state.meta.errors)}
            />
          )}
        </form.Field>

        {/* Financial Details & Amount Breakdown */}
        <form.Subscribe
          selector={(state) => ({
            lineItems: state.values.lineItems,
            taxRatePercent: state.values.taxRatePercent,
            discountAmount: state.values.discountAmount,
            fieldErrors: {
              taxRate: getErrorMessages(state.fieldMeta.taxRatePercent?.errors),
              discount: getErrorMessages(
                state.fieldMeta.discountAmount?.errors,
              ),
            },
          })}
        >
          {({ lineItems, taxRatePercent, discountAmount, fieldErrors }) => (
            <FinancialDetails
              taxRatePercent={taxRatePercent ?? ""}
              discountAmount={discountAmount ?? ""}
              onTaxRateChange={(v) => form.setFieldValue("taxRatePercent", v)}
              onDiscountChange={(v) => form.setFieldValue("discountAmount", v)}
              lineItems={lineItems}
              defaultSubtotalCents={defaultValues?.subtotalCents}
              taxRateError={fieldErrors.taxRate}
              discountError={fieldErrors.discount}
            />
          )}
        </form.Subscribe>

        {/* Invoice Details Card (Create Mode) or Invoice Content Fields (Edit Mode) */}
        <form.Subscribe
          selector={(state) => ({
            invoiceNumber: state.values.invoiceNumber,
            description: state.values.description,
            notes: state.values.notes,
            fieldErrors: {
              invoiceNumber: getErrorMessages(
                state.fieldMeta.invoiceNumber?.errors,
              ),
              description: getErrorMessages(
                state.fieldMeta.description?.errors,
              ),
              notes: getErrorMessages(state.fieldMeta.notes?.errors),
            },
          })}
        >
          {({ invoiceNumber, description, notes, fieldErrors }) => (
            <InvoiceContentFields
              invoiceNumber={invoiceNumber ?? ""}
              description={description ?? ""}
              notes={notes ?? ""}
              onInvoiceNumberChange={(v) =>
                form.setFieldValue("invoiceNumber", v)
              }
              onDescriptionChange={(v) => form.setFieldValue("description", v)}
              onNotesChange={(v) => form.setFieldValue("notes", v)}
              invoiceNumberError={fieldErrors.invoiceNumber}
              descriptionError={fieldErrors.description}
              notesError={fieldErrors.notes}
            />
          )}
        </form.Subscribe>

        {/* Expiration & Security (Create Mode) or Password Fields (Edit Mode) */}
        <form.Subscribe
          selector={(state) => ({
            password: state.values.password,
            passwordConfirm: state.values.passwordConfirm,
            removePassword: state.values.removePassword,
            fieldErrors: {
              password: getErrorMessages(state.fieldMeta.password?.errors),
              passwordConfirm: getErrorMessages(
                state.fieldMeta.passwordConfirm?.errors,
              ),
            },
          })}
        >
          {({ password, passwordConfirm, removePassword, fieldErrors }) => (
            <PasswordFields
              password={password ?? ""}
              passwordConfirm={passwordConfirm ?? ""}
              onPasswordChange={(v) => form.setFieldValue("password", v)}
              onPasswordConfirmChange={(v) =>
                form.setFieldValue("passwordConfirm", v)
              }
              isPasswordProtected={defaultValues?.isPasswordProtected}
              removePassword={removePassword}
              onRemovePasswordToggle={() =>
                form.setFieldValue("removePassword", !removePassword)
              }
              passwordError={fieldErrors.password}
              passwordConfirmError={fieldErrors.passwordConfirm}
            />
          )}
        </form.Subscribe>

        {/* Bank Account Card */}
        {bankAccounts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t("bankAccountSection")}</CardTitle>
            </CardHeader>
            <CardContent>
              <form.Field name="bankAccountId">
                {(field) => (
                  <div className="space-y-2">
                    {bankAccounts.map((account) => {
                      const activeAccountId = field.state.value;
                      return (
                        <div
                          key={account.id}
                          className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                            activeAccountId === account.id
                              ? "border-primary bg-primary/5"
                              : "hover:bg-muted/50"
                          } ${
                            field.state.meta.errors.length > 0
                              ? "border-red-500"
                              : ""
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
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-red-500">
                        {getErrorMessages(field.state.meta.errors)}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>
            </CardContent>
          </Card>
        )}

        {/* Actions for Edit Mode */}
        {mode === "edit" && (
          <div className="flex flex-col gap-3 border-t pt-6">
            <div className="flex gap-3">
              {!isReadOnly && (
                <form.Subscribe
                  selector={(state) => [state.isSubmitting, state.canSubmit]}
                >
                  {([isSubmitting, canSubmit]) => (
                    <Button
                      type="submit"
                      className="flex-1"
                      size="lg"
                      disabled={!!isSubmitting || !canSubmit || isPending}
                    >
                      {submitLabel}
                    </Button>
                  )}
                </form.Subscribe>
              )}

              {defaultValues?.invoiceId && (
                <PreviewButton
                  slug={slug}
                  invoiceId={defaultValues.invoiceId}
                  size="lg"
                />
              )}

              {!isReadOnly && (
                <Button
                  type="button"
                  variant="default"
                  size="lg"
                  className="flex-1 bg-green-600 text-white hover:bg-green-700"
                  onClick={() => {
                    if (confirm(t("confirmFinalize"))) {
                      if (defaultValues?.invoiceId) {
                        finalizeInvoice.mutate({
                          slug,
                          id: defaultValues.invoiceId,
                        });
                      }
                    }
                  }}
                  disabled={finalizeInvoice.isPending}
                >
                  {finalizeInvoice.isPending
                    ? tCommon("buttons.loading")
                    : t("finalizeButton")}
                </Button>
              )}
            </div>

            <Link href={backLink} className="w-full">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full"
              >
                {tCommon("actions.cancel")}
              </Button>
            </Link>
          </div>
        )}

        {mode === "create" && (
          <div className="flex gap-3">
            <form.Subscribe
              selector={(state) => [state.isSubmitting, state.canSubmit]}
            >
              {([isSubmitting, canSubmit]) => (
                <Button
                  type="submit"
                  className="flex-1"
                  size="lg"
                  disabled={!!isSubmitting || !canSubmit || isPending}
                >
                  {submitLabel}
                </Button>
              )}
            </form.Subscribe>
          </div>
        )}
      </form>
    </div>
  );
}
