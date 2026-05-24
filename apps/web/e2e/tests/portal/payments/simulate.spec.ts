import { expect, test } from "../../../fixtures/auth.fixture";
import { createTestPaymentSession } from "../../../fixtures/test-factories";
import { ApiTestClient, createTestApiKey } from "../../../helpers/api.helper";
import { gotoPortal } from "../../../helpers/portal.helper";

test.describe("Portal simulate payment", () => {
  test("should mark a pending payment as paid after REST simulation", async ({
    authenticatedPage,
    organization,
    session,
    bankSetup,
  }) => {
    const payment = await createTestPaymentSession({
      organizationId: organization.id,
      bankAccountId: bankSetup.account.id,
    });

    const apiKey = await createTestApiKey(
      organization.id,
      session.headers,
      "E2E Simulate Payment Key",
    );

    const client = new ApiTestClient();
    const result = await client.callRestV1<{ success: boolean }>({
      path: `/sessions/${payment.id}/simulate-payment`,
      method: "POST",
      apiKey,
    });

    expect(result.success).toBe(true);

    await gotoPortal(
      authenticatedPage,
      organization,
      `payments/${payment.referenceId}`,
    );

    await expect(
      authenticatedPage.getByRole("heading", { name: "Payment Complete" }),
    ).toBeVisible({ timeout: 15000 });
    await expect(authenticatedPage.getByText("Paid")).toBeVisible();
    await expect(
      authenticatedPage.getByText(payment.referenceId),
    ).toBeVisible();
  });
});
