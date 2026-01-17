# Test Bank Integration Guide

The Test Bank is a mock banking provider designed for local development and testing. It simulates a real bank's OAuth2 flow and API without requiring actual bank credentials.

> **Important**: The Test Bank provider is automatically hidden in production environments (`APPLICATION_ENV === 'production'`).

## Overview

The Test Bank provider is useful for:

- Local development without real bank credentials
- End-to-end testing of payment flows
- Demonstrating the payment gateway functionality
- CI/CD testing environments

## Understanding the Test Bank OAuth Flow

Test Bank uses a standard **redirect OAuth flow** (same as Qonto):

1. GetBlitz generates a unique callback URL for your connection
2. You configure the Base URL in GetBlitz
3. GetBlitz redirects you to Test Bank for authorization
4. After approval, Test Bank redirects back to your callback URL

## Prerequisites

To use the Test Bank, you need to run the mock bank server:

```bash
# From the project root
pnpm dev:mock-bank
```

This starts the mock bank server at `http://localhost:3003` by default.

## Configuration

When connecting Test Bank in GetBlitz:

1. Navigate to **Banks** → **Connect**
2. Select **Test Bank** as the provider
3. **Note the Callback URL** displayed in Step 1
   - This URL looks like: `http://localhost:3000/banks/callback/your-org.abc123def456`
   - The Test Bank automatically accepts this URL (no need to register it)
4. Enter the configuration:

| Field    | Default Value           | Description                           |
| -------- | ----------------------- | ------------------------------------- |
| Base URL | `http://localhost:3003` | URL where mock-bank server is running |

5. Click **Connect**
6. You'll be redirected to Test Bank's authorization page
7. Click "Authorize" to complete the flow

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
2. **Callback**: Returns an authorization code to your unique callback URL
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

### Callback URL Issues

- The Test Bank mock server accepts any callback URL, so no registration is needed
- If authorization fails, ensure the mock bank server is running

## Limitations

The Test Bank is for development only and has these limitations:

- No persistent storage (data is lost on restart)
- No signature verification on webhooks
- Fixed test accounts only
- Not available in production environments
