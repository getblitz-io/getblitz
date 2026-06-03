# GetBlitz Payment Gateway

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://github.com/getblitz-io/getblitz/actions/workflows/ci.yml/badge.svg)](https://github.com/getblitz-io/getblitz/actions)
[![npm version](https://badge.fury.io/js/%40getblitz%2Fclient.svg)](https://badge.fury.io/js/%40getblitz%2Fclient)

**What is it?**  
A self-hosted payment gateway for **SEPA Instant Transfers** with real-time WebSocket notifications.

**Who is it for?**  
Built for businesses accepting online and offline EUR payments across Europe that demand full data sovereignty.

**Why use it over Stripe or PayPal?**  
Save on processing fees with direct bank-to-bank transfers, achieve _instant_ settlements (funds arrive in seconds, not days), and completely own your payment infrastructure without vendor lock-in.

[**Interactive Demo 🚀**](https://app.getblitz.io/demo) - Try the "sandbox" payment flow right now without installing anything!

## Features

- 🏦 **SEPA Payments** - Accept SEPA Instant Transfers via bank integrations (Qonto, Revolut, Wise, custom providers)
- 🔌 **WooCommerce Integration** - WordPress e-commerce plugin ([WordPress.org Directory](https://wordpress.org/plugins/getblitz-payment-gateway) / [GitHub Repository](https://github.com/getblitz-io/wp-getblitz-payment-gateway))
- 🧾 **Invoicing** - Generate and manage invoices with integrated payment links
- 👥 **Customer Management** - Maintain customer profiles and payment history
- 🔐 **Self-Hosted** - Full data sovereignty with your own database and infrastructure
- ⚡ **Real-time** - WebSocket notifications for instant payment confirmations
- 🏢 **Multi-tenant** - Organization-based access with API key management
- 📱 **Embeddable SDK** - Lightweight JavaScript widget for merchant integration
- 🔒 **Secure** - HMAC webhook verification, rate limiting, and structured logging
- 🧪 **Test Mode** - Built-in test bank simulator for development

## How it Works

1. **Customer Checkout:** Your customer selects GetBlitz at checkout.
2. **Scan & Pay:** They are presented with a SEPA QR code, which they scan with their mobile banking app.
3. **Instant Settlement:** The bank instantly transfers the EUR amount to your connected business bank account.
4. **Real-Time Notification:** GetBlitz detects the incoming bank transaction and instantly notifies your backend via secure WebSockets and Webhooks.

## Comparison

| Feature              | GetBlitz                                         | Stripe / traditional gateways |
| :------------------- | :----------------------------------------------- | :---------------------------- |
| **Transaction Fees** | **0%** (you only pay your bank's fixed SEPA fee) | 1.5% + €0.25 (varies)         |
| **Settlement Time**  | **Instant (10 seconds)**                         | 3 - 7 Business Days           |
| **Data Ownership**   | **100% Yours** (Self-Hosted)                     | Held by third party           |
| **Chargebacks**      | **Irreversible SEPA transfers**                  | High risk and fees            |

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

## Running Tests

GetBlitz includes both unit/integration tests and a robust End-to-End (E2E) testing framework.

### 1. Unit & Integration Tests (Vitest)

Unit and integration tests are powered by Vitest. To run all tests or target a specific package:

```bash
# Run all vitest tests in the monorepo
pnpm test

# Run tests for a specific package (e.g. core api logic)
pnpm --filter @getblitz/api test
```

### 2. End-to-End Tests (Playwright)

E2E browser, tRPC, and REST API tests are powered by Playwright. They run against a dedicated, isolated test database (`getblitz_test`) and an isolated test server port (`3005`) to prevent port conflicts and database unique constraint collisions.

**Prerequisites** (one-time local setup):

1. Start infrastructure: `docker compose up -d` (Postgres on `:5432`, Valkey on `:6380`)
2. Create the test database if it does not exist yet:
   ```bash
   docker exec getblitz-postgres psql -U app -d postgres -c "CREATE DATABASE getblitz_test;"
   ```
3. Install Playwright browsers once (required before the first E2E run):
   ```bash
   pnpm --filter @getblitz/web test:e2e:install
   ```

```bash
# Run all Playwright E2E tests locally
pnpm --filter @getblitz/web test:e2e

# Run with Playwright UI mode for interactive debugging
pnpm --filter @getblitz/web test:e2e:ui

# Debug a specific test suite
pnpm --filter @getblitz/web test:e2e -- e2e/tests/api.spec.ts

# Portal UI tests (dashboard, customers, banks, payments, etc.)
pnpm --filter @getblitz/web test:e2e -- e2e/tests/portal
pnpm --filter @getblitz/web test:e2e -- e2e/tests/portal/payments/simulate.spec.ts
```

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

## Documentation

Comprehensive documentation for GetBlitz, including API references, SDK setup instructions, webhook schemas, and bank provider integrations, is available at our official documentation portal:

**👉 [https://docs.getblitz.io](https://docs.getblitz.io)**

### What you'll find there:

- **API Reference**: Detailed endpoints for payment challenges and sessions.
- **Webhook Events**: Payload schemas and signature verification guides.
- **SDK Integration**: How to use the `@getblitz/client` library.
- **WooCommerce Plugin**: How to install and configure the WordPress/WooCommerce plugin.
- **Bank Providers**: Setup guides for Qonto, Revolut, Wise, and the mock Test Bank.
- **Custom Providers**: Instructions on how to build and register your own bank integration adapter.

_(The documentation site is built with Docusaurus and its source code can be found in the [`apps/docs`](./apps/docs) directory of this repository.)_

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
