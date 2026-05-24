import { expect, test } from "../../../fixtures/auth.fixture";
import { createTestPaymentSession } from "../../../fixtures/test-factories";
import { gotoPortal } from "../../../helpers/portal.helper";

test.describe("Portal payment detail", () => {
  test("should show pending payment details for a seeded session", async ({
    authenticatedPage,
    organization,
    bankSetup,
  }) => {
    const payment = await createTestPaymentSession({
      organizationId: organization.id,
      bankAccountId: bankSetup.account.id,
      amountCents: 2500,
    });

    await gotoPortal(
      authenticatedPage,
      organization,
      `payments/${payment.referenceId}`,
    );

    await expect(
      authenticatedPage
        .getByText(bankSetup.account.accountIban)
        .filter({ visible: true }),
    ).toBeVisible();
    await expect(
      authenticatedPage
        .getByText("Listening for payment...")
        .or(authenticatedPage.getByText("Connecting...")),
    ).toBeVisible();
  });
});
