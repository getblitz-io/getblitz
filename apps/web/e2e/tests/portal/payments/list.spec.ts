import { expect, test } from "../../../fixtures/auth.fixture";
import { createTestPaymentSession } from "../../../fixtures/test-factories";
import { gotoPortal } from "../../../helpers/portal.helper";

test.describe("Portal payments list", () => {
  test("should show empty state when no payments exist", async ({
    authenticatedPage,
    organization,
  }) => {
    await gotoPortal(authenticatedPage, organization, "payments");

    await expect(
      authenticatedPage.getByRole("heading", { name: "Payments", level: 1 }),
    ).toBeVisible();
    await expect(
      authenticatedPage.getByRole("link", { name: "Create Payment" }).first(),
    ).toBeVisible();
    await expect(authenticatedPage.getByText("No payments yet")).toBeVisible();
  });

  test("should list a seeded payment session", async ({
    authenticatedPage,
    organization,
    bankSetup,
  }) => {
    const payment = await createTestPaymentSession({
      organizationId: organization.id,
      bankAccountId: bankSetup.account.id,
    });

    await gotoPortal(authenticatedPage, organization, "payments");

    await expect(
      authenticatedPage.getByRole("link", { name: payment.referenceId }),
    ).toBeVisible();
  });
});
