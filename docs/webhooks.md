# Webhooks

GetBlitz sends webhook notifications to merchants when payment events occur. Configure webhooks in the dashboard under **Settings > Webhooks**.

## Webhook Events

| Event             | Description                                          |
| ----------------- | ---------------------------------------------------- |
| `payment.success` | Payment completed (full amount received)             |
| `payment.partial` | Partial payment received (multi-transaction support) |
| `payment.failed`  | Payment failed                                       |
| `payment.expired` | Payment session expired                              |

## Payload Schema

All webhooks send a JSON payload with the following structure:

```json
{
  "event": "payment.success",
  "sessionId": "01234567-abcd-1234-ef56-789012345678",
  "referenceId": "GB-A9F3B2C1",
  "merchantReferenceId": "ORDER-123",
  "amountCents": 5000,
  "amountPaidCents": 5000,
  "currency": "EUR",
  "provider": "revolut",
  "clientToken": "optional-client-token",
  "timestamp": "2024-01-15T12:30:45.000Z",
  "bankAccount": {
    "connectionId": "conn-uuid",
    "connectionName": "Main Account",
    "accountName": "Business EUR Account",
    "iban": "DE89370400440532013000",
    "bic": "COBADEFFXXX"
  }
}
```

### Field Descriptions

| Field                 | Type    | Description                                                 |
| --------------------- | ------- | ----------------------------------------------------------- |
| `event`               | string  | Event type (see above)                                      |
| `sessionId`           | uuid    | Payment session ID                                          |
| `referenceId`         | string  | Unique payment reference (shown to customer)                |
| `merchantReferenceId` | string? | Your reference ID (if provided when creating the challenge) |
| `amountCents`         | integer | Total amount requested in cents                             |
| `amountPaidCents`     | integer | Amount paid so far in cents                                 |
| `currency`            | string  | Currency code (EUR)                                         |
| `provider`            | string  | Bank provider ID                                            |
| `clientToken`         | string? | Token for client-side verification                          |
| `timestamp`           | string  | ISO 8601 timestamp                                          |
| `bankAccount`         | object  | Bank account details                                        |

## Multi-Transaction Payments

GetBlitz supports **split payments** where multiple people can contribute to a single payment session (e.g., friends splitting a restaurant bill).

### How It Works

1. Create a payment challenge for the total amount
2. Each person makes a partial payment via bank transfer
3. GetBlitz sends `payment.partial` webhooks as each payment arrives
4. When `amountPaidCents >= amountCents`, GetBlitz marks the session as PAID and sends `payment.success`

### Example Flow

```
Session created: amountCents = 6000 (€60.00)

├── Transaction 1: €25.00 → payment.partial (amountPaidCents: 2500)
├── Transaction 2: €20.00 → payment.partial (amountPaidCents: 4500)
└── Transaction 3: €15.00 → payment.success (amountPaidCents: 6000) ✓
```

## Signature Verification

All webhooks include an HMAC-SHA256 signature in the `X-GetBlitz-Signature` header.

### Verifying the Signature

```typescript
import { createHmac } from "crypto";

function verifyWebhook(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  const expectedSignature = createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  return signature === expectedSignature;
}

// Configure Express to retain the raw body for signature verification
app.use(
  express.json({
    verify: (req, _res, buf) => {
      // @ts-expect-error - extending request
      req.rawBody = buf;
    },
  }),
);

// Usage in your webhook handler
app.post("/webhook", (req, res) => {
  const signature = req.headers["x-getblitz-signature"];
  // Use the raw request body for accurate signature verification
  // JSON.stringify(req.body) may alter whitespace or key order
  const payload = (req as typeof req & { rawBody: Buffer }).rawBody.toString();

  if (!verifyWebhook(payload, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(401).send("Invalid signature");
  }

  // Process the webhook
  const { event, sessionId, amountPaidCents } = req.body;

  switch (event) {
    case "payment.success":
      // Mark order as paid
      break;
    case "payment.partial":
      // Update order with partial payment status
      break;
    case "payment.expired":
      // Handle expired payment
      break;
  }

  res.status(200).send("OK");
});
```

## Retry Policy

Failed webhook deliveries are retried with exponential backoff:

- Initial retry: 5 seconds
- Maximum retries: 5
- Maximum delay: 1 hour

Webhooks are considered failed if they:

- Return a non-2xx status code
- Time out (30 second limit)
- Fail to connect
