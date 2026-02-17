# Security Policy

GetBlitz takes security seriously. This document outlines the security measures and best practices implemented in the GetBlitz Payment Gateway.

## 1. Authentication & Authorization

### Merchant API Checks

- **API Keys**: All server-to-server requests (e.g., creating payment challenges) require a valid `Bearer` token (API Key).
- **Organization Scoping**: API keys are tied to specific organizations. All resources (payments, configurations) are isolated by organization ID.
- **Key Rotation**: API keys can be rotated via the dashboard (planned).

### Client SDK Security

- **Session Tokens**: The client SDK does not use the Merchant API Key. Instead, it uses a short-lived `clientToken` returned by the `POST /api/v1/challenge` endpoint.
- **Origin Validation**:
  - The API strictly enforces `Origin` header checks for all client-facing endpoints (e.g., `GET /api/v1/sessions/:sessionId`).
  - Requests must originate from a domain whitelisted in the Organization's settings.
  - This prevents malicious sites from embedding your payment form or hijacking sessions.

## 2. Data Protection

### Credential Storage

- **Bank Credentials**: Sensitive information (bank API keys, certificates, passwords) is **never** stored in plain text.
- **Encryption**: We use AES-256-GCM encryption for storing provider credentials in the database.
- **Decryption**: Credentials are decrypted only in memory when establishing a connection to the bank provider.

### Webhook Security

- **HMAC Signatures**: All webhooks sent to merchants are signed using HMAC-SHA256 with a unique webhook secret.
- **Verification**: Merchants are strongly encouraged to verify the signature of every incoming webhook to prevent replay attacks and spoofing.
- **Payload Validation**: Webhook payloads follow a strict schema to ensure processing integrity.

## 3. Infrastructure Security

### Rate Limiting

- **Redis-backed Limiting**: We implement sliding window rate limiting on public endpoints to prevent abuse and DDoS attacks.
- **Headers**: Responses include standard `X-RateLimit-*` headers to inform clients of their current usage.

### Input Validation

- **Schema Validation**: All API inputs and outputs are strictly validated using `Zod` schemas.
- **Sanitization**: Inputs are sanitized to prevent injection attacks (SQLi, XSS).

### Network Security

- **CORS Policy**: Strict Cross-Origin Resource Sharing (CORS) policies are applied to client-facing endpoints.
- **WebSocket Security**: WebSocket connections also enforce origin validation and require a valid `clientToken` and `sessionId` during the handshake.

## 4. Payment Flow Security

- **Session Expiry**: Payment sessions have a configurable expiration time to prevent "zombie" sessions.
- **State Machine**: Payments follow a strict state machine (PENDING -> PAID | FAILED | EXPIRED) to prevent invalid transitions.
- **Idempotency**: Critical operations are designed to be idempotent where possible.

## Reporting Vulnerabilities

If you discover a security vulnerability, please do not open a public issue. Instead, please email security@getblitz.io (or the repository maintainer) with a description of the issue.
