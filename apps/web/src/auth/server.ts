import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { nextCookies } from "better-auth/next-js";

import { initAuth } from "@getblitz/auth";

import { env } from "~/env";

const baseUrl =
  env.APPLICATION_ENV === "production"
    ? env.PROJECT_URL
    : env.APPLICATION_ENV === "preview" && env.COOLIFY_URL
      ? env.COOLIFY_URL
      : "http://localhost:3000";

export const auth = initAuth({
  baseUrl,
  productionUrl: env.PROJECT_URL,
  secret: env.AUTH_SECRET,
  googleClientId: env.AUTH_GOOGLE_ID,
  googleClientSecret: env.AUTH_GOOGLE_SECRET,
  extraPlugins: [nextCookies()],
});

export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);
