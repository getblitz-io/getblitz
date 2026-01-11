"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Pencil1Icon } from "@radix-ui/react-icons";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@getblitz/ui";
import { Button } from "@getblitz/ui/button";
import { toast } from "@getblitz/ui/toast";

import { useTRPC } from "~/trpc/react";

function maskSecret(secret: string | null): string {
  if (!secret) return "—";
  if (secret.length <= 8) return "••••••••";
  return secret.slice(0, 4) + "••••••••" + secret.slice(-4);
}

// Inline name editor component using react-form
function InlineNameEditor({
  isSubmitting,
  currentName,
  onCancel,
  onFormSubmit,
  inputRef,
}: {
  isSubmitting: boolean;
  currentName: string | null;
  onCancel: () => void;
  onFormSubmit: (value: { name: string }) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const t = useTranslations("BankConnectPage");
  const form = useForm({
    defaultValues: {
      name: currentName ?? "",
    },
    onSubmit: ({ value }) => {
      const trimmedName = value.name.trim();
      onFormSubmit({
        name: trimmedName,
      });
    },
  });

  // Focus input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [inputRef]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
      className="flex items-center gap-2"
    >
      <form.Field
        name="name"
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
          <>
            <input
              ref={inputRef}
              type="text"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void form.handleSubmit();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  onCancel();
                }
              }}
              maxLength={255}
              disabled={isSubmitting}
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />
            {field.state.meta.errors.length > 0 && (
              <span className="text-xs text-red-500">
                {field.state.meta.errors.join(", ")}
              </span>
            )}
          </>
        )}
      </form.Field>
      <form.Subscribe
        selector={(state) => [state.isSubmitting, state.canSubmit]}
      >
        {([isSubmitting, canSubmit]) => (
          <>
            <Button
              type="submit"
              size="sm"
              variant="outline"
              disabled={!canSubmit || isSubmitting}
            >
              Save
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </>
        )}
      </form.Subscribe>
    </form>
  );
}

