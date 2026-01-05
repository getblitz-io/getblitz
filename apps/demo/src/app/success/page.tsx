import Link from "next/link";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; token?: string }>;
}) {
  const { session, token } = await searchParams;

  return (
    <div className="mx-auto max-w-md space-y-8 text-center">
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-10 backdrop-blur-sm">
        <div className="mb-6 text-7xl">🎉</div>
        <h1 className="text-3xl font-bold text-emerald-400">
          Payment Successful!
        </h1>
        <p className="mt-3 text-slate-400">Your purchase has been confirmed.</p>
      </div>

      <div className="rounded-2xl border border-white/5 bg-white/2 p-6 text-left backdrop-blur-sm">
        <h3 className="font-semibold text-white">Payment Details</h3>
        <dl className="mt-4 space-y-3 font-mono text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-400">Session ID</dt>
            <dd className="text-white">
              {session ? `${session.slice(0, 8)}...` : "—"}
            </dd>
          </div>
          {token && (
            <div className="flex justify-between">
              <dt className="text-slate-400">Proof Token</dt>
              <dd className="text-white">{token.slice(0, 12)}...</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-slate-400">Status</dt>
            <dd className="text-emerald-400">✓ Confirmed</dd>
          </div>
        </dl>
      </div>

      <div className="space-y-4">
        <p className="text-sm text-slate-400">
          In a real application, you would now unlock the purchased content or
          fulfill the order using the proof token.
        </p>

        <Link
          href="/"
          className="inline-block rounded-lg bg-linear-to-r from-cyan-500 to-blue-600 px-8 py-3 font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
        >
          Return to Store
        </Link>
      </div>
    </div>
  );
}
