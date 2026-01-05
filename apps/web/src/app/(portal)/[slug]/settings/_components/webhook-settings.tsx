"use client";

import { useState } from "react";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  PlusIcon,
  TrashIcon,
} from "@radix-ui/react-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { OrganizationWithDetails } from "@getblitz/api";
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

interface WebhookSettingsProps {
  webhooks: OrganizationWithDetails["webhooks"];
  slug: string;
  organizationId: string;
}

interface WebhookFormData {
  id?: string;
  webhookUrl: string;
  webhookSecret: string;
  notifyPaymentSuccess: boolean;
  notifyPaymentFailed: boolean;
  notifyPaymentExpired: boolean;
}

const emptyWebhook: Omit<WebhookFormData, "id"> = {
  webhookUrl: "",
  webhookSecret: "",
  notifyPaymentSuccess: true,
  notifyPaymentFailed: true,
  notifyPaymentExpired: false,
};

function generateSecret(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function WebhookCard({
  webhook,
  slug,
  organizationId,
  isNew,
  onCancel,
  onSaved,
}: {
  webhook: WebhookFormData;
  slug: string;
  organizationId: string;
  isNew?: boolean;
  onCancel?: () => void;
  onSaved?: () => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(isNew);
  const [form, setForm] = useState<WebhookFormData>(webhook);

  const createWebhook = useMutation(
    trpc.organization.createWebhook.mutationOptions({
      onSuccess: () => {
        toast.success("Webhook created");
        void queryClient.invalidateQueries({
          queryKey: trpc.organization.getBySlug.queryKey({ slug }),
        });
        onSaved?.();
      },
      onError: (error: unknown) =>
        toast.error(
          error instanceof Error ? error.message : "An unknown error occurred",
        ),
    }),
  );

  const updateWebhook = useMutation(
    trpc.organization.updateWebhook.mutationOptions({
      onSuccess: () => {
        toast.success("Webhook updated");
        void queryClient.invalidateQueries({
          queryKey: trpc.organization.getBySlug.queryKey({ slug }),
        });
        setExpanded(false);
      },
      onError: (error: unknown) =>
        toast.error(
          error instanceof Error ? error.message : "An unknown error occurred",
        ),
    }),
  );

  const deleteWebhook = useMutation(
    trpc.organization.deleteWebhook.mutationOptions({
      onSuccess: () => {
        toast.success("Webhook deleted");
        void queryClient.invalidateQueries({
          queryKey: trpc.organization.getBySlug.queryKey({ slug }),
        });
      },
      onError: (error: unknown) =>
        toast.error(
          error instanceof Error ? error.message : "An unknown error occurred",
        ),
    }),
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isNew) {
      createWebhook.mutate({
        organizationId,
        webhookUrl: form.webhookUrl,
        webhookSecret: form.webhookSecret,
        notifyPaymentSuccess: form.notifyPaymentSuccess,
        notifyPaymentFailed: form.notifyPaymentFailed,
        notifyPaymentExpired: form.notifyPaymentExpired,
      });
    } else if (form.id) {
      updateWebhook.mutate({
        webhookId: form.id,
        webhookUrl: form.webhookUrl,
        webhookSecret: form.webhookSecret,
        notifyPaymentSuccess: form.notifyPaymentSuccess,
        notifyPaymentFailed: form.notifyPaymentFailed,
        notifyPaymentExpired: form.notifyPaymentExpired,
      });
    }
  };

  const handleDelete = () => {
    if (!form.id) return;
    if (confirm("Are you sure you want to delete this webhook?")) {
      deleteWebhook.mutate({ webhookId: form.id });
    }
  };

  const isPending =
    createWebhook.isPending ||
    updateWebhook.isPending ||
    deleteWebhook.isPending;

  return (
    <div className="bg-card rounded-lg border">
      <button
        type="button"
        className="flex w-full items-center justify-between p-4 text-left"
        onClick={() => !isNew && setExpanded(!expanded)}
        disabled={isNew}
      >
        <div className="flex-1 truncate">
          <span className="font-mono text-sm">
            {form.webhookUrl || "New Webhook"}
          </span>
        </div>
        {!isNew && (
          <span className="text-muted-foreground">
            {expanded ? (
              <ChevronUpIcon className="h-5 w-5" />
            ) : (
              <ChevronDownIcon className="h-5 w-5" />
            )}
          </span>
        )}
      </button>

      {expanded && (
        <form onSubmit={handleSubmit} className="space-y-4 border-t p-4">
          <div className="space-y-2">
            <Label htmlFor={`url-${form.id ?? "new"}`}>Webhook URL</Label>
            <Input
              id={`url-${form.id ?? "new"}`}
              placeholder="https://your-api.com/webhooks/getblitz"
              value={form.webhookUrl}
              onChange={(e) => setForm({ ...form, webhookUrl: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`secret-${form.id ?? "new"}`}>Signing Secret</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id={`secret-${form.id ?? "new"}`}
                value={form.webhookSecret}
                onChange={(e) =>
                  setForm({ ...form, webhookSecret: e.target.value })
                }
                required
                className="font-mono text-xs sm:text-sm"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setForm({ ...form, webhookSecret: generateSecret() })
                }
                className="shrink-0"
              >
                Generate
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              Used to sign the payload using HMAC-SHA256. Sent in the
              X-getblitz-Signature header.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <Label>Event Subscriptions</Label>
            <div className="grid gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.notifyPaymentSuccess}
                  onChange={(e) =>
                    setForm({ ...form, notifyPaymentSuccess: e.target.checked })
                  }
                  className="text-primary h-4 w-4 rounded border-gray-300"
                />
                Payment Succeeded
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.notifyPaymentFailed}
                  onChange={(e) =>
                    setForm({ ...form, notifyPaymentFailed: e.target.checked })
                  }
                  className="text-primary h-4 w-4 rounded border-gray-300"
                />
                Payment Failed
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.notifyPaymentExpired}
                  onChange={(e) =>
                    setForm({ ...form, notifyPaymentExpired: e.target.checked })
                  }
                  className="text-primary h-4 w-4 rounded border-gray-300"
                />
                Payment Expired
              </label>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            {!isNew && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isPending}
              >
                <TrashIcon className="mr-1 h-4 w-4" />
                Delete
              </Button>
            )}
            <div className="ml-auto flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  if (isNew) {
                    onCancel?.();
                  } else {
                    setForm(webhook);
                    setExpanded(false);
                  }
                }}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : isNew ? "Create Webhook" : "Save"}
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

