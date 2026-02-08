"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "@radix-ui/react-icons";
import { useTranslations } from "next-intl";

import { cn } from "@getblitz/ui";
import { Button } from "@getblitz/ui/button";

interface CopyableFieldProps {
  label: string;
  value: string;
  className?: string;
  valueClassName?: string;
}

export function CopyableField({
  label,
  value,
  className,
  valueClassName,
}: CopyableFieldProps) {
  const [copied, setCopied] = useState(false);
  const t = useTranslations("Common");

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <div className={cn("flex items-center justify-between py-1", className)}>
      <span className="text-muted-foreground mr-2 shrink-0">{label}</span>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2 text-right">
        <span
          className={cn("truncate font-mono", valueClassName)}
          title={value}
        >
          {value}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground h-6 w-6 shrink-0"
          onClick={onCopy}
          title={t("copy")}
        >
          {copied ? (
            <CheckIcon className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <CopyIcon className="h-3.5 w-3.5" />
          )}
          <span className="sr-only">{t("copy")}</span>
        </Button>
      </div>
    </div>
  );
}
