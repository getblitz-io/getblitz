"use client";

import { useTranslations } from "next-intl";

import { Button } from "@getblitz/ui/button";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  const tCommon = useTranslations("Common");

  return (
    <div className="flex flex-col items-center justify-center py-8 text-center text-red-500">
      <p className="mb-4">{message ?? tCommon("errors.generic")}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          {tCommon("buttons.retry")}
        </Button>
      )}
    </div>
  );
}
