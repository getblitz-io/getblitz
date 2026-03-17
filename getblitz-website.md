# AI Prompt: GetBlitz Landing Page

## Task

Create a stunning, production-grade landing page for **GetBlitz** — an open-source, self-hosted SEPA Instant Payment Gateway built for European businesses. The landing page should feel modern, trustworthy, and technical — aimed at European SMEs, developers, and finance teams who are tired of depending on US-based payment processors.

Freely change the content of `apps/website/` to implement the landing page. The landing page should be a static page that can be deployed to any static hosting service. Aim to be SEO-friendly and accessible.

---

## ⚠️ Critical First Step — Read the Shared Design Tokens

**Before writing a single line of CSS or choosing any color, you must read the monorepo's shared Tailwind theme file:**

```
tooling/tailwind/theme.css
```

This file defines all CSS custom properties for the project — colors, radii, font sizes, spacing, shadows, etc. **All visual decisions on the landing page must use these tokens.** Do not invent new color values or override existing ones. The goal is that a visitor who moves from the landing page into the app dashboard experiences a seamless, visually consistent product.

### How to wire up the shared theme in the new site app

**1. Tailwind config** — extend the shared base config, exactly as `apps/web` does:

```ts
// apps/site/tailwind.config.ts
import baseConfig from "@getblitz/tailwind-config";

export default {
  ...baseConfig,
  content: ["./src/**/*.{ts,tsx,mdx}"],
};
```

**2. Global CSS** — import the shared theme tokens at the top of your global stylesheet, before any `@import "tailwindcss"` directive:

```css
/* apps/website/src/styles/globals.css */
@import "../../../../tooling/tailwind/theme.css";
@import "tailwindcss";
```

**3. Verify token availability** — after importing, all CSS variables defined in `theme.css` (e.g. `--color-primary`, `--color-background`, `--radius-md`, etc.) will be available in your CSS and via Tailwind's `theme()` function. Use them exclusively for all styling decisions.

**4. Check how `apps/web` consumes the theme** — before building anything, inspect:

- `apps/web/tailwind.config.ts` — to confirm the import pattern
- `apps/web/src/styles/globals.css` (or equivalent) — to see how tokens are imported
- `packages/ui/` — to reuse any shared UI components (buttons, cards, badges) that already implement the design system

Match those patterns exactly in `apps/website/`.

### Adapting the design direction to the actual tokens

Once you have read `theme.css`, map the design intent below to the real token names. For example:

- Where this prompt says "primary accent color" → use `var(--color-primary)` or its Tailwind alias
- Where this prompt says "background" → use `var(--color-background)`
- Where this prompt says "muted text" → use `var(--color-muted-foreground)`
- Where this prompt says "card surface" → use `var(--color-card)` or `var(--color-secondary)`

If the token system supports both light and dark modes (look for `:root` and `.dark` blocks in `theme.css`), implement both modes on the landing page using the same approach as the rest of the app.

## Design Direction

Aim for a **refined European financial tech aesthetic** that feels confident, technical, and trustworthy. The visual language must be consistent with the app dashboard — this is a product landing page, not a disconnected marketing site.

- **Colors**: Driven entirely by `theme.css` tokens. Do not hardcode any hex values.
- **Typography**: Use whatever font stack is defined in the theme. If the theme does not specify display fonts, pair a bold condensed or geometric display font (e.g. Barlow Condensed, DM Serif Display) for hero headlines with the body font already used in the app.
- **Contrast**: Ensure high contrast between text and backgrounds — this is a financial product, legibility is non-negotiable.
- **Textures**: Subtle background textures are welcome — faint grid lines, a noise grain overlay, or geometric patterns — as long as they complement the existing brand colors.
- **Animations**: Smooth scroll reveals via Intersection Observer, a pulsing "live" indicator for real-time payments, number counters on key stats, and purposeful hover states. Keep animations professional, not decorative noise.
- **Avoid**: Purple gradients, generic SaaS aesthetics, any color values not grounded in the `theme.css` token system.

---

## Page Structure

### 1. Hero Section

**Headline (large, bold, memorable):**

> "Your Payment Gateway. Your Data. Your Rules."

or alternatively:

> "Stop Paying the American Tax on European Payments"

**Subheadline:**

> GetBlitz is an open-source SEPA Instant Transfer gateway that runs on your infrastructure — zero middlemen, zero tracking, zero lock-in. Built for European businesses that value sovereignty.

**Two CTAs side by side:**

