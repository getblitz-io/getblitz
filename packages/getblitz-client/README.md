# @getblitz/client

Embeddable payment SDK for **GetBlitz Payment Gateway** — accept SEPA Instant Transfers across Europe with a lightweight, customizable widget.

[![npm version](https://img.shields.io/npm/v/@getblitz/client.svg)](https://www.npmjs.com/package/@getblitz/client)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@getblitz/client)](https://bundlephobia.com/package/@getblitz/client)

## Features

- 🎨 **Customizable Widget** — Light, dark, and auto themes
- ⚡ **Real-time Updates** — WebSocket-powered instant payment confirmations
- 📱 **EPC QR Code** — Bank-scannable QR code for SEPA transfers
- 🔒 **Type-safe** — Full TypeScript support
- 📦 **Lightweight** — Minimal bundle size with tree-shaking support
- 🌍 **i18n Ready** — Locale support for multi-language deployments

## Installation

### NPM/Yarn/pnpm

```bash
npm install @getblitz/client
# or
pnpm add @getblitz/client
# or
yarn add @getblitz/client
```

### CDN

```html
<script src="https://unpkg.com/@getblitz/client/dist/getblitz.umd.cjs"></script>
```

## Quick Start

### 1. Create a Payment Session (Server-side)

First, create a payment session via the GetBlitz API:

```bash
curl -X POST https://pay.yourdomain.com/api/v1/challenge \
  -H "Authorization: Bearer sk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 2500,
    "currency": "EUR",
    "merchantReferenceId": "order-456"
  }'
```

Response:

```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "clientToken": "ey...",
  "referenceId": "GB-A9F3B2C1",
  "merchantReferenceId": "order-456",
  "paymentUrl": "https://pay.yourdomain.com/pay/550e8400-e29b-41d4-a716-446655440000",
  "expiresAt": "2024-01-15T12:15:00.000Z"
}
```

> **Tip:** Use `merchantReferenceId` to link payments to your own system (e.g., order IDs). It must be unique per organization.

### 2. Mount the Payment Widget (Client-side)

#### ES Modules

```typescript
import { GetBlitz } from "@getblitz/client";

const payment = new GetBlitz({
  sessionId: "550e8400-e29b-41d4-a716-446655440000",
  clientToken: "ey...", // From Create Challenge response
  apiUrl: "https://pay.yourdomain.com",
  wssUrl: "wss://wss.yourdomain.com",
  theme: "dark",
});

// Mount the widget to a DOM element
await payment.mount("#payment-container");

// Handle payment events
payment
  .on("onSuccess", (token) => {
    console.log("Payment successful! Token:", token);
    // Redirect to success page or verify payment server-side
    window.location.href = `/order/success?token=${token}`;
  })
  .on("onError", (error) => {
    console.error("Payment failed:", error.message);
  })
  .on("onExpired", () => {
    console.log("Payment session expired");
    // Optionally create a new session
  });
```

#### Script Tag (UMD)

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Checkout</title>
  </head>
  <body>
    <div id="payment-container"></div>

    <script src="https://unpkg.com/@getblitz/client/dist/getblitz.umd.cjs"></script>
    <script>
      const payment = new GetBlitz({
        sessionId: "550e8400-e29b-41d4-a716-446655440000",
        clientToken: "ey...",
        apiUrl: "https://pay.yourdomain.com",
        wssUrl: "wss://wss.yourdomain.com",
      });

      payment.mount("#payment-container");

      payment
        .on("onSuccess", function (token) {
          alert("Payment successful!");
        })
        .on("onError", function (error) {
          alert("Payment failed: " + error.message);
        });
    </script>
  </body>
</html>
```

## API Reference

### Constructor

```typescript
new GetBlitz(config: GetBlitzClientConfig)
```

#### Configuration Options

| Option        | Type                          | Required | Description                                |
| ------------- | ----------------------------- | -------- | ------------------------------------------ |
| `sessionId`   | `string`                      | ✅       | Payment session UUID                       |
| `clientToken` | `string`                      | ✅       | Auth token from Challenge response         |
| `apiUrl`      | `string`                      | ❌       | API base URL (defaults to current origin)  |
| `wssUrl`      | `string`                      | ❌       | WebSocket URL (defaults to current origin) |
| `apiKey`      | `string`                      | ❌       | Public API key (pk*live*...)               |
| `theme`       | `"light" \| "dark" \| "auto"` | ❌       | Widget theme (default: system preference)  |
| `locale`      | `string`                      | ❌       | Locale for i18n (e.g., "de-DE")            |

### Methods

#### `mount(selector: string): Promise<void>`

Mounts the payment widget to the specified DOM element. The widget displays:

- Organization and payment details
- EPC QR code for bank scanning
- IBAN for manual transfer
- Real-time payment status

```typescript
await payment.mount("#payment-container");
```

#### `on<K>(event: K, callback: Callback): this`

Registers an event callback. Returns `this` for method chaining.

```typescript
payment
  .on("onSuccess", (token) => {
    /* ... */
  })
  .on("onError", (error) => {
    /* ... */
  })
  .on("onExpired", () => {
    /* ... */
  })
  .on("onCancel", () => {
    /* ... */
  });
```

#### `destroy(): void`

Cleans up the widget, disconnects WebSocket, and removes event listeners.

```typescript
payment.destroy();
```

### Events

| Event       | Callback Signature        | Description                        |
| ----------- | ------------------------- | ---------------------------------- |
| `onSuccess` | `(token: string) => void` | Payment was confirmed successfully |
| `onError`   | `(error: Error) => void`  | Payment failed                     |
| `onExpired` | `() => void`              | Payment session expired            |
| `onCancel`  | `() => void`              | User cancelled the payment         |

## How It Works

```
┌─────────────┐      ┌──────────────┐      ┌───────────────┐
│   Merchant  │      │   GetBlitz   │      │   Customer's  │
│   Website   │      │    Widget    │      │   Bank App    │
└──────┬──────┘      └──────┬───────┘      └───────┬───────┘
       │                    │                      │
       │  1. Create session │                      │
       │───────────────────>│                      │
       │                    │                      │
       │  2. Mount widget   │                      │
       │───────────────────>│                      │
       │                    │                      │
       │                    │  3. Display QR code  │
       │                    │─────────────────────>│
       │                    │                      │
       │                    │  4. Scan & pay       │
       │                    │<─────────────────────│
       │                    │                      │
       │  5. onSuccess(token)                      │
       │<───────────────────│                      │
       │                    │                      │
```

1. **Create Session**: Your server creates a payment session via the GetBlitz API
2. **Mount Widget**: The SDK displays the payment widget with EPC QR code
3. **Customer Pays**: Customer scans the QR with their banking app
4. **Bank Webhook**: The bank sends a webhook to GetBlitz confirming payment
5. **Real-time Update**: WebSocket pushes the confirmation to the widget
6. **Callback Fired**: Your `onSuccess` callback receives the payment token

## Self-Hosted Configuration

When self-hosting GetBlitz, configure the SDK to point to your infrastructure:

```typescript
const payment = new GetBlitz({
  sessionId: "...",
  clientToken: "ey...",
  apiUrl: "https://pay.yourdomain.com", // Your Next.js app
  wssUrl: "wss://wss.yourdomain.com", // Your WebSocket server
});
```

For single-origin deployments where the API and WebSocket server run on the same domain, you can omit these URLs:

```typescript
const payment = new GetBlitz({
  sessionId: "...",
  clientToken: "ey...",
  // Defaults to window.location.origin
});
```

## TypeScript

Full TypeScript support is included. Import types as needed:

```typescript
import type {
  GetBlitzClientConfig,
  GetBlitzEventCallbacks,
  PaymentSessionDetails,
} from "@getblitz/client";
```

For advanced type needs, you can also import from the shared types package:

```typescript
import type { PaymentEvent } from "@getblitz/shared-types";
```

## Browser Support

- Chrome 80+
- Firefox 78+
- Safari 14+
- Edge 80+

Requires `fetch`, `WebSocket`, and ES2020 features.

## Related Packages

- [`@getblitz/shared-types`](https://www.npmjs.com/package/@getblitz/shared-types) — Shared TypeScript types and Zod schemas

## Links

- [GitHub Repository](https://github.com/getblitz-io/getblitz)
- [Documentation](https://getblitz.io)
- [Report Issues](https://github.com/getblitz-io/getblitz/issues)

## License

MIT © [GetBlitz](https://getblitz.io)
