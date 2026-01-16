import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import { CallbackClient } from "./callback-client";

interface CallbackPageProps {
  params: Promise<{ slug: string; connectionCallbackId: string }>;
  searchParams: Promise<{ code?: string; error?: string }>;
}

export default async function BankCallbackPage({
  params,
  searchParams,
}: CallbackPageProps) {
  const { slug, connectionCallbackId } = await params;
  const { code, error } = await searchParams;
  const t = await getTranslations("Common.buttons");

  return (
    <Suspense fallback={<div>{t("loading")}</div>}>
      <CallbackClient
        slug={slug}
        connectionCallbackId={connectionCallbackId}
        code={code}
        error={error}
      />
    </Suspense>
  );
}
