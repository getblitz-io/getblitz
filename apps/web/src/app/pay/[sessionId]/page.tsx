import { notFound } from "next/navigation";

import { UnifiedPaymentWidget } from "~/app/_components/payment/unified-payment-widget";
import { api } from "~/trpc/server";

export default async function PaymentPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  // Fetch session via tRPC (public endpoint)
  const caller = await api();
  const session = await caller.payment.getSession({ sessionId });

  if (!session) notFound();

  return (
    <div className="bg-background flex min-h-screen items-center justify-center px-4 py-6 sm:px-6 sm:py-12">
      <div className="bg-card border-border/50 relative w-full max-w-4xl overflow-hidden rounded-3xl border shadow-2xl">
        <div className="from-primary/50 to-primary absolute inset-x-0 top-0 h-1 bg-linear-to-r" />
        <UnifiedPaymentWidget session={session} isEmbedded={true} />
      </div>
    </div>
  );
}
