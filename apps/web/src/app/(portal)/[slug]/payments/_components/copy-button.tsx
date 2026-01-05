"use client";

import { CopyIcon } from "@radix-ui/react-icons";

import { Button } from "@getblitz/ui/button";
import { toast } from "@getblitz/ui/toast";

interface CopyButtonProps {
  value: string;
  className?: string;
}

export function CopyButton({ value, className }: CopyButtonProps) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className={`h-6 w-6 p-0 ${className ?? ""}`}
      aria-label="Copy to clipboard"
    >
      <CopyIcon className="h-3.5 w-3.5" />
    </Button>
  );
}
