import type { Page } from "@playwright/test";
import { test as base } from "@playwright/test";

import type {
  BankAccount,
  Organization,
  OrganizationBankConnection,
} from "@getblitz/database";

import type { TestSession } from "../helpers/auth.helper";
import {
  createTestOrganization,
  createTestSession,
} from "../helpers/auth.helper";
import { sessionCookiesFromHeaders } from "../helpers/cookies.helper";
import { createTestBankAccount } from "./test-factories";

export interface BankSetup {
  connection: OrganizationBankConnection;
  account: BankAccount;
}

export interface AuthenticatedFixtures {
  session: TestSession;
  organization: Organization;
  authenticatedPage: Page;
  bankSetup: BankSetup;
}

export const test = base.extend<AuthenticatedFixtures>({
  session: async ({}, use) => {
    const session = await createTestSession();
    await use(session);
  },

  organization: async ({ session }, use) => {
    const rand = Math.floor(Math.random() * 10000000);
    const org = await createTestOrganization(
      session.user.id,
      `E2E Org ${Date.now()}-${rand}`,
      `e2e-org-${Date.now()}-${rand}`,
    );
    await use(org);
  },

  authenticatedPage: async ({ page, context, session }, use) => {
    const cookiesToSet = sessionCookiesFromHeaders(
      session.headers,
      session.cookieHeader,
    );

    if (cookiesToSet.length > 0) {
      await context.addCookies(cookiesToSet);
    }

    await use(page);
  },

  bankSetup: async ({ organization }, use) => {
    const setup = await createTestBankAccount(organization.id);
    await use(setup);
  },
});

export { expect } from "@playwright/test";
