# GetBlitz Payment Gateway

A self-hosted payment gateway that supports both **Crypto (EVM)** and **Fiat (SEPA)** payments with real-time WebSocket notifications.

## Features

- 🏦 **Hybrid Payments** - Accept both crypto (USDC on EVM chains) and fiat (SEPA Instant via Monerium)
- 🔐 **Self-Hosted** - Full data sovereignty with your own database and infrastructure
- ⚡ **Real-time** - WebSocket notifications for instant payment confirmations
- 🏢 **Multi-tenant** - Organization-based access with API key management
- 📱 **Embeddable SDK** - Lightweight JavaScript widget for merchant integration
- 🔒 **Secure** - HMAC webhook verification, rate limiting, and structured logging

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

```bash
# Copy the example environment file
cp env.example .env

# Edit .env with your configuration
```

### 3. Start Infrastructure

```bash
# Start MySQL and Redis
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
# Start all services (Next.js + WSS)
pnpm dev

# Or start individually:
pnpm dev:next  # Next.js dashboard + API
pnpm dev:wss   # WebSocket server
```

The dashboard will be available at http://localhost:3000

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Infrastructure                           │
├─────────────┬─────────────────────────────────────────┬─────────┤
│   MySQL     │              Redis                       │         │
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
│   Monerium    │────────────┘            │   Merchant    │
│   Webhook     │                         │   Website     │
└───────────────┘                         └───────────────┘
```

## Project Structure

```
getblitz/
├── apps/
│   ├── web/              # Dashboard + API routes
│   └── wss/                 # WebSocket server
├── packages/
│   ├── api/                 # tRPC routers, utilities, Redis
│   ├── auth/                # Better Auth configuration
│   ├── database/            # Prisma schema and client
│   ├── shared-types/        # TypeScript interfaces
│   ├── ui/                  # Shared UI components
│   └── getblitz-client/     # Embeddable payment SDK
└── scripts/
    └── e2e-test.ts          # End-to-end test script
```

## API Reference

### Create Payment Challenge

```bash
POST /api/v1/challenge
Authorization: Bearer <API_KEY>
Content-Type: application/json

{
  "amount": 500,       # Amount in cents (€5.00)
  "currency": "EUR",   # EUR or USDC
  "bankAccountId": "uuid" # Optional: specific bank account
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

The gateway supports Monerium webhooks for fiat payment processing:

```
POST /api/webhooks/monerium
X-Monerium-Signature: <HMAC-SHA256>
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

  payment.on("success", (token) => {
    console.log("Payment successful:", token);
  });
</script>
```

## Configuration

### Environment Variables

| Variable                  | Description              | Required      |
| ------------------------- | ------------------------ | ------------- |
| `DATABASE_URL`            | MySQL connection string  | ✅            |
| `REDIS_URL`               | Redis URL for pub/sub    | ✅            |
| `AUTH_SECRET`             | Better Auth secret key   | ✅            |
| `NEXT_PUBLIC_APP_URL`     | Public app URL           | ✅            |
| `WSS_URL`                 | WebSocket server URL     | ✅            |
| `MONERIUM_WEBHOOK_SECRET` | Webhook signature secret | ⚠️ Production |
| `CRON_SECRET`             | Cron job auth secret     | ⚠️ Production |

See `env.example` for a complete list.

## Development

### Running Tests

```bash
# E2E test (requires running services)
pnpm test:e2e --api-key=sk_test_xxx
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

### Docker

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
3. **Customer** chooses payment method (Crypto/SEPA)
4. For **Crypto**: Transfers tokens to merchant wallet
5. For **SEPA**: Scans EPC-QR code with bank app
6. **Webhook** receives payment confirmation from Monerium/Chain
7. **API** updates payment status to PAID
8. **API** publishes event to Redis
9. **WSS** forwards event to connected clients
10. **SDK** triggers onSuccess callback

## Security

- **API Keys**: Secure, rotatable keys per organization
- **Webhook Verification**: HMAC-SHA256 signature validation
- **Rate Limiting**: Configurable limits via Upstash Redis
- **CORS**: Strict origin validation on WebSocket connections
- **Database**: ACID transactions for payment state updates

## License

MIT
