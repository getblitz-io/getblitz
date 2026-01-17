# GetBlitz Payment Gateway

A self-hosted payment gateway for **SEPA Instant Transfers** with real-time WebSocket notifications. Built for businesses accepting online and offline EUR payments across Europe.

## Features

- 🏦 **SEPA Payments** - Accept SEPA Instant Transfers via bank integrations (Qonto, custom providers)
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

Create `.env` files for each app based on your configuration. Key variables include:

- `DATABASE_USER` - PostgreSQL user
- `DATABASE_PASSWORD` - PostgreSQL password
- `DATABASE_HOST` - PostgreSQL host
- `DATABASE_PORT` - PostgreSQL port
- `DATABASE_NAME` - PostgreSQL database
- `REDIS_URL` - Redis URL for pub/sub
- `AUTH_SECRET` - Better Auth secret key
- `NEXT_PUBLIC_APP_URL` - Public app URL

### 3. Start Infrastructure

```bash
# Start PostgreSQL and Redis
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
pnpm dev:next       # Next.js dashboard + API (port 3000)
pnpm dev:wss        # WebSocket server
pnpm dev:demo       # Demo merchant site (port 3002)
pnpm dev:test-bank  # Mock bank simulator (port 3003)
```

The dashboard will be available at http://localhost:3000

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Infrastructure                           │
├─────────────┬─────────────────────────────────────────┬─────────┤
│ PostgreSQL  │              Redis                       │         │
│  (Database) │           (Pub/Sub)                      │         │
└─────────────┴──────────────┬──────────────────────────┴─────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   Next.js     │    │  WebSocket    │    │   Client      │
│  Dashboard    │◄───│   Server      │◄───│    SDK        │
│   + API       │    │   (Socket.io) │    │   (GetBlitz)  │
└───────────────┘    └───────────────┘    └───────────────┘
        │                    ▲                    │
        │                    │                    │
        ▼                    │                    ▼
┌───────────────┐            │            ┌───────────────┐
│  Bank Provider│────────────┘            │   Merchant    │
│   Webhook     │                         │   Website     │
└───────────────┘                         └───────────────┘
```

## Project Structure

```
getblitz/
├── apps/
│   ├── web/                 # Dashboard + API routes (Next.js 16)
│   ├── wss/                 # WebSocket server (Socket.io)
│   ├── demo/                # Demo merchant site
│   └── test-bank/           # Mock bank simulator for development
├── packages/
│   ├── api/                 # tRPC routers, services, repositories (DI pattern)
│   ├── auth/                # Better Auth configuration
│   ├── bank-providers/      # Bank provider integrations (Qonto, test-bank)
│   ├── database/            # Prisma schema and client
│   ├── redis/               # Redis client and pub/sub
│   ├── shared-types/        # TypeScript interfaces
│   ├── ui/                  # Shared UI components (shadcn/ui)
│   ├── validators/          # Zod schemas
│   ├── websocket/           # WebSocket utilities
│   └── getblitz-client/     # Embeddable payment SDK
└── tooling/                 # ESLint, Prettier, TypeScript, Vitest configs
```

## API Reference

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
  "referenceId": "GB-A9F3B2C1",
  "paymentUrl": "https://pay.example.com/pay/uuid",
  "expiresAt": "2024-01-01T12:15:00.000Z"
}
```

### Webhook Events

The gateway receives webhooks from connected bank providers:

```
POST /api/webhooks/connection
X-Provider-Signature: <HMAC-SHA256>
```

### SDK Integration

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
      console.log("Payment successful:", token);
    })
    .on("onError", (error) => {
      console.error("Payment failed:", error);
    })
    .on("onExpired", () => {
      console.log("Payment session expired");
    });
</script>
```

## Bank Provider Integration

GetBlitz supports multiple bank providers through a pluggable adapter system.

📚 **See [docs/banks/](./docs/banks/) for detailed setup guides.**

### Supported Providers

| Provider    | Auth Type   | Description                   | Setup Guide                     |
|-------------|-------------|-------------------------------|---------------------------------|
| **Qonto**   | OAuth2      | Business banking for SMEs     | [View](./docs/banks/qonto.md)   |
| **Revolut** | Certificate | Business banking for SMEs     | [View](./docs/banks/revolut.md) |
| **Test Bank** | None        | Mock provider for development | [View](./docs/banks/test-bank.md)|

> **Note**: Test Bank is automatically hidden in production environments.

### Adding a Custom Provider

Bank providers implement a standard interface in `packages/bank-providers`:

```typescript
interface BankProvider {
  id: string;
  displayName: string;
  authType: "oauth2" | "api_key" | "certificate";
  isTestProvider: boolean;

