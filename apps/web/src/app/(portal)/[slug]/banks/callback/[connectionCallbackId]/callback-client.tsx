"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { Card, CardContent, CardHeader, CardTitle } from "@getblitz/ui";
import { Button } from "@getblitz/ui/button";
import { toast } from "@getblitz/ui/toast";

import { useTRPC } from "~/trpc/react";

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center">
      <svg
        className="text-primary h-8 w-8 animate-spin"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
}

interface CallbackClientProps {
  slug: string;
  connectionCallbackId: string; // This comes from URL params, but is actually the connectionId
  code?: string;
  error?: string;
}

export function CallbackClient({
  slug,
  connectionCallbackId: callbackId,
  code,
  error: authError,
}: CallbackClientProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const t = useTranslations("BankCallbackPage");
  const [isRetrying, setIsRetrying] = useState(false);
  const hasCalledRef = useRef(false);

  // Complete OAuth mutation
  const completeOAuth = useMutation(
    trpc.organization.completeBankOAuth.mutationOptions({
      onSuccess: (data) => {
        toast.success(t("success"));
        router.push(`/${slug}/banks/accounts/${data.connectionId}`);
      },
      onError: (error) => {
        toast.error(error.message);
        setIsRetrying(false);
      },
    }),
  );

  useEffect(() => {
    if (code && callbackId && !hasCalledRef.current) {
      hasCalledRef.current = true;
      completeOAuth.mutate({
        slug,
        callbackId,
        code,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, callbackId, slug]);

  // Handle OAuth error from bank
  if (authError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t("authFailed.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              {t("authFailed.description")}
            </p>
            <p className="text-muted-foreground text-sm">
              {t("authFailed.error", { error: authError })}
            </p>
            <Button
              onClick={() => router.push(`/${slug}/banks/connect`)}
              className="w-full"
            >
              {t("buttons.tryAgain")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Missing required parameters
  if (!code || !callbackId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t("invalidRequest.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              {t("invalidRequest.description")}
            </p>
            <Button
              onClick={() => router.push(`/${slug}/banks/connect`)}
              className="w-full"
            >
              {t("buttons.goBack")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle error state
  if (completeOAuth.isError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t("connectionError.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              {t("connectionError.description")}
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setIsRetrying(true);
                  completeOAuth.mutate({
                    slug,
                    callbackId,
                    code,
                  });
                }}
                disabled={isRetrying}
                className="flex-1"
              >
                {isRetrying
                  ? t("connectionError.retrying")
                  : t("buttons.tryAgain")}
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/${slug}/banks/connect`)}
                className="flex-1"
              >
                {t("buttons.goBack")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center justify-center space-y-4 py-4">
            <LoadingSpinner />
            <p className="text-muted-foreground text-center">
              {t("description")}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
