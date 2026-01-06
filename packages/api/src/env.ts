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
