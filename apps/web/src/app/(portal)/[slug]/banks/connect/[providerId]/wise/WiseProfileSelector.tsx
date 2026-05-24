"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { Button } from "@getblitz/ui/button";

import type { CustomProviderComponentProps } from "../custom-provider-components";
import { useTRPC } from "~/trpc/react";

function BusinessIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
    >
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <line x1="12" y1="12" x2="12" y2="16" />
      <line x1="10" y1="14" x2="14" y2="14" />
    </svg>
  );
}

function PersonalIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

function CheckmarkIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/**
 * Wise-specific profile selection step in the bank connection setup flow.
 *
 * This component is rendered by the generic custom-provider-components registry
 * when a Wise provider connection is being configured. It:
 * 1. Reads the apiToken from the parent form values (user clicks "Load profiles" to fetch)
 * 2. Fetches available Wise profiles via GET /v2/profiles
 * 3. Lets the user pick which profile to associate with this connection
 * 4. Calls onConfigUpdate({ profileId }) and then onComplete()
 */
export default function WiseProfileSelector({
  slug,
  providerConfig,
  onConfigUpdate,
  onComplete,
}: CustomProviderComponentProps) {
  const trpc = useTRPC();
  const t = useTranslations("BankConfigurePage.wiseProfileSelector");
  const tButtons = useTranslations("Common.buttons");
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(
    null,
  );
  /** Snapshot token/sandbox only after user clicks "Load profiles" — avoids fetching on every keystroke */
  const [fetchKey, setFetchKey] = useState<{
    token: string;
    sandbox: boolean;
  } | null>(null);

  const apiToken =
    typeof providerConfig.apiToken === "string" ? providerConfig.apiToken : "";
  const sandboxMode =
    typeof providerConfig.sandboxMode === "boolean"
      ? providerConfig.sandboxMode
      : false;

  const trimmedToken = apiToken.trim();

  const {
    data: profiles,
    isLoading,
    error,
    refetch,
  } = useQuery({
    ...trpc.provider.wise.listProfiles.queryOptions({
      slug,
      apiToken: fetchKey?.token ?? "",
      sandboxMode: fetchKey?.sandbox ?? false,
    }),
    enabled: fetchKey !== null && fetchKey.token.length > 0,
    retry: false,
  });

  const handleLoadProfiles = () => {
    if (!trimmedToken) return;
    setSelectedProfileId(null);
    setFetchKey({ token: trimmedToken, sandbox: sandboxMode });
  };

  const handleConfirm = () => {
    if (selectedProfileId === null) return;
    onConfigUpdate({ profileId: selectedProfileId.toString() });
    onComplete();
  };

  return (
    <div className="bg-card rounded-xl border shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-6 py-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#00B9FF]/10">
          {/* Wise logo mark */}
          <svg viewBox="0 0 32 32" className="h-5 w-5 fill-[#00B9FF]">
            <path d="M16 2C8.268 2 2 8.268 2 16s6.268 14 14 14 14-6.268 14-14S23.732 2 16 2zm5.42 9.09-7.49 4.32 7.49 4.3v3.18L10.58 16l10.84-6.09v1.18z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm leading-none font-semibold">{t("title")}</h3>
          <p className="text-muted-foreground mt-1 text-xs">{t("subtitle")}</p>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-5">
        {fetchKey === null && (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">{t("loadPrompt")}</p>
            <Button
              type="button"
              disabled={!trimmedToken}
              onClick={handleLoadProfiles}
            >
              {t("loadProfiles")}
            </Button>
          </div>
        )}

        {fetchKey !== null && isLoading && (
          <div className="flex items-center justify-center gap-3 py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent opacity-60" />
            <span className="text-muted-foreground text-sm">
              {t("fetching")}
            </span>
          </div>
        )}

        {fetchKey !== null && error && (
          <div className="border-destructive/20 bg-destructive/5 rounded-lg border p-4">
            <p className="text-destructive text-sm font-medium">
              {t("loadErrorTitle")}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              {error.message}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => refetch()}
            >
              {tButtons("retry")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 block"
              type="button"
              onClick={() => {
                setFetchKey(null);
                setSelectedProfileId(null);
              }}
            >
              {t("useDifferentToken")}
            </Button>
          </div>
        )}

        {fetchKey !== null &&
          !error &&
          profiles?.length === 0 &&
          !isLoading && (
            <div className="border-muted bg-muted/30 rounded-lg border p-4">
              <p className="text-muted-foreground text-sm">{t("noProfiles")}</p>
            </div>
          )}

        {fetchKey !== null && profiles && profiles.length > 0 && (
          <div className="space-y-3">
            {profiles.map((profile) => {
              const isSelected = selectedProfileId === profile.id;
              return (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => setSelectedProfileId(profile.id)}
                  className={[
                    "group relative flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all duration-150",
                    isSelected
                      ? "border-[#00B9FF] bg-[#00B9FF]/5 ring-1 ring-[#00B9FF]/30 dark:bg-[#00B9FF]/10"
                      : "border-border hover:border-border/80 hover:bg-accent",
                  ].join(" ")}
                >
                  {/* Profile type icon */}
                  <div
                    className={[
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors",
                      isSelected
                        ? "bg-[#00B9FF]/15 text-[#00B9FF]"
                        : "bg-muted text-muted-foreground group-hover:text-foreground",
                    ].join(" ")}
                  >
                    {profile.type === "business" ? (
                      <BusinessIcon />
                    ) : (
                      <PersonalIcon />
                    )}
                  </div>

                  {/* Profile info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate leading-none font-medium">
                        {profile.fullName}
                      </span>
                      <span
                        className={[
                          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase",
                          profile.type === "business"
                            ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
                            : "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
                        ].join(" ")}
                      >
                        {profile.type === "business"
                          ? t("profileTypeBusiness")
                          : t("profileTypePersonal")}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {t("profileIdLabel", { id: profile.id })}
                    </p>
                  </div>

                  {/* Selection indicator */}
                  <div
                    className={[
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                      isSelected
                        ? "border-[#00B9FF] bg-[#00B9FF] text-white"
                        : "border-border",
                    ].join(" ")}
                  >
                    {isSelected && <CheckmarkIcon />}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {fetchKey !== null && profiles && profiles.length > 0 && (
        <div className="flex items-center justify-between border-t px-6 py-4">
          <p className="text-muted-foreground text-xs">
            {selectedProfileId ? t("footerSelected") : t("footerSelectPrompt")}
          </p>
          <Button
            type="button"
            disabled={selectedProfileId === null}
            onClick={handleConfirm}
          >
            {t("continueWithProfile")}
          </Button>
        </div>
      )}
    </div>
  );
}
