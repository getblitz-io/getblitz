# Test Bank Integration Guide

The Test Bank is a mock banking provider designed for local development and testing. It simulates a real bank's OAuth2 flow and API without requiring actual bank credentials.

> **Important**: The Test Bank provider is automatically hidden in production environments (`APPLICATION_ENV === 'production'`).

## Overview

The Test Bank provider is useful for:

- Local development without real bank credentials
- End-to-end testing of payment flows
- Demonstrating the payment gateway functionality
- CI/CD testing environments

## Prerequisites

To use the Test Bank, you need to run the mock bank server:

```bash
# From the project root
pnpm dev:mock-bank
```

This starts the mock bank server at `http://localhost:3003` by default.

## Configuration

When connecting Test Bank in GetBlitz:

| Field    | Default Value           | Description                           |
| -------- | ----------------------- | ------------------------------------- |
| Base URL | `http://localhost:3003` | URL where mock-bank server is running |

## Test Accounts

The Test Bank provides the following pre-configured test accounts:

| Account ID     | Name                  | IBAN                   | Currency |
| -------------- | --------------------- | ---------------------- | -------- |
| `test-acc-001` | Test Business Account | `TEST1234567890123456` | EUR      |
| `test-acc-002` | Test Savings Account  | `TEST9876543210987654` | EUR      |
| `test-acc-003` | Test EUR Account      | `TEST5555666677778888` | EUR      |

## OAuth2 Flow

The Test Bank simulates a complete OAuth2 flow:

1. **Authorization**: Redirects to `http://localhost:3003/oauth/authorize`
2. **Callback**: Returns an authorization code to your callback URL
3. **Token Exchange**: Exchanges the code for access/refresh tokens

Default OAuth2 credentials (hardcoded in adapter):

- **Client ID**: `test-client`
- **Client Secret**: `test-secret`

## Simulating Payments

The mock bank server provides endpoints to simulate incoming payments:

### Create a Test Transaction

```bash
curl -X POST http://localhost:3003/api/transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{
    "amount": 100.00,
    "currency": "EUR",
    "reference": "GB-ABCD1234",
    "bank_account_id": "test-acc-001"
  }'
```

This will trigger a webhook to your GetBlitz instance if webhooks are configured.

## Webhook Format

Test Bank webhooks follow the same format as Qonto for compatibility:

```json
{
  "id": "evt_123456",
  "type": "v1/transactions",
  "data": {
    "id": "txn_123456",
    "amount": 100.0,
    "currency": "EUR",
    "status": "completed",
    "reference": "GB-ABCD1234",
    "note": "Payment for order GB-ABCD1234",
    "transaction_id": "txn_123456",
    "bank_account_id": "test-acc-001",
    "side": "credit",
    "operation_type": "transfer"
  }
}
```

## Reference ID Format

The Test Bank expects payment references to follow the GetBlitz format:

```
GB-XXXXXXXX
```

Where `XXXXXXXX` is an 8-character alphanumeric code (e.g., `GB-ABCD1234`).

## Development Workflow

1. Start the mock bank server:

   ```bash
   pnpm dev:mock-bank
   ```

2. Start GetBlitz:

   ```bash
   pnpm dev
   ```

3. Connect Test Bank in your organization's bank settings

4. Create a payment in your application

5. Simulate a payment using the mock bank's transaction endpoint

6. Verify the payment is marked as completed in GetBlitz

## Troubleshooting

### Connection Fails

- Ensure the mock bank server is running at the configured Base URL
- Check that nothing else is using port 3003

### Webhooks Not Working

- Verify GetBlitz is accessible from localhost
- Check the webhook URL configured in the connection

### Token Exchange Fails

- The mock bank accepts any authorization code
- Ensure you're calling the correct token endpoint: `/api/oauth/token`

## Limitations

The Test Bank is for development only and has these limitations:

- No persistent storage (data is lost on restart)
- No signature verification on webhooks
- Fixed test accounts only
- Not available in production environments