export default function ConnectBankPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [expandedWebhook, setExpandedWebhook] = useState<string | null>(null);
  const [providerDialogOpen, setProviderDialogOpen] = useState(false);
  const [editingConnectionId, setEditingConnectionId] = useState<string | null>(
    null,
  );
  const nameInputRef = useRef<HTMLInputElement>(null);
  const t = useTranslations("BankConnectPage");
  const tCommon = useTranslations("Common");
  const tToast = useTranslations("Toast");

  // Get all bank connections for this organization
  const { data: connections, isLoading } = useQuery({
    ...trpc.organization.getBankConnections.queryOptions({
      slug,
    }),
    enabled: !!slug,
  });

  // Get all available providers for the selection modal
  const { data: allProviders } = useQuery({
    ...trpc.provider.list.queryOptions(),
    enabled: !isLoading && !!slug,
  });

  const disconnectBank = useMutation(
    trpc.organization.disconnectBank.mutationOptions({
      onSuccess: () => {
        toast.success(tToast("bankDisconnected"));
        void queryClient.invalidateQueries({
          queryKey: trpc.organization.getBankConnections.queryKey({
            slug,
          }),
        });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const setupWebhook = useMutation(
    trpc.organization.setupBankConnectionWebhook.mutationOptions({
      onSuccess: () => {
        toast.success(tToast("webhookConfigured"));
        void queryClient.invalidateQueries({
          queryKey: trpc.organization.getBankConnections.queryKey({
            slug,
          }),
        });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const updateConnectionName = useMutation(
    trpc.organization.updateConnectionName.mutationOptions({
      onSuccess: () => {
        toast.success(tToast("connectionNameUpdated"));
        setEditingConnectionId(null);
        void queryClient.invalidateQueries({
          queryKey: trpc.organization.getBankConnections.queryKey({
            slug,
          }),
        });
      },
      onError: (error: { message: string }) => {
        toast.error(error.message);
      },
    }),
  );

  const deletePendingConnection = useMutation(
    trpc.organization.deletePendingConnection.mutationOptions({
      onSuccess: () => {
        toast.success(tToast("pendingConnectionDeleted"));
        void queryClient.invalidateQueries({
          queryKey: trpc.organization.getBankConnections.queryKey({
            slug,
          }),
        });
      },
      onError: (error: { message: string }) => {
        toast.error(error.message);
      },
    }),
  );

  const handleDisconnect = (connectionId: string) => {
    if (!connectionId || !slug) return;
    if (!confirm(t("disconnectConfirm"))) return;

    disconnectBank.mutate({
      slug,
      connectionId,
    });
  };

  const handleSetupWebhook = (connectionId: string) => {
    if (!connectionId) return;
    setupWebhook.mutate({
      slug,
      connectionId,
    });
  };

  const handleSelectProvider = (providerId: string) => {
    setProviderDialogOpen(false);
    router.push(`/${slug}/banks/connect/${providerId}`);
  };

  const handleStartEditName = (connectionId: string) => {
    setEditingConnectionId(connectionId);
    // Focus input after state update
    setTimeout(() => {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }, 0);
  };

  const handleCancelEditName = () => {
    setEditingConnectionId(null);
  };

  const handleDeletePending = (connectionId: string) => {
    if (!connectionId || !slug) return;
    if (!confirm(t("deletePendingConfirm"))) return;

    deletePendingConnection.mutate({
      slug,
      connectionId,
    });
  };

  // Helper to check if connection is in a pending state
  const isPendingConnection = (status: string) => {
    return (
      status === "PENDING_CONFIG" ||
      status === "PENDING_OAUTH" ||
      status === "EXPIRED"
    );
  };

  // Helper to get status badge
  const getStatusBadge = (connection: {
    status: string;
    hasCredentials: boolean;
    webhookUrl: string | null;
  }) => {
    switch (connection.status) {
      case "PENDING_CONFIG":
        return (
          <span className="inline-block rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
            {t("statusPendingConfig")}
          </span>
        );
      case "PENDING_OAUTH":
        return (
          <span className="inline-block rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            {t("statusPendingOAuth")}
          </span>
        );
      case "EXPIRED":
        return (
          <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
            {t("statusExpired")}
          </span>
        );
      case "DISCONNECTED":
        return (
          <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-400">
            {t("statusDisconnected")}
          </span>
        );
      case "CONNECTED":
      default:
        return (
          <>
            <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
              {tCommon("status.connected")}
            </span>
            {connection.webhookUrl ? (
              <span className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                {t("webhookActive")}
              </span>
            ) : (
              <span className="inline-block rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                {t("noWebhook")}
              </span>
            )}
          </>
        );
    }
  };

  if (isLoading || !slug) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href={`/${slug}/banks`}
        className="text-muted-foreground hover:text-foreground block text-sm"
      >
        {t("backToBanks")}
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {t("title")}
          </h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <Dialog open={providerDialogOpen} onOpenChange={setProviderDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full shrink-0 sm:w-auto">
              {t("configureNew")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("selectProvider")}</DialogTitle>
              <DialogDescription>
                {t("selectProviderDescription")}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {!allProviders || allProviders.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  {t("noProviders")}
                </p>
              ) : (
                <div className="grid gap-2">
                  {allProviders.map((provider) => (
                    <button
                      key={provider.id}
                      onClick={() => handleSelectProvider(provider.id)}
                      className="hover:bg-accent flex items-center gap-4 rounded-lg border p-4 text-left transition-colors"
                    >
                      {provider.domain && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`https://www.google.com/s2/favicons?domain=${provider.domain}&sz=64`}
                          alt={provider.displayName}
                          className="h-10 w-10 shrink-0 rounded object-contain"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="font-medium">{provider.displayName}</h3>
                        <p className="text-muted-foreground text-sm">
                          {provider.authType === "oauth2"
                            ? t("oauth2Connection")
                            : t("manualConnection")}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("configuredConnections")}</CardTitle>
        </CardHeader>
        <CardContent>
          {!connections || connections.length === 0 ? (
            <p className="text-muted-foreground">{t("noConnections")}</p>
          ) : (
            <div className="space-y-4">
              {connections.map((connection) => {
                const displayName = connection.name ?? connection.providerName;
                const hasCredentials = connection.hasCredentials;
                const isPending = isPendingConnection(connection.status);

                return (
                  <div key={connection.id} className="rounded-lg border">
                    <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-4">
                        {connection.providerDomain && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`https://www.google.com/s2/favicons?domain=${connection.providerDomain}&sz=64`}
                            alt={connection.providerName}
                            className="h-12 w-12 shrink-0 rounded object-contain"
                          />
                        )}
                        <div>
                          {editingConnectionId === connection.id ? (
                            <InlineNameEditor
                              isSubmitting={updateConnectionName.isPending}
                              currentName={connection.name}
                              onCancel={handleCancelEditName}
                              onFormSubmit={(value) =>
                                updateConnectionName.mutate({
                                  slug,
                                  connectionId: connection.id,
                                  name: value.name,
                                })
                              }
                              inputRef={nameInputRef}
                            />
                          ) : (
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{displayName}</h3>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() =>
                                  handleStartEditName(connection.id)
                                }
                                className="h-6 w-6"
                                title={t("editName")}
                              >
                                <Pencil1Icon className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                          <p className="text-muted-foreground text-sm">
                            {connection.providerName}
                            {connection.name &&
                              editingConnectionId !== connection.id &&
                              ` • ${connection.name}`}
                          </p>
                          <p className="text-muted-foreground text-sm">
                            {connection.providerAuthType === "oauth2"
                              ? t("oauth2Connection")
                              : t("manualConnection")}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            {getStatusBadge(connection)}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        {isPending ? (
                          <>
                            {/* Resume button for pending connections */}
                            <Link
                              href={`/${slug}/banks/connect/${connection.providerId}?connectionId=${connection.id}`}
                            >
                              <Button
                                variant="outline"
                                className="w-full sm:w-auto"
                              >
                                {t("resume")}
                              </Button>
                            </Link>
                            {/* Delete button for pending connections */}
                            <Button
                              variant="destructive"
                              onClick={() => handleDeletePending(connection.id)}
                              disabled={deletePendingConnection.isPending}
                              className="w-full sm:w-auto"
                            >
                              {deletePendingConnection.isPending
                                ? tCommon("buttons.deleting")
                                : tCommon("buttons.delete")}
                            </Button>
                          </>
                        ) : hasCredentials ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setExpandedWebhook(
                                  expandedWebhook === connection.id
                                    ? null
                                    : connection.id,
                                )
                              }
                              className="w-full sm:w-auto"
                            >
                              {expandedWebhook === connection.id
                                ? t("hideWebhook")
                                : t("webhookInfo")}
                            </Button>
                            <Link
                              href={`/${slug}/banks/accounts/${connection.id}`}
                            >
                              <Button
                                variant="outline"
                                className="w-full sm:w-auto"
                              >
                                {t("viewAccounts")}
                              </Button>
                            </Link>
                            <Link
                              href={`/${slug}/banks/connect/${connection.providerId}?connectionId=${connection.id}`}
                            >
                              <Button
                                variant="outline"
                                className="w-full sm:w-auto"
                              >
                                {t("reconfigure")}
                              </Button>
                            </Link>
                            <Button
                              variant="destructive"
                              onClick={() => handleDisconnect(connection.id)}
                              disabled={disconnectBank.isPending}
                              className="w-full sm:w-auto"
                            >
                              {disconnectBank.isPending
                                ? t("disconnecting")
                                : t("disconnect")}
                            </Button>
                          </>
                        ) : (
                          <Link
                            href={`/${slug}/banks/connect/${connection.providerId}?connectionId=${connection.id}`}
                          >
                            <Button className="w-full sm:w-auto">
                              {tCommon("buttons.configure")}
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>

                    {/* Webhook Info Panel */}
                    {hasCredentials && expandedWebhook === connection.id && (
                      <div className="bg-muted/30 border-t px-4 py-3">
                        <div className="space-y-3">
                          {connection.webhookUrl ? (
                            <>
                              <div>
                                <label className="text-muted-foreground text-xs font-medium">
                                  Webhook URL
                                </label>
                                <p className="mt-0.5 font-mono text-sm break-all">
                                  {connection.webhookUrl}
                                </p>
                              </div>
                              <div>
                                <label className="text-muted-foreground text-xs font-medium">
                                  Webhook Secret
                                </label>
                                <p className="mt-0.5 font-mono text-sm">
                                  {maskSecret(connection.webhookSecret)}
                                </p>
                              </div>
                            </>
                          ) : (
                            <p className="text-muted-foreground text-sm">
                              No webhook configured. Set up a webhook to receive
                              real-time payment notifications.
                            </p>
                          )}
                          <div className="flex gap-2 pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSetupWebhook(connection.id)}
                              disabled={setupWebhook.isPending}
                            >
                              {setupWebhook.isPending
                                ? t("configuring")
                                : connection.webhookUrl
                                  ? t("reconnectWebhook")
                                  : t("setupWebhook")}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
