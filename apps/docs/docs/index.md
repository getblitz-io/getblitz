---
id: intro
title: GetBlitz Documentation
sidebar_position: 1
slug: /
---

# Welcome to GetBlitz

**What is it?**  
A self-hosted payment gateway for **SEPA Instant Transfers** with real-time WebSocket notifications.

**Why use it over Stripe or PayPal?**  
Save on processing fees with direct bank-to-bank transfers, achieve _instant_ settlements (funds arrive in seconds, not days), and completely own your payment infrastructure without vendor lock-in.

---

## 🚀 Features

- 🏦 **SEPA Payments** - Accept SEPA Instant Transfers via bank integrations
- 🧾 **Invoicing** - Generate and manage invoices with integrated payment links
- ⚡ **Real-time** - WebSocket notifications for instant payment confirmations
- 🔐 **Self-Hosted** - Full data sovereignty with your own database and infrastructure
- 📱 **Embeddable SDK** - Lightweight JavaScript widget for merchant integration

## ⚙️ How it Works

1. **Customer Checkout:** Your customer selects GetBlitz at checkout.
2. **Scan & Pay:** They are presented with a SEPA QR code, which they scan with their mobile banking app.
3. **Instant Settlement:** The bank instantly transfers the EUR amount to your connected business bank account.
4. **Real-Time Notification:** GetBlitz detects the incoming bank transaction and instantly notifies your backend via secure WebSockets and Webhooks.

---

## 👨‍💻 For Developers

Whether you are extending the core GetBlitz platform, or simply integrating it into your application checkout flow, we provide the tools you need.

### Integration Guides

Learn how to implement GetBlitz into your frontend application with our official SDK and securely receive real-time webhook events on your backend.

- [WooCommerce Integration](/woocommerce)
- [SDK Integration Guide](/integration-guide)
- [Webhook Events & Verification](/webhooks)

### API Reference

If you're interacting with the gateway directly, our full REST API (including Endpoints, Authentication headers, and Request/Response schemas) is documented interactively.

- 📚 [**Interactive REST API Reference**](https://app.getblitz.io/api-reference)

> Want to see how the platform is built or deploy it yourself? Check out our [Main GitHub Repository](https://github.com/getblitz-io/getblitz) for the Quick Start guide and architecture diagrams.

---

## 🏦 Bank Providers Admin

GetBlitz supports multiple bank providers through a pluggable adapter system. If you are self-hosting GetBlitz, use these guides to connect your bank account directly to the gateway:

- [Qonto Integration](/banks/qonto) - Best for SMEs & startups in France
- [Revolut Business Integration](/banks/revolut) - Certificate-based authentication for tech-forward businesses
- [Wise Integration](/banks/wise) - Personal API token for SMBs already using Wise multi-currency balances
- [Test Bank](/banks/test-bank) - Built-in mock provider for safe local development
