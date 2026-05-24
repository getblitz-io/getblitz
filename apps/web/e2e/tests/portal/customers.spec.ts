import { expect, test } from "../../fixtures/auth.fixture";
import { gotoPortal } from "../../helpers/portal.helper";

test.describe("Portal customers", () => {
  test("should render customers list page", async ({
    authenticatedPage,
    organization,
  }) => {
    await gotoPortal(authenticatedPage, organization, "customers");

    await expect(
      authenticatedPage.getByRole("heading", { name: "Customers", level: 1 }),
    ).toBeVisible();
    await expect(
      authenticatedPage.getByRole("link", { name: "Create Customer" }).first(),
    ).toBeVisible();
    await expect(
      authenticatedPage.getByText(
        "Add your first customer to start creating invoices for them.",
      ),
    ).toBeVisible();
  });

  test("should create a customer from the new customer form", async ({
    authenticatedPage,
    organization,
  }) => {
    const email = `e2e-customer-${Date.now()}@test.getblitz.io`;

    await gotoPortal(authenticatedPage, organization, "customers/new");

    const customerName = "E2E Portal Customer";
    await authenticatedPage.locator("id=name").fill(customerName);
    await authenticatedPage.locator("id=email").fill(email);
    await authenticatedPage
      .getByRole("button", { name: "Create Customer" })
      .click();

    await expect(authenticatedPage).toHaveURL(
      new RegExp(`/${organization.slug}/customers$`),
    );
    await expect(
      authenticatedPage.getByRole("link", { name: customerName }),
    ).toBeVisible();
  });
});
