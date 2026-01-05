import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth, getSession } from "~/auth/server";

/**
 * Portal root page - redirects to first org or onboarding
 */
export default async function PortalRootPage() {
  const session = await getSession();

  if (!session) {
    redirect("/sign-in");
  }

  const organizations = await auth.api.listOrganizations({
    headers: await headers(),
  });

  if (organizations.length === 0) {
    redirect("/onboarding");
  }

  // Redirect to first organization
  const firstOrg = organizations[0];
  if (firstOrg) {
    redirect(`/${firstOrg.slug}`);
  }

  // Fallback (shouldn't happen)
  redirect("/onboarding");
}
