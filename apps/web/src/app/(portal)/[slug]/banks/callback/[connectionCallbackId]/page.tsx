import { Suspense } from "react";

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

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CallbackClient
        slug={slug}
        connectionCallbackId={connectionCallbackId}
        code={code}
        error={error}
      />
    </Suspense>
  );
}
