---
id: woocommerce
title: WooCommerce Plugin
sidebar_position: 2
---

# WooCommerce Plugin Integration

The GetBlitz WooCommerce plugin allows you to seamlessly integrate SEPA Instant Transfers into your WordPress e-commerce store.

By default, the widget will let your customers perform a direct SEPA bank transfer and immediately confirm the order within seconds. We do NOT take a cut of your sales - our solution is fully self-hostable.

## Links

- **WordPress Plugin Directory:** [WordPress.org Plugin Page](https://wordpress.org/plugins/getblitz-payment-gateway)
- **Plugin Source Code:** [GitHub Repository](https://github.com/getblitz-io/wp-getblitz-payment-gateway)
- **Latest Release:** [GitHub Releases](https://github.com/getblitz-io/wp-getblitz-payment-gateway/releases)

## Screenshots

Here's an overview of the GetBlitz payment flow and configuration in WooCommerce.

### 1. Payment Settings

Navigate to your WooCommerce settings and find "GetBlitz SEPA Instant" under the **Payments** tab.

![WooCommerce payment settings](/img/woocommerce/screenshot-1.png)

### 2. General Configuration

Configure your plugin with your store's Base API URL, WebSocket URL, and Title.

![GetBlitz SEPA Instant plugin general settings page](/img/woocommerce/screenshot-2.png)

### 3. Step-by-Step Configuration

If you get stuck, follow the built-in step-by-step configuration manual, and retrieve keys from your GetBlitz instance.

![GetBlitz SEPA Instant plugin settings with Step-by-Step configuration details](/img/woocommerce/screenshot-3.png)

### 4. Checkout Experience

Customers will see GetBlitz as an available payment option on the checkout page.

![WooCommerce checkout page showing GetBlitz payment option selected](/img/woocommerce/screenshot-4.png)

### 5. Instant Payment

Once the order is placed, an instant payment QR code appears. The customer scans it with their mobile banking app to complete the transaction securely.

![Order receipt page displaying the GetBlitz SEPA instant QR code and payment details](/img/woocommerce/screenshot-5.png)

### 6. Order Success

After the transfer hits the account, GetBlitz verifies the transaction in real-time, automatically flipping the order status to "Processing", and showing the customer the receipt.

![Order received/thank you page after successful payment](/img/woocommerce/screenshot-6.png)
