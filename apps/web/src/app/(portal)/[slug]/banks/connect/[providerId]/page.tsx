"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ExternalLinkIcon } from "@radix-ui/react-icons";
import { useForm } from "@tanstack/react-form";
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

  // Get the provider config schema (with existing config if connectionId provided)
  const { data: configData, isLoading: isLoadingSchema } = useQuery({
    ...trpc.organization.getProviderConfigSchema.queryOptions({
      providerId,
      connectionId: connectionId ?? undefined,
      slug,
    }),
    enabled: !!slug && !!providerId,
  });

  // Get connections to find provider info
  const { data: connections } = useQuery({
    ...trpc.organization.getBankConnections.queryOptions({ slug }),
    enabled: !!slug,
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
    // Fallback when connection is not yet loaded
    return { name: providerId, displayName: providerId };
  }, [connection, providerId]);

  const isReconfiguring = !!connectionId;

  // Build default values from schema fields
  const buildDefaultValues = useMemo(() => {
    if (!configData) return { connectionName: "" };

    const defaults: Record<string, unknown> = {
      connectionName: connection?.name ?? "",
    };

    // Initialize all fields from schema with their default values
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

    // Override with existing config if available
    Object.assign(defaults, configData.defaultConfig);

    return defaults;
  }, [configData, connection?.name]);

  // Create form with dynamic default values
  const form = useForm({
    defaultValues: buildDefaultValues,
    onSubmit: ({ value }) => {
      // Extract connectionName and providerConfig
      const { connectionName: name, ...providerConfig } = value;

      configureProvider.mutate({
        slug,
        providerId,
        providerConfig,
        connectionId: connectionId ?? undefined,
        name: typeof name === "string" ? name.trim() || undefined : undefined,
      });
    },
  });

  type FormType = typeof form;

  // Helper component for conditionally rendering fields based on dependencies
  function ConditionalField({
    form,
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
      <form.Subscribe selector={(state) => state.values[dependsOn.field]}>
        {(dependentValue: unknown) => {
          if (dependentValue === dependsOn.value) {
            return <>{children}</>;
          }
          return null;
        }}
      </form.Subscribe>
    );
  }

  // Update form when configData loads
  useEffect(() => {
    if (configData?.defaultConfig) {
      const updatedValues: Record<string, unknown> = {
        connectionName: connection?.name ?? "",
        ...configData.defaultConfig,
      };

      // Set all field values
      Object.keys(updatedValues).forEach((key) => {
        form.setFieldValue(key as never, updatedValues[key] as never);
      });
    }
  }, [configData, connection?.name, form]);

  // Configure provider mutation
  const configureProvider = useMutation(
    trpc.organization.configureProvider.mutationOptions({
      onSuccess: (data) => {
        toast.success(
          data.updated ? t("configurationUpdated") : t("providerConfigured"),
        );
        // Redirect to OAuth flow
        startOAuth({ connectionId: data.connectionId });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  // Get auth URL mutation
  const getAuthUrl = useMutation(
    trpc.organization.getBankAuthUrl.mutationOptions({
      onSuccess: (data) => {
        console.log("getAuthUrl", data);
        router.push(data.url);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const startOAuth = ({ connectionId }: { connectionId: string }) => {
    const redirectUri = `${window.location.origin}/banks/callback/${providerId}`;
    getAuthUrl.mutate({
      connectionId,
      redirectUri,
      slug,
    });
  };

  // Track previous sandboxMode value to prevent infinite loop
  const prevSandboxModeRef = useRef<boolean | undefined>(undefined);

  // Watch sandboxMode and update dependent fields (using effect to avoid subscription issues)
  useEffect(() => {
    if (providerId !== "qonto") return;

    const unsubscribe = form.store.subscribe(() => {
      const sandboxMode = form.state.values.sandboxMode as boolean | undefined;

      // Only update if sandboxMode actually changed
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

  if (isLoadingSchema || !configData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
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
        {configData.setupGuideUrl && (
          <a
            href={configData.setupGuideUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary/80 mt-2 inline-flex items-center gap-1 text-sm font-medium"
          >
            {t("viewSetupGuide")}
            <ExternalLinkIcon className="h-3.5 w-3.5" />
          </a>
        )}
      </div>

      {/* Connection Name Section */}
      <Card>
        <CardHeader>
          <CardTitle>{t("connectionName")}</CardTitle>
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
                  className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
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
                  className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
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

      <Card>
        <CardHeader>
          <CardTitle>{t("providerConfiguration")}</CardTitle>
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
                        className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
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
                            className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
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
                            className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border px-3 py-2 font-mono text-xs file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
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
                            className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
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
                  <Button type="submit" disabled={!canSubmit || isSubmitting}>
                    {isSubmitting
                      ? isReconfiguring
                        ? t("updating")
                        : t("configuring")
                      : isReconfiguring
                        ? t("update")
                        : t("configure")}
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
