"use client";

import { useState } from "react";
import {
  CopyIcon,
  EyeClosedIcon,
  EyeOpenIcon,
  TrashIcon,
} from "@radix-ui/react-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import type { OrganizationSecretKey } from "@getblitz/database";
import { Card, CardContent } from "@getblitz/ui";
import { Button } from "@getblitz/ui/button";
import { toast } from "@getblitz/ui/toast";

import { useTRPC } from "~/trpc/react";

interface ApiKeysListProps {
  keys: OrganizationSecretKey[];
  slug: string;
}

export function ApiKeysList({ keys, slug }: ApiKeysListProps) {
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const t = useTranslations("ApiKeysList");
  const tToast = useTranslations("Toast");

  const deleteKey = useMutation(
    trpc.organization.deleteApiKey.mutationOptions({
      onSuccess: async () => {
        toast.success(tToast("apiKeyDeleted"));
        await queryClient.invalidateQueries({
          queryKey: trpc.organization.getBySlug.queryKey({ slug }),
        });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(tToast("copiedToClipboard"));
  };

  const toggleReveal = (keyId: string) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(keyId)) {
        next.delete(keyId);
      } else {
        next.add(keyId);
      }
      return next;
    });
  };

  if (keys.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">{t("noKeys")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <div className="divide-y">
        {keys.map((key) => {
          const isRevealed = revealedKeys.has(key.id);
          const displayKey = isRevealed
            ? key.secretKey
            : `${key.secretKey.slice(0, 8)}${"•".repeat(16)}${key.secretKey.slice(-4)}`;

          return (
            <div key={key.id} className="space-y-3 p-4">
              <div className="min-w-0">
                <code className="block font-mono text-xs break-all sm:text-sm">
                  {displayKey}
                </code>
                <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <span>
                    {t("created", { date: key.createdAt.toLocaleDateString() })}
                  </span>
                  {key.lastUsedAt && (
                    <span>
                      {t("lastUsed", {
                        date: key.lastUsedAt.toLocaleDateString(),
                      })}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleReveal(key.id)}
                >
                  {isRevealed ? (
                    <EyeClosedIcon className="h-4 w-4" />
                  ) : (
                    <EyeOpenIcon className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(key.secretKey)}
                >
                  <CopyIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteKey.mutate({ keyId: key.id })}
                  disabled={deleteKey.isPending}
                  className="text-destructive hover:text-destructive"
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
