import { expect, test } from "@playwright/test";

test.describe("Authentication flow", () => {
  test("should render sign-in page correctly", async ({ page }) => {
    // Navigate to the sign-in page
    await page.goto("/sign-in");

    // Expect email and password inputs to be visible
    const emailInput = page.locator("id=email");
    const passwordInput = page.locator("id=password");

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    // Expect Google login button to be present
    const googleButton = page.getByRole("button", { name: "Google" });
    await expect(googleButton).toBeVisible();

    // Check link to register
    const registerLink = page.locator("a[href='/sign-up']");
    await expect(registerLink).toBeVisible();
  });

  test("should navigate to register page from sign-in", async ({ page }) => {
    await page.goto("/sign-in");

    // Click the sign-up link
    await page.locator("a[href='/sign-up']").click();

    // We should be on the register page
    await expect(page).toHaveURL(/\/sign-up/);

    // Expect email, name and password fields on sign-up page
    const emailInput = page.locator("id=email");
    const nameInput = page.locator("id=name");
    const passwordInput = page.locator("id=password");

    await expect(emailInput).toBeVisible();
    await expect(nameInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
  });
});
