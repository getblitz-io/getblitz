# @getblitz/shared-types

Shared TypeScript types for **GetBlitz Payment Gateway** — a self-hosted payment gateway for SEPA instant transfers across Europe.

[![npm version](https://img.shields.io/npm/v/@getblitz/shared-types.svg)](https://www.npmjs.com/package/@getblitz/shared-types)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

This package provides shared TypeScript type definitions and Zod schemas used across the GetBlitz ecosystem. It ensures type safety and consistency between the server, client SDK, and any integrations.

## Installation

```bash
npm install @getblitz/shared-types zod
# or
pnpm add @getblitz/shared-types zod
# or
yarn add @getblitz/shared-types zod
```

> **Note:** `zod` is a required peer dependency (^3.24.0).

## Usage

### API Types

Types and schemas for the GetBlitz REST API:

```typescript
import {
  CreateChallengeRequest,
  CreateChallengeRequestSchema,
  CreateChallengeResponse,
  CreateChallengeResponseSchema,
  PaymentSessionDetails,
  PaymentSessionDetailsSchema,
} from "@getblitz/shared-types";

// Validate request payload
const payload: CreateChallengeRequest = {
  amount: 500, // €5.00 in cents
  currency: "EUR",
  metadata: { orderId: "order_123" },
};

const validated = CreateChallengeRequestSchema.parse(payload);
```

### Event Types

Types for real-time payment events via WebSocket/Redis pub-sub:

```typescript
import {
  PAYMENT_EVENTS_CHANNEL,
  PaymentEvent,
  PaymentEventSchema,
  PaymentEventType,
} from "@getblitz/shared-types";

// Type-safe event handling
function handlePaymentEvent(event: PaymentEvent) {
  switch (event.type) {
    case "PAYMENT_SUCCESS":
      console.log("Payment confirmed:", event.sessionId);
      break;
    case "PAYMENT_FAILED":
      console.error("Payment failed:", event.sessionId);
      break;
    case "PAYMENT_EXPIRED":
      console.warn("Payment expired:", event.sessionId);
      break;
  }
}
```

### SDK Configuration Types

Types for configuring the GetBlitz client SDK:

```typescript
import {
  GetBlitzClientConfig,
  GetBlitzClientConfigSchema,
  GetBlitzEventCallbacks,
} from "@getblitz/shared-types";

// SDK configuration
const config: GetBlitzClientConfig = {
  sessionId: "550e8400-e29b-41d4-a716-446655440000",
  apiUrl: "https://pay.example.com",
  wssUrl: "wss://wss.example.com",
  theme: "dark",
  locale: "de-DE",
};

// Validate configuration
const validatedConfig = GetBlitzClientConfigSchema.parse(config);
```

## API Reference

### API Types

| Type                      | Description                                           |
| ------------------------- | ----------------------------------------------------- |
| `CreateChallengeRequest`  | Request payload for creating a payment challenge      |
| `CreateChallengeResponse` | Response containing session ID, reference, and URL    |
| `PaymentSessionDetails`   | Full session details for rendering the payment widget |

#### `CreateChallengeRequest`

```typescript
interface CreateChallengeRequest {
  amount: number; // Amount in cents (e.g., 500 = €5.00)
  currency?: "EUR" | "USDC"; // Currency (default: EUR)
  bankAccountId?: string; // Specific bank account UUID
  metadata?: Record<string, string>; // Optional merchant metadata
}
```

#### `CreateChallengeResponse`

```typescript
interface CreateChallengeResponse {
  sessionId: string; // UUID of the payment session
  referenceId: string; // Bank reference (max 35 chars)
  paymentUrl: string; // URL to redirect customer
  expiresAt: Date; // Session expiration time
}
```

#### `PaymentSessionDetails`

```typescript
interface PaymentSessionDetails {
  sessionId: string;
  referenceId: string;
  amountCents: number;
  currency: "EUR";
  status: "PENDING" | "PAID" | "FAILED" | "EXPIRED";
  expiresAt: Date;
  organization: {
    name: string;
  };
  bankAccount: {
    providerId: string;
    accountName: string;
    iban: string;
  };
}
```

### Event Types

| Type               | Description                                    |
| ------------------ | ---------------------------------------------- |
| `PaymentEvent`     | Real-time payment status update event          |
| `PaymentEventType` | Enum of event types (SUCCESS, FAILED, EXPIRED) |

#### `PaymentEvent`

```typescript
interface PaymentEvent {
  type: "PAYMENT_SUCCESS" | "PAYMENT_FAILED" | "PAYMENT_EXPIRED";
  referenceId: string; // Bank reference ID
  sessionId: string; // Payment session UUID
  status: "PENDING" | "PAID" | "FAILED" | "EXPIRED";
  clientToken?: string; // Proof of payment for the buyer
  timestamp: string; // ISO 8601 timestamp
}
```

### SDK Configuration Types

| Type                     | Description                            |
| ------------------------ | -------------------------------------- |
| `GetBlitzClientConfig`   | Configuration for initializing the SDK |
| `GetBlitzEventCallbacks` | Callback definitions for SDK events    |

#### `GetBlitzClientConfig`

```typescript
interface GetBlitzClientConfig {
  apiKey?: string; // Public API key (pk_live_...)
  sessionId: string; // Payment session ID (required)
  wssUrl?: string; // WebSocket server URL
  apiUrl?: string; // API base URL
  theme?: "light" | "dark" | "auto"; // Widget theme
  locale?: string; // Locale for i18n (e.g., "de-DE")
}
```

#### `GetBlitzEventCallbacks`

```typescript
interface GetBlitzEventCallbacks {
  onSuccess?: (token: string) => void; // Payment successful
  onError?: (error: Error) => void; // Payment failed
  onExpired?: () => void; // Session expired
  onCancel?: () => void; // User cancelled
}
```

### Constants

| Constant                 | Value              | Description                |
| ------------------------ | ------------------ | -------------------------- |
| `PAYMENT_EVENTS_CHANNEL` | `"payment_events"` | Redis pub/sub channel name |

## Zod Schemas

All types have corresponding Zod schemas for runtime validation:

- `CreateChallengeRequestSchema`
- `CreateChallengeResponseSchema`
- `PaymentSessionDetailsSchema`
- `PaymentEventSchema`
- `PaymentEventTypeSchema`
- `GetBlitzClientConfigSchema`

## Related Packages

- [`@getblitz/client`](https://www.npmjs.com/package/@getblitz/client) — Embeddable payment SDK for merchant integration

## Links

- [GitHub Repository](https://github.com/getblitz-io/getblitz)
- [Documentation](https://getblitz.io)
- [Report Issues](https://github.com/getblitz-io/getblitz/issues)

## License

MIT © [GetBlitz](https://getblitz.io)
