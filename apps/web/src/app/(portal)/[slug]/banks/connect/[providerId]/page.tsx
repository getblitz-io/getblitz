"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  CheckIcon,
  ClipboardCopyIcon,
  ExternalLinkIcon,
} from "@radix-ui/react-icons";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import type { OAuthFlowType } from "@getblitz/bank-providers";
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

export default function ConfigureProviderPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const connectionId = searchParams.get("connectionId");
  const providerId = params.providerId as string;
  const trpc = useTRPC();
  const t = useTranslations("BankConfigurePage");

  // State for 2-step flow
  const [step, setStep] = useState<1 | 2>(1);
  const [pendingConnectionId, setPendingConnectionId] = useState<string | null>(
    null,
  );
  const [callbackUrl, setCallbackUrl] = useState<string | null>(null);
  const [oauthFlowType, setOauthFlowType] = useState<OAuthFlowType | null>(
    null,
  );
  const [setupGuideUrl, setSetupGuideUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isReconfiguring = !!connectionId;

  // Get the provider config schema (with existing config if connectionId provided)
  const { data: configData, isLoading: isLoadingSchema } = useQuery({
    ...trpc.organization.getProviderConfigSchema.queryOptions({
      providerId,
      connectionId: connectionId ?? undefined,
      slug,
    }),
    enabled: !!slug && !!providerId,
  });

  // Get connections to find provider info (for reconfiguring)
  const { data: connections } = useQuery({
    ...trpc.organization.getBankConnections.queryOptions({ slug }),
    enabled: !!slug && isReconfiguring,
  });

  const connection = useMemo(
    () => connections?.find((c) => c.id === connectionId),
    [connections, connectionId],
  );

  const providerInfo = useMemo(() => {
    if (connection) {
      return {
        name: connection.providerName,
        displayName: connection.name ?? connection.providerName,
      };
    }
    return { name: providerId, displayName: providerId };
  }, [connection, providerId]);

  // Initialize bank connection mutation (Step 1)
  const initConnection = useMutation(
    trpc.organization.initBankConnection.mutationOptions({
      onSuccess: (data) => {
        setPendingConnectionId(data.connectionId);
        setCallbackUrl(data.callbackUrl);
        setOauthFlowType(data.oauthFlowType);
        setSetupGuideUrl(data.setupGuideUrl);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

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
      onSuccess: (data) => {
        toast.success(t("configurationUpdated"));
        router.push(`/${slug}/banks/accounts/${data.connectionId}`);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  // Initialize connection on mount (for new connections)
  useEffect(() => {
    if (!isReconfiguring && !pendingConnectionId && !initConnection.isPending) {
      initConnection.mutate({ slug, providerId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReconfiguring, providerId, slug]);

  // Build default values from schema fields
  const buildDefaultValues = useMemo(() => {
    if (!configData) return { connectionName: "" };

    const defaults: Record<string, unknown> = {
      connectionName: connection?.name ?? "",
    };

    configData.schema.fields.forEach((field) => {
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

    Object.assign(defaults, configData.defaultConfig);
    return defaults;
  }, [configData, connection?.name]);

  // Create form
  const form = useForm({
    defaultValues: buildDefaultValues,
    onSubmit: async ({ value }) => {
      const { connectionName: name, ...providerConfig } = value;

      if (isReconfiguring && connectionId) {
        // Update existing connection config
        updateConnectionConfig.mutate({
          slug,
          connectionId,
          providerConfig: providerConfig as Record<string, unknown>,
          name: typeof name === "string" ? name.trim() || undefined : undefined,
        });
      } else if (pendingConnectionId) {
        // Save config to database
        await saveBankConfig.mutateAsync({
          slug,
          connectionId: pendingConnectionId,
          providerConfig: providerConfig as Record<string, unknown>,
          connectionName:
            typeof name === "string" ? name.trim() || undefined : undefined,
        });

        // Redirect based on flow type
        if (oauthFlowType === "redirect") {
          getAuthUrl.mutate({ slug, connectionId: pendingConnectionId });
        } else {
          // Manual consent flow - show instructions
          toast.success(t("configSaved"));
          setStep(2);
        }
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

  // Update form when configData loads
  useEffect(() => {
    if (configData?.defaultConfig) {
      const updatedValues: Record<string, unknown> = {
        connectionName: connection?.name ?? "",
        ...configData.defaultConfig,
      };

      Object.keys(updatedValues).forEach((key) => {
        form.setFieldValue(key as never, updatedValues[key] as never);
      });
    }
  }, [configData, connection?.name, form]);

  // Qonto-specific sandbox mode logic
  const prevSandboxModeRef = useRef<boolean | undefined>(undefined);
  useEffect(() => {
    if (providerId !== "qonto") return;

    const unsubscribe = form.store.subscribe(() => {
      const sandboxMode = form.state.values.sandboxMode as boolean | undefined;
      if (sandboxMode === prevSandboxModeRef.current) return;
      prevSandboxModeRef.current = sandboxMode;

      if (sandboxMode === true) {
        form.setFieldValue(
          "oauthBaseUrl" as never,
          "https://oauth-sandbox.staging.qonto.co" as never,
        );
        form.setFieldValue(
          "thirdPartyBaseUrl" as never,
          "https://thirdparty-sandbox.staging.qonto.co" as never,
        );
      } else if (sandboxMode === false) {
        form.setFieldValue(
          "oauthBaseUrl" as never,
          "https://oauth.qonto.com" as never,
        );
        form.setFieldValue(
          "thirdPartyBaseUrl" as never,
          "https://thirdparty.qonto.com" as never,
        );
      }
    });

    return unsubscribe;
  }, [providerId, form]);

  const handleCopyUrl = async () => {
    if (callbackUrl) {
      await navigator.clipboard.writeText(callbackUrl);
      setCopied(true);
      toast.success(t("urlCopied"));
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoadingSchema || !configData || initConnection.isPending) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
      </div>
    );
  }

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
              <li>
                {t("openBankApp", { providerName: providerInfo.displayName })}
              </li>
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
          {isReconfiguring
            ? t("reconfigureTitle", { providerName: providerInfo.displayName })
            : t("title", { providerName: providerInfo.displayName })}
        </h1>
        <p className="text-muted-foreground">
          {isReconfiguring ? t("reconfigureDescription") : t("description")}
        </p>
      </div>

      {/* Step 1: Callback URL (for new connections only) */}
      {!isReconfiguring && callbackUrl && (
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
            {(setupGuideUrl ?? configData.setupGuideUrl) && (
              <a
                href={setupGuideUrl ?? configData.setupGuideUrl ?? undefined}
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

      {/* Connection Name Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {!isReconfiguring && (
              <span className="bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-full text-sm">
                2
              </span>
            )}
            {t("connectionName")}
          </CardTitle>
          <CardDescription>{t("connectionNameDescription")}</CardDescription>
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

      {/* Provider Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {!isReconfiguring && (
              <span className="bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-full text-sm">
                3
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
            {configData.schema.fields.map((field) => (
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
                          (!value ||
                            (typeof value === "string" && value.trim() === ""))
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
                          (value === undefined ||
                            value === null ||
                            value === "")
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
                            onChange={(e) =>
                              formField.handleChange(e.target.checked)
                            }
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
                                e.target.value === ""
                                  ? ""
                                  : Number(e.target.value),
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
                            onChange={(e) =>
                              formField.handleChange(e.target.value)
                            }
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
                            onChange={(e) =>
                              formField.handleChange(e.target.value)
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
            ))}

            <div className="flex justify-end gap-4 pt-4">
              <Link href={`/${slug}/banks/connect`}>
                <Button
                  type="button"
                  variant="outline"
                  disabled={form.state.isSubmitting}
                >
                  {t("cancel")}
                </Button>
              </Link>
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
                      getAuthUrl.isPending
                    }
                  >
                    {isSubmitting ||
                    saveBankConfig.isPending ||
                    getAuthUrl.isPending
                      ? isReconfiguring
                        ? t("updating")
                        : t("connecting")
                      : isReconfiguring
                        ? t("update")
                        : t("connect")}
                  </Button>
                )}
              />
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
