---
id: integration-guide
title: SDK Integration Guide
sidebar_position: 1
---

# Integrating GetBlitz

GetBlitz provides a lightweight JavaScript SDK designed to make adding SEPA payment to your frontend effortless.

## 1. Create a Payment Challenge

Before initializing the SDK, your backend server must securely create a **Payment Challenge** by calling the GetBlitz REST API. This creates a payment session and returns a `clientToken` which the frontend SDK needs to authenticate.

```bash
POST /api/v1/challenge
Authorization: Bearer <YOUR_API_KEY>
Content-Type: application/json

{
  "amount": 5000,          # 50.00 EUR in cents
  "currency": "EUR"
}
```

This will respond with a `sessionId` and a short-lived `clientToken`. Pass these to your frontend.

## 2. Install the SDK

The easiest way to integrate GetBlitz into your frontend is via our `@getblitz/client` package.

```bash
pnpm add @getblitz/client
# or npm install @getblitz/client
# or yarn add @getblitz/client
```

## 3. Initialize and Mount

After you create a payment challenge using the backend API and receive your `clientToken` and `sessionId` on your frontend, you can initialize the SDK.

```typescript
import { GetBlitz } from "@getblitz/client";

// Initialize the client
const payment = new GetBlitz({
  sessionId: "sess_123", // From Create Challenge response
  clientToken: "ey...", // From Create Challenge response
  apiUrl: "https://pay.yourdomain.com",
  wssUrl: "wss://wss.yourdomain.com",
});

// Mount it to a container in your DOM
await payment.mount("#payment-container");

// Listen for the success event for real-time confirmation
payment.on("onSuccess", (token) => {
  console.log("Payment successful! Proof token:", token);
  // Redirect your customer to a success page
});

payment.on("onError", (error) => {
  console.error("Payment failed or expired", error);
});
```

## 4. Server-Side Webhook Verification

In addition to relying on client-side WebSocket events, always verify the webhook response sent to your backend server to ensure the transaction has finalized before shipping your product or granting access.

Read more about [Webhook Verification](/webhooks).
