"use client";

import { createElement, Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckIcon,
  ClipboardCopyIcon,
  ExternalLinkIcon,
} from "@radix-ui/react-icons";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import type {
  OAuthFlowType,
  ProviderConfig,
  ProviderConfigField,
  ProviderConfigSchema,
} from "@getblitz/bank-providers";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@getblitz/ui";
import { Button } from "@getblitz/ui/button";
import { toast } from "@getblitz/ui/toast";

import { useTRPC } from "~/trpc/react";
import { getCustomProviderComponent } from "./custom-provider-components";

export interface ConfigureProviderClientProps {
  slug: string;
  operation: "create" | "update";
  providerDisplayName: string;
  // For new connections (created by server component)
  connectionId: string;
  callbackUrl: string;
  oauthFlowType: OAuthFlowType;
  setupGuideUrl: string | null;
  // Schema and default config
  configSchema: ProviderConfigSchema;
  defaultConfig: ProviderConfig;
  // For reconfiguring existing connections
  connectionName: string | null;
  // Optional custom setup UI (e.g. "wise-profile-selector")
  customConfigComponentId: string | null;
  /** Schema field names to show before the custom step (e.g. Wise API token) */
  fieldNamesBeforeCustomStep: string[];
}

export function ConfigureProviderClient({
  slug,
  operation,
  connectionId,
  providerDisplayName,
  callbackUrl,
  oauthFlowType,
  setupGuideUrl,
  configSchema,
  defaultConfig,
  connectionName,
  customConfigComponentId,
  fieldNamesBeforeCustomStep = [],
}: ConfigureProviderClientProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const t = useTranslations("BankConfigurePage");

  // Custom provider step (e.g. Wise profile selector)
  const CustomComponent = getCustomProviderComponent(customConfigComponentId);
  // For update operations, skip the custom step (profile already set)
  const [customStepDone, setCustomStepDone] = useState(
    !CustomComponent || operation === "update",
  );
  // Overrides injected by the custom component (e.g. profileId from Wise selector)
  const [configOverrides, setConfigOverrides] = useState<
    Record<string, unknown>
  >({});

  // State for 2-step flow (manual consent)
  const [step, setStep] = useState<1 | 2>(1);
  const [copied, setCopied] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Save bank config mutation (Step 2)
  const saveBankConfig = useMutation(
    trpc.organization.saveBankConfig.mutationOptions({
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  // Get auth URL mutation (for redirect flow)
  const getAuthUrl = useMutation(
    trpc.organization.getBankAuthUrl.mutationOptions({
      onSuccess: (data) => {
        router.push(data.authUrl);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  // For reconfiguring an existing connection
  const updateConnectionConfig = useMutation(
    trpc.organization.updateBankConnectionConfig.mutationOptions({
      onSuccess: () => {
        toast.success(t("configurationUpdated"));
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  // Delete pending connection (for cancel)
  const deletePendingConnection = useMutation(
    trpc.organization.deletePendingConnection.mutationOptions({
      onSuccess: () => {
        router.push(`/${slug}/banks/connect`);
      },
      onError: (error) => {
        toast.error(error.message);
        setIsCancelling(false);
      },
    }),
  );

  // Build default values from schema fields
  const buildDefaultValues = useMemo(() => {
    const defaults: Record<string, unknown> = {
      connectionName: connectionName ?? "",
    };

    configSchema.fields.forEach((field) => {
      if (field.defaultValue !== undefined) {
        defaults[field.name] = field.defaultValue;
      } else if (field.type === "boolean") {
        defaults[field.name] = false;
      } else if (field.type === "number") {
        defaults[field.name] = 0;
      } else {
        defaults[field.name] = "";
      }
    });

    Object.assign(defaults, defaultConfig);
    return defaults;
  }, [configSchema.fields, defaultConfig, connectionName]);

  const visibleFields = useMemo(
    () => configSchema.fields.filter((field) => !field.hidden),
    [configSchema.fields],
  );

  const useSplitCustomFlow =
    Boolean(CustomComponent) &&
    operation === "create" &&
    fieldNamesBeforeCustomStep.length > 0;

  const beforeFields = useMemo(() => {
    if (!useSplitCustomFlow) return [];
    const byName = new Map(visibleFields.map((f) => [f.name, f]));
    return fieldNamesBeforeCustomStep
      .map((name) => byName.get(name))
      .filter((f): f is ProviderConfigField => f != null);
  }, [useSplitCustomFlow, fieldNamesBeforeCustomStep, visibleFields]);

  const afterFields = useMemo(() => {
    if (!useSplitCustomFlow) return visibleFields;
    const before = new Set(fieldNamesBeforeCustomStep);
    return visibleFields.filter((f) => !before.has(f.name));
  }, [useSplitCustomFlow, fieldNamesBeforeCustomStep, visibleFields]);

  const fieldsForStandardProviderCard =
    operation === "update" || !useSplitCustomFlow ? visibleFields : afterFields;

  /** OAuth / manual-consent providers: show callback registration. Hidden for API-token-only (e.g. Wise). */
  const showCallbackCard = Boolean(callbackUrl) && oauthFlowType !== "none";

  // Create form
  const form = useForm({
    defaultValues: buildDefaultValues,
    onSubmit: async ({ value }) => {
      const { connectionName: name, ...providerConfig } = value;
      // Merge any config overrides from the custom setup step
      const mergedConfig = { ...providerConfig, ...configOverrides } as Record<
        string,
        unknown
      >;

      if (operation === "update") {
        // Update existing connection config
        await updateConnectionConfig.mutateAsync({
          slug,
          connectionId,
          providerConfig: mergedConfig,
          name: typeof name === "string" ? name.trim() || undefined : undefined,
        });
      } else {
        // Save config to database
        await saveBankConfig.mutateAsync({
          slug,
          connectionId,
          providerConfig: mergedConfig,
          connectionName:
            typeof name === "string" ? name.trim() || undefined : undefined,
        });
      }

      if (oauthFlowType === "redirect") {
        await getAuthUrl.mutateAsync({ slug, connectionId });
      } else if (oauthFlowType === "manual-consent") {
        // Manual consent flow - show instructions
        toast.success(t("configSaved"));
        setStep(2);
      } else {
        router.push(`/${slug}/banks/accounts/${connectionId}`);
      }
    },
  });

  type FormType = typeof form;

  // Helper component for conditionally rendering fields
  function ConditionalField({
    form: f,
    dependsOn,
    children,
  }: {
    form: FormType;
    dependsOn?: { field: string; value: unknown };
    children: React.ReactNode;
  }) {
    if (!dependsOn) {
      return <>{children}</>;
    }

    return (
      <f.Subscribe selector={(state) => state.values[dependsOn.field]}>
        {(dependentValue: unknown) => {
          if (dependentValue === dependsOn.value) {
            return <>{children}</>;
          }
          return null;
        }}
      </f.Subscribe>
    );
  }

  function renderConfigField(field: ProviderConfigField) {
    return (
      <ConditionalField
        key={field.name}
        form={form}
        dependsOn={field.dependsOn}
      >
        <form.Field
          name={field.name}
          validators={{
            onChange: ({ value }) => {
              if (field.required) {
                if (
                  field.type === "string" &&
                  (!value || (typeof value === "string" && value.trim() === ""))
                ) {
                  return t("fieldRequired", {
                    fieldLabel: field.label,
                  });
                }
                if (field.type === "boolean" && value === undefined) {
                  return t("fieldRequired", {
                    fieldLabel: field.label,
                  });
                }
                if (
                  field.type === "number" &&
                  (value === undefined || value === null || value === "")
                ) {
                  return t("fieldRequired", {
                    fieldLabel: field.label,
                  });
                }
              }
              return undefined;
            },
          }}
        >
          {(formField) => (
            <div className="space-y-2">
              <label
                htmlFor={field.name}
                className="text-sm leading-none font-medium"
              >
                {field.label}
                {field.required && (
                  <span className="text-destructive ml-1">*</span>
                )}
              </label>

              {field.type === "boolean" ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={field.name}
                    checked={
                      typeof formField.state.value === "boolean"
                        ? formField.state.value
                        : false
                    }
                    onChange={(e) => formField.handleChange(e.target.checked)}
                    onBlur={formField.handleBlur}
                    disabled={form.state.isSubmitting}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-muted-foreground text-sm">
                    {field.description}
                  </span>
                </div>
              ) : field.type === "number" ? (
                <>
                  <input
                    type="number"
                    id={field.name}
                    value={
                      typeof formField.state.value === "number"
                        ? formField.state.value
                        : ""
                    }
                    onChange={(e) =>
                      formField.handleChange(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                    onBlur={formField.handleBlur}
                    placeholder={field.description}
                    required={field.required}
                    disabled={form.state.isSubmitting}
                    className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
                  />
                  {field.description && (
                    <p className="text-muted-foreground text-xs">
                      {field.description}
                    </p>
                  )}
                </>
              ) : field.type === "textarea" ? (
                <>
                  <textarea
                    id={field.name}
                    rows={8}
                    value={
                      typeof formField.state.value === "string"
                        ? formField.state.value
                        : ""
                    }
                    onChange={(e) => formField.handleChange(e.target.value)}
                    onBlur={formField.handleBlur}
                    placeholder={field.description}
                    required={field.required}
                    disabled={form.state.isSubmitting}
                    className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border px-3 py-2 font-mono text-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
                  />
                  {field.description && (
                    <p className="text-muted-foreground text-xs">
                      {field.description}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <input
                    type={field.secret ? "password" : "text"}
                    id={field.name}
                    value={
                      typeof formField.state.value === "string"
                        ? formField.state.value
                        : ""
                    }
                    onChange={(e) => formField.handleChange(e.target.value)}
                    onBlur={formField.handleBlur}
                    placeholder={field.description}
                    required={field.required}
                    disabled={form.state.isSubmitting}
                    className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
                  />
                  {field.description && (
                    <p className="text-muted-foreground text-xs">
                      {field.description}
                    </p>
                  )}
                </>
              )}
              {formField.state.meta.errors.length > 0 && (
                <p className="text-sm text-red-500">
                  {formField.state.meta.errors.join(", ")}
                </p>
              )}
            </div>
          )}
        </form.Field>
      </ConditionalField>
    );
  }

  const handleCopyUrl = async () => {
    if (callbackUrl) {
      await navigator.clipboard.writeText(callbackUrl);
      setCopied(true);
      toast.success(t("urlCopied"));
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCancel = async () => {
    if (operation === "create") {
      // For new connections, delete the pending connection first
      setIsCancelling(true);
      await deletePendingConnection.mutateAsync({
        slug,
        connectionId,
      });
    }
    router.push(`/${slug}/banks/connect`);
  };

  // For manual consent flow after config is saved - show waiting instructions
  if (step === 2 && oauthFlowType === "manual-consent" && callbackUrl) {
    return (
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <Link
            href={`/${slug}/banks/connect`}
            className="text-muted-foreground hover:text-foreground mb-2 block text-sm"
          >
            {t("backToProviders")}
          </Link>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {t("completeAuthorization")}
          </h1>
          <p className="text-muted-foreground">
            {t("manualConsentDescription")}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("nextSteps")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ol className="list-inside list-decimal space-y-4">
              <li>{t("openBankApp", { providerName: providerDisplayName })}</li>
              <li>{t("navigateToApiSettings")}</li>
              <li>{t("clickEnableAccess")}</li>
              <li>{t("youWillBeRedirected")}</li>
            </ol>

            <div className="bg-muted rounded-lg p-4">
              <p className="text-muted-foreground mb-2 text-sm">
                {t("yourCallbackUrl")}
              </p>
              <code className="text-foreground block text-sm break-all">
                {callbackUrl}
              </code>
            </div>

            {setupGuideUrl && (
              <a
                href={setupGuideUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80 inline-flex items-center gap-1 text-sm font-medium"
              >
                {t("viewSetupGuide")}
                <ExternalLinkIcon className="h-3.5 w-3.5" />
              </a>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <Link
          href={`/${slug}/banks/connect`}
          className="text-muted-foreground hover:text-foreground mb-2 block text-sm"
        >
          {t("backToProviders")}
        </Link>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {operation === "update"
            ? t("reconfigureTitle", { providerName: providerDisplayName })
            : t("title", { providerName: providerDisplayName })}
        </h1>
        <p className="text-muted-foreground">
          {operation === "update"
            ? t("reconfigureDescription")
            : t("description")}
        </p>
      </div>

      {/* Step 1: Callback URL — OAuth / manual-consent providers only (not API-token-only e.g. Wise) */}
      {showCallbackCard && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-full text-sm">
                1
              </span>
              {t("registerCallbackUrl")}
            </CardTitle>
            <CardDescription>
              {t("registerCallbackUrlDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={callbackUrl}
                className="border-input bg-muted flex h-10 flex-1 rounded-md border px-3 py-2 font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleCopyUrl}
                className="shrink-0"
              >
                {copied ? (
                  <CheckIcon className="h-4 w-4" />
                ) : (
                  <ClipboardCopyIcon className="h-4 w-4" />
                )}
              </Button>
            </div>
            {setupGuideUrl && (
              <a
                href={setupGuideUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80 inline-flex items-center gap-1 text-sm font-medium"
              >
                {t("viewSetupGuide")}
                <ExternalLinkIcon className="h-3.5 w-3.5" />
              </a>
            )}
          </CardContent>
        </Card>
      )}

      {/* Wise-style: API token + sandbox first, then profile picker (live form values via Subscribe) */}
      {useSplitCustomFlow && !customStepDone && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-full text-sm">
                  {showCallbackCard ? 2 : 1}
                </span>
                {t("providerConfiguration")}
              </CardTitle>
              <CardDescription>
                {t("providerConfigurationDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {beforeFields.map((field) => renderConfigField(field))}
            </CardContent>
          </Card>

          <Suspense
            fallback={
              <div className="flex items-center justify-center rounded-xl border py-10">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent opacity-50" />
              </div>
            }
          >
            <form.Subscribe selector={(state) => state.values}>
              {(values) =>
                CustomComponent
                  ? createElement(CustomComponent, {
                      slug,
                      connectionId,
                      providerConfig: values,
                      onConfigUpdate: (updates: Record<string, unknown>) =>
                        setConfigOverrides((prev) => ({ ...prev, ...updates })),
                      onComplete: () => setCustomStepDone(true),
                    })
                  : null
              }
            </form.Subscribe>
          </Suspense>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              disabled={isCancelling}
              onClick={() => void handleCancel()}
            >
              {isCancelling ? t("cancelling") : t("cancel")}
            </Button>
          </div>
        </>
      )}

      {/* Legacy: custom step first (no declared prerequisite fields) */}
      {CustomComponent &&
        !customStepDone &&
        !useSplitCustomFlow &&
        operation === "create" && (
          <Suspense
            fallback={
              <div className="flex items-center justify-center rounded-xl border py-10">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent opacity-50" />
              </div>
            }
          >
            <form.Subscribe selector={(state) => state.values}>
              {(values) =>
                createElement(CustomComponent, {
                  slug,
                  connectionId,
                  providerConfig: values,
                  onConfigUpdate: (updates: Record<string, unknown>) =>
                    setConfigOverrides((prev) => ({ ...prev, ...updates })),
                  onComplete: () => setCustomStepDone(true),
                })
              }
            </form.Subscribe>
          </Suspense>
        )}

      {/* Standard config form — hidden until custom step completes (when applicable) */}
      {customStepDone && (
        <>
          {/* Connection Name Section */}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {operation === "create" && (
                  <span className="bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-full text-sm">
                    {useSplitCustomFlow
                      ? showCallbackCard
                        ? 4
                        : 3
                      : showCallbackCard
                        ? 2
                        : 1}
                  </span>
                )}
                {t("connectionName")}
              </CardTitle>
              <CardDescription>
                {t("connectionNameDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form.Field
                name="connectionName"
                validators={{
                  onChange: ({ value }) => {
                    if (typeof value === "string" && value.length > 255) {
                      return t("connectionNameMaxLength");
                    }
                    return undefined;
                  },
                }}
              >
                {(field) => (
                  <div className="space-y-2">
                    <label
                      htmlFor="connection-name"
                      className="text-sm leading-none font-medium"
                    >
                      {t("connectionNameOptional")}
                    </label>
                    <input
                      type="text"
                      id="connection-name"
                      value={
                        typeof field.state.value === "string"
                          ? field.state.value
                          : ""
                      }
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder={t("connectionNamePlaceholder")}
                      maxLength={255}
                      disabled={form.state.isSubmitting}
                      className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-red-500">
                        {field.state.meta.errors.join(", ")}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>
            </CardContent>
          </Card>

          {/* Remaining provider fields (or full list for non-split / update) */}
          {fieldsForStandardProviderCard.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {operation === "create" && (
                    <span className="bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-full text-sm">
                      {useSplitCustomFlow
                        ? showCallbackCard
                          ? 5
                          : 4
                        : showCallbackCard
                          ? 3
                          : 2}
                    </span>
                  )}
                  {t("providerConfiguration")}
                </CardTitle>
                <CardDescription>
                  {t("providerConfigurationDescription")}
                </CardDescription>
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
                  {fieldsForStandardProviderCard.map((field) =>
                    renderConfigField(field),
                  )}

                  <div className="flex justify-end gap-4 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={form.state.isSubmitting || isCancelling}
                      onClick={handleCancel}
                    >
                      {isCancelling ? t("cancelling") : t("cancel")}
                    </Button>
                    <form.Subscribe
                      selector={(state) => [
                        state.isSubmitting,
                        state.canSubmit,
                      ]}
                      children={([isSubmitting, canSubmit]) => (
                        <Button
                          type="submit"
                          disabled={
                            !canSubmit ||
                            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                            isSubmitting ||
                            saveBankConfig.isPending ||
                            getAuthUrl.isPending ||
                            isCancelling
                          }
                        >
                          {isSubmitting ||
                          saveBankConfig.isPending ||
                          getAuthUrl.isPending
                            ? operation === "update"
                              ? t("updating")
                              : t("connecting")
                            : operation === "update"
                              ? t("update")
                              : t("connect")}
                        </Button>
                      )}
                    />
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Split flow phase 2: connection name + submit only (no extra provider fields) */}
          {useSplitCustomFlow && fieldsForStandardProviderCard.length === 0 && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void form.handleSubmit();
              }}
              className="flex justify-end gap-4 pt-2"
            >
              <Button
                type="button"
                variant="outline"
                disabled={form.state.isSubmitting || isCancelling}
                onClick={handleCancel}
              >
                {isCancelling ? t("cancelling") : t("cancel")}
              </Button>
              <form.Subscribe
                selector={(state) => [state.isSubmitting, state.canSubmit]}
                children={([isSubmitting, canSubmit]) => (
                  <Button
                    type="submit"
                    disabled={
                      !canSubmit ||
                      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                      isSubmitting ||
                      saveBankConfig.isPending ||
                      getAuthUrl.isPending ||
                      isCancelling
                    }
                  >
                    {isSubmitting ||
                    saveBankConfig.isPending ||
                    getAuthUrl.isPending
                      ? t("connecting")
                      : t("connect")}
                  </Button>
                )}
              />
            </form>
          )}
        </>
      )}
    </div>
  );
}
