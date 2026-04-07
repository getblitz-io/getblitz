# GetBlitz Payment Gateway

A self-hosted payment gateway for **SEPA Instant Transfers** with real-time WebSocket notifications. Built for businesses accepting online and offline EUR payments across Europe.

## Features

- 🏦 **SEPA Payments** - Accept SEPA Instant Transfers via bank integrations (Qonto, Revolut, custom providers)
- 🧾 **Invoicing** - Generate and manage invoices with integrated payment links
- 👥 **Customer Management** - Maintain customer profiles and payment history
- 🔐 **Self-Hosted** - Full data sovereignty with your own database and infrastructure
- ⚡ **Real-time** - WebSocket notifications for instant payment confirmations
- 🏢 **Multi-tenant** - Organization-based access with API key management
- 📱 **Embeddable SDK** - Lightweight JavaScript widget for merchant integration
- 🔒 **Secure** - HMAC webhook verification, rate limiting, and structured logging
- 🧪 **Test Mode** - Built-in test bank simulator for development

## Quick Start

### Prerequisites

- Node.js 22+
- pnpm 10+
- Docker & Docker Compose

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment

Each application has its own environment configuration. Create `.env` files based on the examples:

**Core Services:**

- `apps/web/.env` - Dashboard, API, Workers (`cp apps/web/.env.example apps/web/.env`)
- `apps/wss/.env` - WebSocket Server (`cp apps/wss/.env.example apps/wss/.env`)

**Development Apps:**

- `apps/demo/.env` - Demo Merchant (`cp apps/demo/.env.example apps/demo/.env`)

Key variables across apps:

- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Valkey/Redis URL for pub/sub and queues
- `AUTH_SECRET` - Better Auth secret key
- `ENCRYPTION_KEY` - 32-byte hex string for credential encryption

### 3. Start Infrastructure

```bash
# Start PostgreSQL and Valkey
docker compose up -d
```

### 4. Setup Database

```bash
# Generate Prisma client
pnpm db:generate

# Push schema to database
pnpm db:push
```

### 5. Start Development Servers

```bash
# Start all services (Next.js + WSS + Demo + Test Bank)
pnpm dev

# Or start individually:
pnpm dev:next       # Next.js dashboard + API + Workers
pnpm dev:wss        # WebSocket server
pnpm dev:demo       # Demo merchant site
pnpm dev:test-bank  # Mock bank simulator
```

The dashboard will be available at http://localhost:3000

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Monorepo (Turborepo)                      │
├───────────────┬───────────────────────────────┬─────────────┤
│  apps/web     │        packages/api           │  apps/wss   │
│ (Next.js 16)  │    (tRPC, Services, DAL)      │ (Socket.io) │
│   Dashboard,  │           ▲    ▲              │   Real-time │
│   API, Worker │           │    │              │   Events    │
│               │           │    │              │      ▲      │
└───────┬───────┴───────────┼────┼──────────────┴──────┼──────┘
        │                   │    │                     │
        ▼                   ▼    ▼                     ▼
┌───────────────┐   ┌──────────────────┐   ┌──────────────────┐
│  PostgreSQL   │   │  Bank Providers  │   │      Valkey      │
│   (Prisma)    │◄──┤ (Qonto, Revolut) │   │     (Pub/Sub)    │
└───────────────┘   └──────────────────┘   └──────────────────┘
```

## Project Structure

```
getblitz/
├── apps/
│   ├── web/                 # Dashboard, API, Workers (Next.js 16)
│   ├── wss/                 # WebSocket server (Socket.io)
│   ├── demo/                # Demo merchant site
│   └── mock-bank/           # Mock bank simulator
├── packages/
│   ├── api/                 # Core logic: tRPC, Services, Repositories
│   ├── auth/                # Authentication (Better Auth)
│   ├── bank-providers/      # Bank integration adapters & registry
│   ├── database/            # Prisma schema and client
│   ├── getblitz-client/     # Embeddable JS SDK (@getblitz/client)
│   ├── redis/               # Valkey/Redis client and pub/sub
│   ├── shared-types/        # Shared DTOs and Zod schemas
│   ├── ui/                  # UI Component library (shadcn/ui)
│   ├── validators/          # Shared validation logic
│   └── websocket/           # WebSocket shared utilities
└── tooling/                 # Configs (ESLint, Prettier, TS, Vitest)
```

## API Reference

Interactive API documentation is available at [https://app.getblitz.io/api-reference](https://app.getblitz.io/api-reference) or at your own deployment's `/api-reference` path.

### Create Payment Challenge

```bash
POST /api/v1/challenge
Authorization: Bearer <API_KEY>
Content-Type: application/json

