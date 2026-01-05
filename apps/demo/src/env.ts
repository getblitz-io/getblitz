import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod/v4";

export const env = createEnv({
  server: {
    GETBLITZ_API_URL: z.url().default("http://localhost:3000"),
    GETBLITZ_API_KEY: z.string(),
    WEBHOOK_SECRET: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_GETBLITZ_WSS_URL: z.url().default("ws://localhost:3000"),
    NEXT_PUBLIC_GETBLITZ_API_URL: z.url().default("http://localhost:3000"),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_GETBLITZ_WSS_URL: process.env.NEXT_PUBLIC_GETBLITZ_WSS_URL,
    NEXT_PUBLIC_GETBLITZ_API_URL: process.env.NEXT_PUBLIC_GETBLITZ_API_URL,
  },
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
