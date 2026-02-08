"use client";

import { EyeOpenIcon } from "@radix-ui/react-icons";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { Button } from "@getblitz/ui/button";
import { toast } from "@getblitz/ui/toast";

import { useTRPC } from "~/trpc/react";

interface PreviewButtonProps {
  slug: string;
  invoiceId: string;
  classNames?: {
    button?: string;
  };
  size?: "icon" | "sm" | "md" | "lg";
}

export function PreviewButton({
  slug,
  invoiceId,
  size = "icon",
  classNames,
}: PreviewButtonProps) {
  const trpc = useTRPC();
  const t = useTranslations("InvoicesPage");
  const tCommon = useTranslations("Common");

  const createPreviewToken = useMutation(
    trpc.preview.createToken.mutationOptions({
      onSuccess: ({ token }) => {
        const url = `/invoice/${invoiceId}?previewToken=${token}`;
        window.open(url, "_blank");
      },
      onError: (error: { message: string }) => {
        toast.error(error.message);
      },
    }),
  );

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    createPreviewToken.mutate({
      slug,
      resourceType: "invoice",
      resourceId: invoiceId,
    });
  };

  if (size === "icon") {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleClick}
        disabled={createPreviewToken.isPending}
        title={t("previewButton")}
      >
        {createPreviewToken.isPending ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <EyeOpenIcon className="h-4 w-4" />
        )}
      </Button>
    );
  }

  return (
    <Button
      variant="secondary"
      size={size === "md" ? "default" : size}
      onClick={handleClick}
      disabled={createPreviewToken.isPending}
      className={classNames?.button}
    >
      {createPreviewToken.isPending
        ? tCommon("buttons.loading")
        : t("previewButton")}
    </Button>
  );
}