{
  "amount": 500,           # Amount in cents (€5.00)
  "currency": "EUR",       # EUR only
  "bankAccountId": "uuid"  # Optional: specific bank account
}
```

**Response:**

```json
{
  "sessionId": "uuid",
  "clientToken": "ey...",  # Token for SDK authentication
  "referenceId": "GB-A9F3B2C1",
  "paymentUrl": "https://pay.example.com/pay/uuid",
  "expiresAt": "2024-01-01T12:15:00.000Z"
}
```

### Get Session Details

Retrieve payment session status and details.

```bash
GET /api/v1/sessions/:sessionId
Authorization: Bearer <clientToken>
Origin: https://your-merchant-site.com
```

### Webhook Events

The gateway sends webhooks to merchants for payment events:

| Event             | Description                                   |
| ----------------- | --------------------------------------------- |
| `payment.success` | Payment completed (full amount received)      |
| `payment.partial` | Partial payment received (for split payments) |
| `payment.failed`  | Payment failed                                |
| `payment.expired` | Payment session expired                       |

📚 **See [docs/webhooks.md](./docs/webhooks.md) for payload schema and signature verification.**

### SDK Integration

We provide a specialized library [`@getblitz/client`](./packages/getblitz-client/README.md) for easy integration.

1. Install the SDK:

   ```bash
   pnpm add @getblitz/client
   ```

2. Initialize and mount:

   ```typescript
   import { GetBlitz } from "@getblitz/client";

   const payment = new GetBlitz({
     sessionId: "sess_123",
     clientToken: "ey...", // From Create Challenge response
     apiUrl: "https://pay.yourdomain.com",
     wssUrl: "wss://wss.yourdomain.com",
   });

   await payment.mount("#payment-container");

   payment.on("onSuccess", (token) => {
     console.log("Payment successful:", token);
   });
   ```

## Bank Provider Integration

GetBlitz supports multiple bank providers through a pluggable adapter system.

📚 **See [docs/banks/](./docs/banks/) for detailed setup guides.**

### Supported Providers

| Provider      | Auth Type   | Description                   | Setup Guide                       |
| ------------- | ----------- | ----------------------------- | --------------------------------- |
| **Qonto**     | OAuth2      | Business banking for SMEs     | [View](./docs/banks/qonto.md)     |
| **Revolut**   | Certificate | Business banking for SMEs     | [View](./docs/banks/revolut.md)   |
| **Test Bank** | None        | Mock provider for development | [View](./docs/banks/test-bank.md) |

> **Note**: Test Bank is automatically hidden in production environments.

### Adding a Custom Provider

Bank providers implement a standard interface in `packages/bank-providers`:

```typescript
import { MyNewProvider } from "./providers/my-new-provider";

ProviderRegistry.register(MyNewProvider);
```

4. Define Zod schemas for configuration and credentials.

📚 **See [docs/banks/](./docs/banks/) for detailed setup guides.**

## Security

Getting security right is critical for a payment gateway.

📚 **See [SECURITY.md](./SECURITY.md) for full details on our security practices.**

- **API Keys**: Secure, rotatable keys per organization
- **Client Tokens**: Short-lived sessions with strict Origin validation
- **Webhook Verification**: HMAC-SHA256 signature validation
- **Rate Limiting**: Configurable limits via Valkey/Redis
- **CORS**: Strict origin validation on REST & WebSocket connections
- **Database**: ACID transactions for payment state updates

## Deployment

### Workers & Cron Jobs

Background tasks, such as **session expiration**, are handled by a worker process integrated into the Next.js application using `apps/web/src/instrumentation.ts`.

When deploying to environments like Vercel or self-hosted Docker, ensure the application is started correctly to initialize these workers.

### One-Click Deploy

[![Deploy to DigitalOcean](https://www.deploytodo.com/do-btn-blue.svg)](https://cloud.digitalocean.com/apps/new?repo=https://github.com/getblitz-io/getblitz/tree/main&refcode=0eb3774edd76)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/getblitz-io/getblitz)

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

## License

MIT
