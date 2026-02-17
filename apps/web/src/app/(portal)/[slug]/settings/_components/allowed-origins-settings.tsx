"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { PlusIcon, XIcon } from "@getblitz/icon";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@getblitz/ui";
import { Button } from "@getblitz/ui/button";
import { Input } from "@getblitz/ui/input";
import { toast } from "@getblitz/ui/toast";

import { useTRPC } from "~/trpc/react";

interface AllowedOriginsSettingsProps {
  initialOrigins: string[];
}

export function AllowedOriginsSettings({
  initialOrigins,
}: AllowedOriginsSettingsProps) {
  const params = useParams();
  const trpc = useTRPC();
  const t = useTranslations("SettingsPage");
  const [origins, setOrigins] = useState<string[]>(initialOrigins);
  const [newOrigin, setNewOrigin] = useState("");
  const updateOrganization = useMutation(
    trpc.organization.update.mutationOptions({
      onSuccess: () => {
        toast.success(t("originsUpdated"));
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const handleAddOrigin = () => {
    if (!newOrigin) return;

    // Basic validation
    try {
      const url = new URL(newOrigin);
      const origin = url.origin;

      if (origins.includes(origin)) {
        toast.error(t("originAlreadyExists"));
        return;
      }

      const updatedOrigins = [...origins, origin];
      setOrigins(updatedOrigins);
      setNewOrigin("");

      updateOrganization.mutate({
        slug: params.slug as string,
        allowedOrigins: updatedOrigins,
      });
    } catch {
      toast.error(t("invalidUrl"));
    }
  };

  const handleRemoveOrigin = (originToRemove: string) => {
    const updatedOrigins = origins.filter((o) => o !== originToRemove);
    setOrigins(updatedOrigins);

    updateOrganization.mutate({
      slug: params.slug as string,
      allowedOrigins: updatedOrigins,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("allowedOrigins")}</CardTitle>
        <CardDescription>{t("allowedOriginsDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="https://example.com"
            value={newOrigin}
            onChange={(e) => setNewOrigin(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddOrigin();
              }
            }}
          />
          <Button
            onClick={handleAddOrigin}
            disabled={!newOrigin || updateOrganization.isPending}
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            {t("add")}
          </Button>
        </div>

        <div className="space-y-2">
          {origins.length === 0 && (
            <p className="text-muted-foreground text-sm italic">
              {t("noOriginsConfigured")}
            </p>
          )}
          {origins.map((origin) => (
            <div
              key={origin}
              className="flex items-center justify-between rounded-md border p-3"
            >
              <span className="font-mono text-sm">{origin}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveOrigin(origin)}
                disabled={updateOrganization.isPending}
              >
                <XIcon className="h-4 w-4" />
                <span className="sr-only">{t("remove")}</span>
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
