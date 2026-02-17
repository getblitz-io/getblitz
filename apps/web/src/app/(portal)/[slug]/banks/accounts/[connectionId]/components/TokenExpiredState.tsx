"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ExclamationTriangleIcon,
  ExternalLinkIcon,
} from "@radix-ui/react-icons";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@getblitz/ui";
import { Button } from "@getblitz/ui/button";
import { toast } from "@getblitz/ui/toast";

import { useTRPC } from "~/trpc/react";

interface TokenExpiredStateProps {
  slug: string;
  connectionId: string;
  providerName: string;
}

export function TokenExpiredState({
  slug,
  connectionId,
  providerName,
}: TokenExpiredStateProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const tReauth = useTranslations("TokenRevalidation");
  const tCommon = useTranslations("Common");

  const [reauthDialogOpen, setReauthDialogOpen] = useState(false);
  const [reauthData, setReauthData] = useState<{
    callbackUrl: string;
    setupGuideUrl: string | null;
    providerName: string;
  } | null>(null);

  const revalidateConnection = useMutation(
    trpc.organization.revalidateBankConnection.mutationOptions({
      onSuccess: (data) => {
        if (data.flowType === "redirect") {
          toast.success(tReauth("reauthorizing"));
          router.push(data.authUrl);
        } else {
          setReauthData({
            callbackUrl: data.callbackUrl,
            setupGuideUrl: data.setupGuideUrl,
            providerName: data.providerName,
          });
          setReauthDialogOpen(true);
        }
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="mb-4 rounded-full bg-yellow-500/10 p-3">
        <ExclamationTriangleIcon className="h-8 w-8 text-yellow-600" />
      </div>
      <h3 className="text-lg font-medium">
        {tReauth("title", {
          providerName,
        })}
      </h3>
      <p className="text-muted-foreground mt-2 mb-6 max-w-md">
        {tReauth("description", {
          providerName,
        })}
      </p>
      <Button
        onClick={() => revalidateConnection.mutate({ slug, connectionId })}
        disabled={revalidateConnection.isPending}
      >
        {revalidateConnection.isPending
          ? tCommon("buttons.loading")
          : tReauth("reauthorize")}
      </Button>

      <Dialog open={reauthDialogOpen} onOpenChange={setReauthDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tReauth("manualConsent.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 text-left">
            <p className="text-muted-foreground">
              {tReauth("manualConsent.description")}
            </p>

            <ol className="list-inside list-decimal space-y-4 text-sm">
              <li>
                {tReauth("manualConsent.openBankApp", {
                  providerName: reauthData?.providerName ?? "",
                })}
              </li>
              <li>{tReauth("manualConsent.navigateToApiSettings")}</li>
              <li>{tReauth("manualConsent.clickEnableAccess")}</li>
              <li>{tReauth("manualConsent.youWillBeRedirected")}</li>
            </ol>

            <div className="bg-muted rounded-lg p-4">
              <p className="text-muted-foreground mb-2 text-sm">
                {tReauth("manualConsent.yourCallbackUrl")}
              </p>
              <code className="text-foreground block text-sm break-all">
                {reauthData?.callbackUrl}
              </code>
            </div>

            {reauthData?.setupGuideUrl && (
              <a
                href={reauthData.setupGuideUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80 inline-flex items-center gap-1 text-sm font-medium"
              >
                {tReauth("manualConsent.viewSetupGuide")}
                <ExternalLinkIcon className="h-3.5 w-3.5" />
              </a>
            )}

            <Button
              className="w-full"
              onClick={() => setReauthDialogOpen(false)}
            >
              {tCommon("buttons.close")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
