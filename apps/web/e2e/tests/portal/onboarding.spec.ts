import { expect, test } from "../../fixtures/auth.fixture";
import { createTestSession } from "../../helpers/auth.helper";
import { sessionCookiesFromHeaders } from "../../helpers/cookies.helper";

test.describe("Portal onboarding", () => {
  test("should redirect to onboarding when no organization exists and allow creating one", async ({
    page,
    context,
  }) => {
    const session = await createTestSession();

    const cookiesToSet = sessionCookiesFromHeaders(
      session.headers,
      session.cookieHeader,
    );
    await context.addCookies(cookiesToSet);

    await page.goto("/");
    await expect(page).toHaveURL(/\/onboarding/);

    const rand = Math.floor(Math.random() * 10000000);
    const orgName = `E2E Auto Org ${rand}`;
    const orgSlug = `e2e-auto-org-${rand}`;

    const orgNameInput = page.locator("id=name");
    const orgSlugInput = page.locator("id=slug");

    await expect(orgNameInput).toBeVisible();
    await orgNameInput.fill(orgName);

    await expect(orgSlugInput).toHaveValue(orgSlug, { timeout: 5000 });

    const submitBtn = page.getByRole("button", { name: "Create Organization" });
    await submitBtn.click();

    await expect(page).toHaveURL(new RegExp(`/${orgSlug}`), { timeout: 10000 });

    await expect(page.getByText(`Welcome back, ${orgName}!`)).toBeVisible();
  });
});
