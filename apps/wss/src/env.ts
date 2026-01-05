import { createEnv } from "@t3-oss/env-core";
import { z } from "zod/v4";

export const env = createEnv({
  server: {
    WSS_PORT: z.string().default("3001"),
    REDIS_URL: z.url().default("redis://localhost:6380"),
    CORS_ORIGINS: z.string().default("http://localhost:3000"),
  },
  runtimeEnv: process.env,
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
