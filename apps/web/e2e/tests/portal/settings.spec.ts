import { expect, test } from "../../fixtures/auth.fixture";
import { gotoPortal } from "../../helpers/portal.helper";

test.describe("Portal settings", () => {
  test("should render organization and integration settings", async ({
    authenticatedPage,
    organization,
  }) => {
    await gotoPortal(authenticatedPage, organization, "settings");

    await expect(
      authenticatedPage.getByRole("heading", { name: "Settings", level: 1 }),
    ).toBeVisible();
    await expect(
      authenticatedPage
        .getByRole("main")
        .getByText(organization.name, { exact: true }),
    ).toBeVisible();
    await expect(
      authenticatedPage.getByRole("heading", {
        name: "Organization Information",
      }),
    ).toBeVisible();
    await expect(
      authenticatedPage.getByRole("heading", { name: "API Keys" }),
    ).toBeVisible();
    await expect(
      authenticatedPage.getByRole("heading", { name: "Webhooks" }),
    ).toBeVisible();
    await expect(
      authenticatedPage.getByRole("heading", { name: "Allowed Origins" }),
    ).toBeVisible();
  });
});
