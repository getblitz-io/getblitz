import Link from "next/link";

const products = [
  {
    id: "premium-access",
    name: "Premium Access",
    description: "Unlock all features for 30 days",
    price: 999, // cents
    icon: "🚀",
    gradient: "from-cyan-500 to-blue-600",
  },
  {
    id: "api-credits",
    name: "API Credits Pack",
    description: "10,000 API calls for your apps",
    price: 2500,
    icon: "⚡",
    gradient: "from-violet-500 to-purple-600",
  },
  {
    id: "enterprise-license",
    name: "Enterprise License",
    description: "Unlimited usage for your team",
    price: 9900,
    icon: "🏢",
    gradient: "from-amber-500 to-orange-600",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-12">
      <div className="text-center">
        <h1 className="bg-linear-to-r from-white via-cyan-200 to-white bg-clip-text text-5xl font-bold tracking-tight text-transparent">
          Demo Store
        </h1>
        <p className="mt-3 text-lg text-slate-400">
          Test the GetBlitz Payment Gateway — SEPA
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {products.map((product) => (
          <div
            key={product.id}
            className="group relative overflow-hidden rounded-2xl border border-white/5 bg-white/2 p-6 backdrop-blur-sm transition-all hover:border-white/10 hover:bg-white/[0.04]"
          >
            <div
              className={`mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-linear-to-br ${product.gradient} text-2xl shadow-lg`}
            >
              {product.icon}
            </div>
            <h2 className="text-xl font-semibold text-white">{product.name}</h2>
            <p className="mt-2 text-sm text-slate-400">{product.description}</p>
            <div className="mt-6 flex items-center justify-between">
              <span className="text-3xl font-bold text-white">
                €{(product.price / 100).toFixed(2)}
              </span>
              <Link
                href={`/checkout?product=${product.id}&amount=${product.price}`}
                className={`rounded-lg bg-linear-to-r ${product.gradient} px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl`}
              >
                Buy Now
              </Link>
            </div>
            <div
              className={`absolute inset-x-0 -bottom-px h-px bg-linear-to-r ${product.gradient} opacity-0 transition-opacity group-hover:opacity-50`}
            />
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-white/5 bg-white/2 p-8 backdrop-blur-sm">
        <h3 className="text-lg font-semibold text-white">How it works</h3>
        <ol className="mt-5 grid gap-4 text-sm text-slate-400 md:grid-cols-4">
          <li className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 font-mono text-xs text-cyan-400">
              1
            </span>
            <span>
              Click <strong className="text-white">Buy Now</strong> on any
              product
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 font-mono text-xs text-cyan-400">
              2
            </span>
            <span>
              Scan the SEPA QR code with your banking app (or pay with crypto)
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 font-mono text-xs text-cyan-400">
              3
            </span>
            <span>
              Payment is confirmed in{" "}
              <strong className="text-white">real-time</strong> via WebSocket
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 font-mono text-xs text-cyan-400">
              4
            </span>
            <span>Redirected to success page with proof token</span>
          </li>
        </ol>
      </div>

      <div className="text-center text-sm text-slate-500">
        <p>This is a demo environment. No real payments are processed.</p>
      </div>
    </div>
  );
}
