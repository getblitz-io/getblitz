import { expect, test } from "../../../fixtures/auth.fixture";
import { gotoPortal } from "../../../helpers/portal.helper";

test.describe("Portal create payment", () => {
  test("should create a payment and open the payment detail page", async ({
    authenticatedPage,
    organization,
    bankSetup,
  }) => {
    await gotoPortal(authenticatedPage, organization, "payments/new");

    await expect(
      authenticatedPage.getByRole("heading", {
        name: "Create Payment",
        level: 1,
      }),
    ).toBeVisible();

    await authenticatedPage.locator("id=amount").fill("10.00");
    await authenticatedPage
      .getByRole("button", { name: "Create Payment" })
      .click();

    await expect(authenticatedPage).toHaveURL(
      new RegExp(`/${organization.slug}/payments/[A-Z0-9-]+$`),
      { timeout: 15000 },
    );

    await expect(
      authenticatedPage
        .getByText(bankSetup.account.accountIban)
        .filter({ visible: true }),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      authenticatedPage
        .getByText("Listening for payment...")
        .or(authenticatedPage.getByText("Connecting...")),
    ).toBeVisible();
  });
});
