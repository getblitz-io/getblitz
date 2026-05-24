import type { Page } from "@playwright/test";

export function orgPath(org: { slug: string }, segment = ""): string {
  const trimmed = segment.replace(/^\/+/, "");
  const path = trimmed ? `/${org.slug}/${trimmed}` : `/${org.slug}`;
  return path.replace(/\/+/g, "/");
}

export async function gotoPortal(
  page: Page,
  org: { slug: string },
  segment = "",
) {
  await page.goto(orgPath(org, segment));
}
