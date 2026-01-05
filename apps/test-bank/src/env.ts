import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3001"),
    // Comma-separated list of allowed webhook domains, supports wildcards (e.g., "https://*.example.com")
    NEXT_PUBLIC_ALLOWED_WEBHOOK_DOMAINS: z
      .string()
      .default("http://localhost:3001"),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_ALLOWED_WEBHOOK_DOMAINS:
      process.env.NEXT_PUBLIC_ALLOWED_WEBHOOK_DOMAINS,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