export function WebhookSettings({
  webhooks,
  slug,
  organizationId,
}: WebhookSettingsProps) {
  const [showNew, setShowNew] = useState(false);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Webhooks</CardTitle>
            <CardDescription>
              Receive payment notifications for this organization.
            </CardDescription>
          </div>
          {!showNew && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowNew(true)}
              className="w-full shrink-0 sm:w-auto"
            >
              <PlusIcon className="mr-1 h-4 w-4" />
              Add Webhook
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showNew && (
          <WebhookCard
            webhook={emptyWebhook}
            slug={slug}
            organizationId={organizationId}
            isNew
            onCancel={() => setShowNew(false)}
            onSaved={() => setShowNew(false)}
          />
        )}

        {webhooks.length === 0 && !showNew ? (
          <p className="text-muted-foreground py-8 text-center">
            No webhooks configured. Add one to receive payment notifications.
          </p>
        ) : (
          webhooks.map((webhook) => (
            <WebhookCard
              key={webhook.id}
              webhook={{
                id: webhook.id,
                webhookUrl: webhook.webhookUrl,
                webhookSecret: webhook.webhookSecret,
                notifyPaymentSuccess: webhook.notifyPaymentSuccess,
                notifyPaymentFailed: webhook.notifyPaymentFailed,
                notifyPaymentExpired: webhook.notifyPaymentExpired,
              }}
              slug={slug}
              organizationId={organizationId}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}
