import { testUtils } from "better-auth/plugins";

import type { Organization } from "@getblitz/database";
import { initAuth } from "@getblitz/auth";
import { prisma } from "@getblitz/database";

import { env } from "~/env";

export const testAuth = initAuth({
  baseUrl: env.NEXT_PUBLIC_APP_URL,
  productionUrl: env.PROJECT_URL,
  secret: env.AUTH_SECRET,
  googleClientId: env.AUTH_GOOGLE_ID,
  googleClientSecret: env.AUTH_GOOGLE_SECRET,
  extraPlugins: [testUtils({ captureOTP: true })],
});

export interface TestAuthUser {
  id: string;
  email: string;
  name: string;
}

export interface TestAuthSession {
  id: string;
  userId: string;
  token: string;
}

export interface TestSession {
  user: TestAuthUser;
  session: TestAuthSession;
  headers: Headers;
  cookieHeader: string;
}

export async function createTestSession(overrides?: {
  email?: string;
  name?: string;
}): Promise<TestSession> {
  const ctx = await testAuth.$context;
  const testHelper = ctx.test;

  const rand = Math.floor(Math.random() * 10000000);
  const email =
    overrides?.email ?? `e2e-${Date.now()}-${rand}@test.getblitz.io`;
  const name = overrides?.name ?? "E2E Test User";

  const user = testHelper.createUser({
    email,
    name,
  });

  await testHelper.saveUser(user);

  const { headers, session } = await testHelper.login({ userId: user.id });

  const cookieHeader = headers.get("cookie") ?? headers.get("set-cookie") ?? "";

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    session,
    headers,
    cookieHeader,
  };
}

export async function createTestOrganization(
  userId: string,
  name: string,
  slug: string,
): Promise<Organization> {
  const rand = Math.floor(Math.random() * 10000000);
  const orgId = `org-${Date.now()}-${rand}`;
  const org = await prisma.organization.create({
    data: {
      id: orgId,
      name,
      slug,
      createdAt: new Date(),
    },
  });

  await prisma.member.create({
    data: {
      id: `member-${Date.now()}-${rand}`,
      organizationId: org.id,
      userId,
      role: "owner",
      createdAt: new Date(),
    },
  });

  return org;
}