- Primary: `Get Started — €10/month` (links to SaaS signup)
- Secondary: `Self-Host for Free` (links to GitHub repo: https://github.com/getblitz-io/getblitz)

**Beneath CTAs:** A small "trust bar" — logos or badges reading: 🇪🇺 SEPA Instant | 🔐 Self-Hosted | ⚡ Real-Time WebSockets | 🧩 MIT Licensed

---

### 2. Problem Section — "The Problem with US Payment Processors"

Use a two-column layout or an editorial-style block with bold pull quotes.

Content to convey:

- Stripe, PayPal, and Square are American companies subject to US law — meaning your European customer data could be handed to US authorities under the CLOUD Act
- These processors charge 1.4%–2.9% + fixed fees on every transaction, eating into margins
- You don't own the settlement flow, the data, or the relationship
- GDPR compliance becomes harder when data flows across the Atlantic
- European companies deserve European infrastructure

Use a stark visual contrast here — maybe a split panel: "Their way" (data flows to US servers, high fees, lock-in) vs "Your way" (data stays with you, flat pricing, open source). Draw all contrast colours from the theme token system.

---

### 3. Features Section — "Everything You Need, Nothing You Don't"

Present features in a clean grid (3-column or 2-column depending on layout). Each feature should have an icon, title, and 1–2 sentences of description. Use card styles from `packages/ui/` if available.

**Feature cards to include:**

🏦 **SEPA Instant Transfers**
Accept real-time EUR bank transfers across all 36 SEPA countries — funds settle in under 10 seconds, directly to your bank account.

⚡ **Real-Time WebSocket Notifications**
Know the moment a payment lands. GetBlitz uses Socket.io to push live payment events to your app — no polling, no delays.

🔐 **Full Data Sovereignty**
Your database. Your server. Your rules. No third party ever touches your transaction data or customer information.

🏢 **Multi-Tenant Architecture**
Manage multiple organizations, bank accounts, and API keys from a single dashboard — ideal for agencies, SaaS platforms, and marketplace operators.

📱 **Embeddable JavaScript SDK**
Drop a single `<script>` tag into any website. The lightweight GetBlitz widget handles the payment UI, QR code display, and real-time status updates automatically.

🧪 **Built-In Test Mode**
A mock bank simulator is included out of the box so you can develop and test your integration without touching real money.

🔒 **Enterprise-Grade Security**
HMAC-SHA256 webhook verification, rotatable API keys, configurable Redis-backed rate limiting, strict CORS enforcement, and ACID-compliant database transactions.

🔗 **Webhook Events**
Receive `payment.success`, `payment.partial`, `payment.failed`, and `payment.expired` events with full payload details — integrate with any backend.

🔌 **Pluggable Bank Providers**
Connect your Qonto or Revolut business account today, or implement a custom provider using the open BankProvider interface.

🧾 **Smart Invoice Management**
Generate, send, and track professional invoices directly from the dashboard. Automatically reconcile incoming SEPA transfers with open invoices by matching payment references, eliminating manual bookkeeping.

👥 **Built-in Customer Directory**
Keep all your customer details and payment histories in one secure, GDPR-compliant place. Easily associate transactions and invoices with specific clients without syncing data to external CRMs.

---

### 4. How It Works — "Payments in 10 Steps, Zero Friction"

Display as a numbered flow diagram or horizontal stepper with icons:

1. Merchant calls the `/api/v1/challenge` endpoint with the amount
2. GetBlitz returns a session ID, payment URL, and reference ID
3. Customer is shown a payment page with an EPC-QR code
4. Customer scans QR with their banking app
5. Customer completes a SEPA Instant Transfer
6. Bank sends a webhook to GetBlitz
7. GetBlitz matches the transfer by reference ID
8. Payment status is updated to PAID in the database
9. Redis publishes a real-time event
10. Your app receives the `onSuccess` callback — done!

Include a code snippet of the SDK integration:

```html
<script src="https://cdn.yourdomain.com/getblitz.js"></script>
<script>
  const payment = new GetBlitz({
    sessionId: "sess_123",
    apiUrl: "https://pay.yourdomain.com",
    wssUrl: "wss://wss.yourdomain.com",
  });

  payment.mount("#payment-container");

  payment
    .on("onSuccess", (token) => {
      // Payment confirmed — fulfil the order
    })
    .on("onExpired", () => {
      // Session expired — prompt user to retry
    });
</script>
```

Style the code block using theme surface/card tokens for the background, with syntax highlighting and a copy button.

---

### 5. Hosting Options — "Choose How You Run It"

**Section headline:** "Your Infrastructure, or Ours"

Present three paths as cards or tabs:

#### ☁️ Managed SaaS — €10/month

The easiest way to get started. We host and manage everything for you.

- ✅ Up and running in minutes
- ✅ 2 bank connections included
- ✅ Additional banks: +€3/month each
- ✅ Automatic updates and monitoring
- ✅ Dashboard access
- ✅ Email support
- CTA: `Start Free Trial`

#### 🖥️ Self-Host on DigitalOcean (One-Click)

Deploy to your own DigitalOcean account in a single click.

- ✅ Full control of your data
- ✅ No monthly SaaS fee
- ✅ Pre-configured Docker environment
- ✅ Scales to your needs
- CTA: `Deploy to DigitalOcean`

#### 🐳 Self-Host with Docker Compose

Run locally or on any server with Docker support.

- ✅ PostgreSQL + Redis included
- ✅ All services pre-configured
- ✅ Ideal for on-premise or private cloud
- CTA: `View Docker Setup`

Also mention Render.com one-click deploy and Vercel for the Next.js dashboard as additional options.

---

### 6. Supported Banks Section

**Headline:** "Connect Your European Business Bank"

Show a table or card grid of supported providers:

| Provider             | Auth Method       | Best For                      |
| -------------------- | ----------------- | ----------------------------- |
| **Qonto**            | OAuth2            | SMEs & startups across Europe |
| **Revolut Business** | Certificate-based | Tech-forward businesses       |
| **Custom Provider**  | Your choice       | Any bank with webhook support |

Emphasize the extensibility: "Don't see your bank? Implement our open `BankProvider` interface in TypeScript and submit a PR."

---

### 7. Privacy & Sovereignty Section — "Built for Europe, by Europe"

This section should feel emotionally resonant and values-driven. Use large typography, minimal layout.

**Headline:** "Take Back Control of Your Financial Data"

Content blocks (could be presented as large stat/quote cards):

- 🇪🇺 **GDPR-native by design** — When you self-host GetBlitz, your transaction data never leaves your jurisdiction. No data processing agreements to negotiate with a US company.
- 🔒 **No surveillance capitalism** — GetBlitz has no analytics, no telemetry, no third-party trackers. It's your software, running on your terms.
- ⚖️ **Open Source, MIT Licensed** — Audit every line. Fork it. Modify it. You're never at the mercy of a pricing change or a product sunset.
- 🏦 **Direct bank relationships** — You connect directly to your bank. GetBlitz is middleware, not a money transmitter. Funds flow straight to your account.
- 🌍 **36 SEPA countries** — From Lisbon to Tallinn, any business bank account in the SEPA zone can receive instant EUR transfers.

---

### 8. Pricing Section

**Headline:** "Simple, Transparent Pricing"

**SaaS Plan — €10/month**

- Dashboard & API access
- 2 bank connections included
- Real-time WebSocket notifications
- Embeddable SDK
- HMAC webhook security
- Email support
- Additional bank connections: **+€3/month each**

**Self-Hosted — Free Forever**

- Everything open source (MIT)
- No seat limits, no transaction fees
- Community support via GitHub
- You handle hosting & ops

Add a small note: "No transaction fees. No percentage cuts. No hidden costs. You pay a flat monthly fee — or nothing at all."

---

### 9. Quick Start / CTA Section

**Headline:** "Up and Running in Under 5 Minutes"

Show a terminal-style animated block with the core setup steps:

```bash
# Clone the repo
git clone https://github.com/getblitz-io/getblitz.git

# Install dependencies
pnpm install

# Start infrastructure
docker compose up -d

# Setup database
pnpm db:push

# Start all services
pnpm dev
```

Then two large CTAs:

- `Star on GitHub` (with star count)
- `Start SaaS Trial — €10/month`

---

### 10. Footer

Clean, minimal footer with:

- GetBlitz logo + tagline: "Open-source SEPA payments for European businesses"
- Links: GitHub, Docs, Pricing, Self-Host Guide, Changelog
- "MIT Licensed · Made in Europe 🇪🇺"
- No cookie banners (it's a static marketing page — keep it clean)

---

## Technical Implementation Notes

- The site app should use **Next.js** (same version as `apps/web`) to stay consistent with the monorepo's tech stack
- Reuse shared components from `packages/ui/` (shadcn/ui-based) wherever possible — buttons, cards, badges, etc.
- All animations should be CSS-first; use Intersection Observer for scroll-triggered reveals
- Include a sticky navigation bar that changes appearance on scroll, using theme surface tokens for the background blur effect
- Make it fully **responsive** — mobile, tablet, and desktop
- Use semantic HTML and proper ARIA roles for accessibility
- Use `next/image` for any images; avoid unnecessary client-side JS
- Add the app to the Turborepo pipeline in `turbo.json` so `pnpm build` from the root includes it

---

## Tone & Voice

- Confident and direct — this is software for professionals
- Pro-European without being political — celebrate European values of privacy, sovereignty, and craftsmanship
- Developer-friendly — don't dumb it down; the audience appreciates technical accuracy
- Anti-hype — no "revolutionary" or "game-changing" buzzwords; let the features speak
- Slightly bold and opinionated — it's okay to call out the problems with US payment processors by name
