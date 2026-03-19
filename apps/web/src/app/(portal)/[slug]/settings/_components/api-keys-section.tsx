"use client";

import { useState } from "react";
import { CopyIcon, TrashIcon } from "@radix-ui/react-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@getblitz/ui";
import { Button } from "@getblitz/ui/button";
import { Input } from "@getblitz/ui/input";
import { Label } from "@getblitz/ui/label";
import { toast } from "@getblitz/ui/toast";

import { useTRPC } from "~/trpc/react";

export function ApiKeysSection({ slug }: { slug: string }) {
  const queryClient = useQueryClient();
  const t = useTranslations("ApiKeysList");
  const tCommon = useTranslations("Common");
  const tPage = useTranslations("SettingsPage");
  const tToast = useTranslations("Toast");
  const trpc = useTRPC();

  const [newKey, setNewKey] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [keyName, setKeyName] = useState("");

  const { data: keys = [], isLoading } = useQuery(
    trpc.organization.getApiKeys.queryOptions({ slug }),
  );

  const deleteKey = useMutation(
    trpc.organization.deleteApiKey.mutationOptions({
      onSuccess: async () => {
        toast.success(tToast("apiKeyDeleted"));
        await queryClient.invalidateQueries(
          trpc.organization.getApiKeys.queryFilter({ slug }),
        );
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const generateKeyMutation = useMutation(
    trpc.organization.generateApiKey.mutationOptions({
      onSuccess: async (data) => {
        if (data.key) {
          setNewKey(data.key);
          setIsCreateModalOpen(false);
          setIsResultModalOpen(true);
        }
        await queryClient.invalidateQueries(
          trpc.organization.getApiKeys.queryFilter({ slug }),
        );
      },
      onError: (error) => {
        toast.error(error.message || t("apiKeyCreateFailed"));
      },
      onSettled: () => {
        setIsGenerating(false);
      },
    }),
  );

  const handleOpenCreateModal = () => {
    setKeyName("");
    setIsCreateModalOpen(true);
  };

  const handleGenerateKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) return;
    setIsGenerating(true);
    generateKeyMutation.mutate({ slug, name: keyName });
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(tToast("copiedToClipboard"));
  };

  const handleCloseResultModal = () => {
    setIsResultModalOpen(false);
    setTimeout(() => setNewKey(null), 300);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>{tPage("apiKeys")}</CardTitle>
              <CardDescription>{tPage("apiKeysDescription")}</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full shrink-0 sm:w-auto"
              onClick={handleOpenCreateModal}
            >
              {tPage("generateNewKey")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-muted-foreground py-8 text-center">
              {t("loading")}
            </div>
          ) : keys.length === 0 ? (
            <div className="rounded-md border border-dashed py-8 text-center">
              <p className="text-muted-foreground">{t("noKeys")}</p>
            </div>
          ) : (
            <div className="divide-y rounded-md border">
              {keys.map((key) => {
                const displayKey = `${key.start ?? "..."}${"•".repeat(16)}`;

                return (
                  <div key={key.id} className="space-y-3 p-4">
                    <div className="min-w-0">
                      <div className="mb-1 text-sm font-medium">
                        {key.name ?? t("defaultName")}
                      </div>
                      <code className="block font-mono text-xs break-all sm:text-sm">
                        {displayKey}
                      </code>
                      <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        <span>
                          {t("created", {
                            date: new Date(key.createdAt).toLocaleDateString(),
                          })}
                        </span>
                        {key.lastRequest && (
                          <span>
                            {t("lastUsed", {
                              date: new Date(
                                key.lastRequest,
                              ).toLocaleDateString(),
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          deleteKey.mutate({ keyId: key.id, slug })
                        }
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
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tPage("generateNewKey")}</DialogTitle>
            <DialogDescription>{t("createDescription")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleGenerateKey}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">{tCommon("labels.name")}</Label>
                <Input
                  id="name"
                  placeholder={t("namePlaceholder")}
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
              >
                {tCommon("buttons.cancel")}
              </Button>
              <Button type="submit" disabled={isGenerating || !keyName.trim()}>
                {isGenerating
                  ? tCommon("buttons.generating")
                  : tCommon("buttons.generate")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isResultModalOpen} onOpenChange={handleCloseResultModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tPage("generateNewKey")}</DialogTitle>
            <DialogDescription>{t("copyWarning")}</DialogDescription>
          </DialogHeader>
          {newKey && (
            <div className="bg-muted mt-2 rounded-md p-4">
              <div className="flex items-center space-x-2">
                <code className="flex-1 font-mono text-sm break-all">
                  {newKey}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(newKey)}
                >
                  <CopyIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={handleCloseResultModal}>
              {tCommon("buttons.done")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
