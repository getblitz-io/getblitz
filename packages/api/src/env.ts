import { createEnv } from "@t3-oss/env-core";
import { z } from "zod/v4";

export function apiEnv() {
  return createEnv({
    server: {
      ENCRYPTION_KEY: z.string().min(32),
      LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).optional(),
      NODE_ENV: z
        .enum(["development", "production", "test"])
        .default("development"),
      APPLICATION_ENV: z
        .enum(["development", "production", "preview", "test"])
        .default("development"),
    },
    clientPrefix: "NEXT_PUBLIC_",
    client: {
      NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
    },
    runtimeEnv: process.env,
    skipValidation:
      !!process.env.CI || process.env.npm_lifecycle_event === "lint",
  });
}

export const env = apiEnv();

/**
 * Test providers (e.g. test-bank) accept unsigned webhooks and a user-supplied
 * base URL. They must never be available on a production build.
 *
 * A function (not a constant) because this module is also imported on the
 * client, where reading server-side env vars at import time throws.
 */
export function areTestProvidersEnabled(): boolean {
  return env.NODE_ENV !== "production" && env.APPLICATION_ENV !== "production";
}
