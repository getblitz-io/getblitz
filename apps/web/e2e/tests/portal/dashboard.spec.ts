import { expect, test } from "../../fixtures/auth.fixture";
import { gotoPortal } from "../../helpers/portal.helper";

test.describe("Portal dashboard", () => {
  test("should render dashboard metrics for existing organization", async ({
    authenticatedPage,
    organization,
  }) => {
    await gotoPortal(authenticatedPage, organization);

    await expect(authenticatedPage).toHaveURL(
      new RegExp(`/${organization.slug}`),
    );

    await expect(
      authenticatedPage.getByText(`Welcome back, ${organization.name}!`),
    ).toBeVisible();

    const createPaymentBtn = authenticatedPage
      .getByRole("button", { name: /create/i })
      .first();
    await expect(createPaymentBtn).toBeVisible();
  });

  test("should show portal navigation links", async ({
    authenticatedPage,
    organization,
  }) => {
    await gotoPortal(authenticatedPage, organization);

    await expect(
      authenticatedPage.getByRole("link", { name: "Dashboard", exact: true }),
    ).toBeVisible();
    await expect(
      authenticatedPage.getByRole("link", { name: "Banks", exact: true }),
    ).toBeVisible();
    await expect(
      authenticatedPage.getByRole("link", { name: "Payments", exact: true }),
    ).toBeVisible();
    await expect(
      authenticatedPage.getByRole("link", { name: "Customers", exact: true }),
    ).toBeVisible();
    await expect(
      authenticatedPage.getByRole("link", { name: "Invoices", exact: true }),
    ).toBeVisible();
    await expect(
      authenticatedPage.getByRole("link", { name: "Settings", exact: true }),
    ).toBeVisible();
  });
});
