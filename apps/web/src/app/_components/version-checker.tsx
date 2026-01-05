"use client";

import { useCallback, useEffect, useState } from "react";
import { Cross2Icon, UpdateIcon } from "@radix-ui/react-icons";

import { Button } from "@getblitz/ui/button";

import { env } from "~/env";

interface VersionInfo {
  version: string;
  name: string;
}

const DISMISSED_VERSION_KEY = "getblitz-dismissed-version";

/**
 * Compares two semantic versions
 * Returns true if serverVersion is newer than clientVersion
 */
function isNewerVersion(clientVersion: string, serverVersion: string): boolean {
  const client = clientVersion.split(".").map(Number);
  const server = serverVersion.split(".").map(Number);

  for (let i = 0; i < Math.max(client.length, server.length); i++) {
    const c = client[i] ?? 0;
    const s = server[i] ?? 0;
    if (s > c) return true;
    if (s < c) return false;
  }
  return false;
}

export function VersionChecker() {
  const [newVersion, setNewVersion] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const currentVersion = env.NEXT_PUBLIC_APP_VERSION;

  const checkVersion = useCallback(async () => {
    if (!currentVersion) return;

    try {
      const response = await fetch("/api/version");
      if (!response.ok) return;

      const data = (await response.json()) as VersionInfo;

      // Check if this version was already dismissed
      const dismissedVersion = localStorage.getItem(DISMISSED_VERSION_KEY);
      if (dismissedVersion === data.version) return;

      // Check if server version is newer
      if (isNewerVersion(currentVersion, data.version)) {
        setNewVersion(data.version);
        setIsVisible(true);
      }
    } catch {
      // Silently fail - version check is not critical
    }
  }, [currentVersion]);

  useEffect(() => {
    // Initial check - wrapped in setTimeout to avoid synchronous setState
    const timeoutId = setTimeout(() => {
      void checkVersion();
    }, 0);

    // Check version every 5 minutes
    const interval = setInterval(
      () => {
        void checkVersion();
      },
      5 * 60 * 1000,
    );

    return () => {
      clearTimeout(timeoutId);
      clearInterval(interval);
    };
  }, [checkVersion]);

  const handleDismiss = () => {
    if (newVersion) {
      localStorage.setItem(DISMISSED_VERSION_KEY, newVersion);
    }
    setIsVisible(false);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  if (!isVisible || !newVersion) {
    return null;
  }

  return (
    <div className="bg-primary text-primary-foreground fixed top-0 right-0 left-0 z-50 flex items-center justify-center gap-3 px-4 py-2 text-sm">
      <UpdateIcon className="h-4 w-4 animate-spin" />
      <span>
        A new version ({newVersion}) is available!
        {currentVersion && (
          <span className="text-primary-foreground/70">
            {" "}
            You&apos;re on {currentVersion}.
          </span>
        )}
      </span>
      <Button
        variant="secondary"
        size="sm"
        onClick={handleRefresh}
        className="h-7 px-3 text-xs"
      >
        Refresh
      </Button>
      <button
        onClick={handleDismiss}
        className="hover:bg-primary-foreground/10 ml-2 rounded-sm p-1 transition-colors"
        aria-label="Dismiss version notification"
      >
        <Cross2Icon className="h-4 w-4" />
      </button>
    </div>
  );
}