  getSetupGuide(): string | null;
  getAuthUrl(params: AuthParams): string;
  exchangeCode(params: CodeParams): Promise<BankCredentials>;
  listAccounts(params: AccountParams): Promise<Account[]>;
  verifyAndParseWebhook(params: WebhookParams): Promise<WebhookResult>;
  createWebhook(params: WebhookCreateParams): Promise<WebhookConfig>;
}
```

## Configuration

### Environment Variables

| Variable              | Description            | Required      |
| --------------------- | ---------------------- | ------------- |
| `DATABASE_USER`       | PostgreSQL user        | ✅            |
| `DATABASE_PASSWORD`   | PostgreSQL password    | ✅            |
| `DATABASE_HOST`       | PostgreSQL host        | ✅            |
| `DATABASE_PORT`       | PostgreSQL port        | ✅            |
| `DATABASE_NAME`       | PostgreSQL database    | ✅            |
| `REDIS_URL`           | Redis URL for pub/sub  | ✅            |
| `AUTH_SECRET`         | Better Auth secret key | ✅            |
| `NEXT_PUBLIC_APP_URL` | Public app URL         | ✅            |
| `WSS_URL`             | WebSocket server URL   | ✅            |
| `CRON_SECRET`         | Cron job auth secret   | ⚠️ Production |

Provider-specific variables (e.g., Qonto OAuth credentials) should be configured per your bank integration.

## Development

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests for a specific package
pnpm -F @getblitz/api test
```

### Database Commands

```bash
pnpm db:push      # Push schema to database
pnpm db:migrate   # Run migrations
pnpm db:studio    # Open Prisma Studio
pnpm db:generate  # Generate Prisma client
```

### Linting & Formatting

```bash
pnpm lint         # Run ESLint
pnpm lint:fix     # Fix lint issues
pnpm format       # Check formatting
pnpm format:fix   # Fix formatting
pnpm typecheck    # Run TypeScript checks
```

## Deployment

### One-Click Deploy

[![Deploy to DigitalOcean](https://www.deploytodo.com/do-btn-blue.svg)](https://cloud.digitalocean.com/apps/new?repo=https://github.com/getblitz-io/getblitz/tree/main&refcode=0eb3774edd76)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/getblitz-io/getblitz)

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions and environment configuration.

### Docker (Manual)

```bash
# Build and run with Docker Compose
docker compose -f compose.yml up -d
```

### Vercel (Next.js)

1. Connect your repository to Vercel
2. Set the root directory to `apps/web`
3. Add environment variables
4. Deploy

### Session Expiration Cron

Set up a cron job to expire pending sessions:

```bash
# Every minute
* * * * * curl -H "Authorization: Bearer $CRON_SECRET" https://pay.yourdomain.com/api/cron/expire-sessions
```

Or use Vercel Cron by adding to `apps/web/vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/expire-sessions",
      "schedule": "* * * * *"
    }
  ]
}
```

## Payment Flow

1. **Merchant** creates a payment challenge via API
2. **Customer** is redirected to payment page
3. **Customer** scans EPC-QR code with their bank app
4. **Customer** completes SEPA Instant Transfer
5. **Bank Webhook** sends payment confirmation
6. **API** matches payment by reference ID
7. **API** updates payment status to PAID
8. **Redis** publishes event for real-time notification
9. **WSS** forwards event to connected clients
10. **SDK** triggers onSuccess callback

## Security

- **API Keys**: Secure, rotatable keys per organization
- **Webhook Verification**: HMAC-SHA256 signature validation
- **Rate Limiting**: Configurable limits via Redis
- **CORS**: Strict origin validation on WebSocket connections
- **Database**: ACID transactions for payment state updates

## License

MIT
