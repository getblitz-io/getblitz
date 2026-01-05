import { createEnv } from "@t3-oss/env-core";
import { z } from "zod/v4";

export function redisEnv() {
  return createEnv({
    server: {
      REDIS_URL: z.url().default("redis://localhost:6380"),
    },
    runtimeEnv: process.env,
    skipValidation:
      !!process.env.CI || process.env.npm_lifecycle_event === "lint",
  });
}

export const env = redisEnv();
