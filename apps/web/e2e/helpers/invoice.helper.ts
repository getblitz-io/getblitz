import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export async function selectNewInvoiceCustomer(page: Page, email: string) {
  const combobox = page.getByRole("combobox");
  await combobox.click();
  await combobox.fill(email);
  const createOption = page.getByRole("option", {
    name: `+ Create new customer: ${email}`,
  });
  await expect(createOption).toBeVisible({ timeout: 10000 });
  await createOption.click();
  await expect(page.getByPlaceholder("John Doe")).toBeVisible();
}

export async function fillNewCustomerName(page: Page, name: string) {
  await page.getByPlaceholder("John Doe").fill(name);
}

export async function selectExistingInvoiceCustomer(
  page: Page,
  searchQuery: string,
  optionLabel: string,
) {
  const combobox = page.getByRole("combobox");
  await combobox.click();
  await combobox.fill(searchQuery);
  const option = page.getByRole("option", { name: optionLabel });
  await expect(option).toBeVisible({ timeout: 10000 });
  await option.click();
}

export async function fillInvoiceLineItem(
  page: Page,
  params: { description: string; price: string },
) {
  await page.getByRole("button", { name: "Add Item" }).click();
  const lineItemRow = page.locator(".space-y-3 > div").last();
  await lineItemRow
    .getByPlaceholder("Item description")
    .fill(params.description);
  await lineItemRow
    .locator('input[type="number"][step="0.01"]')
    .fill(params.price);
}

export async function submitCreateInvoice(page: Page) {
  const submit = page.getByRole("button", { name: "Create Invoice" });
  await expect(submit).toBeEnabled({ timeout: 10000 });
  await submit.click();
}

export async function expectInvoiceDetailPage(
  page: Page,
  organizationSlug: string,
) {
  await expect(page).not.toHaveURL(/\/invoices\/new/, { timeout: 15000 });
  await expect(page).toHaveURL(
    new RegExp(`/${organizationSlug}/invoices/[^/]+$`),
    { timeout: 15000 },
  );
}
