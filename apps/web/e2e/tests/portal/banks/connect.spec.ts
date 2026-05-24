import { expect, test } from "../../../fixtures/auth.fixture";
import { gotoPortal, orgPath } from "../../../helpers/portal.helper";

test.describe("Portal bank connect", () => {
  test("should open provider picker and navigate to Test Bank configure page", async ({
    authenticatedPage,
    organization,
  }) => {
    await gotoPortal(authenticatedPage, organization, "banks/connect");

    await expect(
      authenticatedPage.getByRole("heading", {
        name: "Bank Connections",
        level: 1,
      }),
    ).toBeVisible();

    await authenticatedPage
      .getByRole("button", { name: "Configure a New Bank Provider" })
      .click();

    await expect(
      authenticatedPage.getByRole("heading", {
        name: "Select a Bank Provider",
      }),
    ).toBeVisible();

    await authenticatedPage.getByRole("button", { name: "Test Bank" }).click();

    await expect(authenticatedPage).toHaveURL(
      new RegExp(`${orgPath(organization, "banks/connect/test-bank")}$`),
    );
    await expect(
      authenticatedPage.getByRole("heading", { name: /Configure Test Bank/ }),
    ).toBeVisible();
    await expect(
      authenticatedPage.getByRole("button", { name: "Connect" }),
    ).toBeVisible();
  });
});
