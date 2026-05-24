import { expect, test } from "../../fixtures/auth.fixture";
import { createTestCustomer } from "../../fixtures/test-factories";
import {
  expectInvoiceDetailPage,
  fillInvoiceLineItem,
  fillNewCustomerName,
  selectExistingInvoiceCustomer,
  selectNewInvoiceCustomer,
  submitCreateInvoice,
} from "../../helpers/invoice.helper";
import { gotoPortal } from "../../helpers/portal.helper";

test.describe("Portal invoices", () => {
  test("should render invoices list page", async ({
    authenticatedPage,
    organization,
  }) => {
    await gotoPortal(authenticatedPage, organization, "invoices");

    await expect(
      authenticatedPage.getByRole("heading", { name: "Invoices", level: 1 }),
    ).toBeVisible();
    await expect(
      authenticatedPage.getByRole("link", { name: "Create Invoice" }).first(),
    ).toBeVisible();
  });

  test("should create an invoice with a new customer", async ({
    authenticatedPage,
    organization,
    bankSetup: _bankSetup,
  }) => {
    const email = `e2e-invoice-new-${Date.now()}@test.getblitz.io`;
    const customerName = "E2E Invoice New Customer";
    const lineDescription = "E2E consulting hours";

    await gotoPortal(authenticatedPage, organization, "invoices/new");

    await expect(
      authenticatedPage.getByRole("heading", { name: "New Invoice", level: 1 }),
    ).toBeVisible();

    await selectNewInvoiceCustomer(authenticatedPage, email);
    await fillNewCustomerName(authenticatedPage, customerName);
    await fillInvoiceLineItem(authenticatedPage, {
      description: lineDescription,
      price: "150.00",
    });
    await submitCreateInvoice(authenticatedPage);

    await expectInvoiceDetailPage(authenticatedPage, organization.slug);

    await expect(authenticatedPage.getByText("Draft")).toBeVisible();
    await expect(
      authenticatedPage.getByText(email).filter({ visible: true }).first(),
    ).toBeVisible();
    await expect(
      authenticatedPage
        .getByText(customerName)
        .filter({ visible: true })
        .first(),
    ).toBeVisible();
    await expect(authenticatedPage.getByText(lineDescription)).toBeVisible();
    await expect(
      authenticatedPage.getByText("€150.00").filter({ visible: true }).first(),
    ).toBeVisible();
  });

  test("should create an invoice with an existing customer", async ({
    authenticatedPage,
    organization,
    bankSetup: _bankSetup,
  }) => {
    const email = `e2e-invoice-existing-${Date.now()}@test.getblitz.io`;
    const customer = await createTestCustomer(organization.id, email);
    const lineDescription = "E2E retainer fee";

    await gotoPortal(authenticatedPage, organization, "invoices/new");

    await selectExistingInvoiceCustomer(
      authenticatedPage,
      email,
      customer.name ?? email,
    );
    await fillInvoiceLineItem(authenticatedPage, {
      description: lineDescription,
      price: "99.50",
    });
    await submitCreateInvoice(authenticatedPage);

    await expectInvoiceDetailPage(authenticatedPage, organization.slug);

    await expect(authenticatedPage.getByText("Draft")).toBeVisible();
    await expect(
      authenticatedPage.getByText(email).filter({ visible: true }).first(),
    ).toBeVisible();
    await expect(
      authenticatedPage
        .getByText(customer.name ?? "E2E Customer")
        .filter({ visible: true })
        .first(),
    ).toBeVisible();
    await expect(authenticatedPage.getByText(lineDescription)).toBeVisible();
    await expect(
      authenticatedPage.getByText("€99.50").filter({ visible: true }).first(),
    ).toBeVisible();
  });
});
