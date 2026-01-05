import { Suspense } from "react";

import { BankCallbackClient } from "./bank-callback-client";

interface BankCallbackPageProps {
  params: Promise<{ providerId: string }>;
  searchParams: Promise<{ code?: string; state?: string }>;
}

export default async function BankCallbackPage({
  params,
  searchParams,
}: BankCallbackPageProps) {
  const { providerId } = await params;
  const { code, state } = await searchParams;

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BankCallbackClient providerId={providerId} code={code} state={state} />
    </Suspense>
  );
}
