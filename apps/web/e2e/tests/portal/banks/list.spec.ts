import { expect, test } from "../../../fixtures/auth.fixture";
import { gotoPortal } from "../../../helpers/portal.helper";

test.describe("Portal bank accounts list", () => {
  test("should show empty state when no bank accounts exist", async ({
    authenticatedPage,
    organization,
  }) => {
    await gotoPortal(authenticatedPage, organization, "banks");

    await expect(
      authenticatedPage.getByRole("heading", {
        name: "Bank Accounts",
        level: 1,
      }),
    ).toBeVisible();
    await expect(
      authenticatedPage.getByRole("link", { name: "Bank Providers" }),
    ).toBeVisible();
    await expect(
      authenticatedPage.getByText(
        "No bank accounts configured. Configure a bank provider to start accepting SEPA payments.",
      ),
    ).toBeVisible();
  });

  test("should list seeded bank account", async ({
    authenticatedPage,
    organization,
    bankSetup,
  }) => {
    await gotoPortal(authenticatedPage, organization, "banks");

    await expect(
      authenticatedPage.getByText(bankSetup.account.accountName),
    ).toBeVisible();
    await expect(
      authenticatedPage.getByText(bankSetup.account.accountIban),
    ).toBeVisible();
  });
});
