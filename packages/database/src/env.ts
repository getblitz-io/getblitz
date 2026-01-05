import { createEnv } from "@t3-oss/env-core";
import { z } from "zod/v4";

export function databaseEnv() {
  return createEnv({
    server: {
      DATABASE_HOST: z.string().default("localhost"),
      DATABASE_USER: z.string().default("app"),
      DATABASE_PASSWORD: z.string().default("password"),
      DATABASE_NAME: z.string().default("getblitz"),
    },
    runtimeEnv: process.env,
    skipValidation:
      !!process.env.CI || process.env.npm_lifecycle_event === "lint",
  });
}

export const env = databaseEnv();
