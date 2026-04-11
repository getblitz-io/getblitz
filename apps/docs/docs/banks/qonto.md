# Qonto Bank Integration Guide

This guide will help you set up your Qonto account for integration with GetBlitz Payment Gateway.

## Prerequisites

Before you begin, you'll need:

- A Qonto business account (or access to the sandbox environment for testing)
- Access to the [Qonto Developer Portal](https://developers.qonto.com/)

## Understanding the Qonto OAuth Flow

Qonto uses a standard **redirect OAuth flow**:

1. GetBlitz generates a unique callback URL for your connection
2. You register this URL in the Qonto Developer Portal
3. You enter your credentials in GetBlitz
4. GetBlitz redirects you to Qonto for authorization
5. After approval, Qonto redirects back to your callback URL

## Step 1: Sign Up for the Developer Portal

1. Go to [Qonto Developer Portal](https://developers.qonto.com/)
2. Sign in with your Qonto account credentials
3. You'll receive access to API credentials and sandbox tools

## Step 2: Set Up the Sandbox Environment (Recommended for Testing)

The sandbox environment allows you to test your integration without affecting real accounts.

### Log in to the Sandbox Web App

1. From the [Toolkit](https://developers.qonto.com/toolkit/), click on **"Sandbox web app"**
2. Log in with the credentials available in the [Developer Portal](https://developers.qonto.com/authentication/)
3. If prompted for verification, enter: `123456`

> **Note**: Do not click on "Open an account" and do not change the password or preferred language since it's a shared sandbox account.

### Create Your Own User (Optional)

If you need a dedicated sandbox user:

1. From the [Toolkit](https://developers.qonto.com/toolkit/), click on **"Sandbox web app"**
2. Log in with the shared credentials from the Developer Portal
3. For any organization, click on the **"User management"** tab
4. Click the **"Invite team member"** button
5. Create a new user with your email
6. If prompted for verification, enter: `123456`
7. From the [Toolkit](https://developers.qonto.com/toolkit/), click on **"Mailcatcher"**
8. Find the invitation email sent to your address
9. Click **"Accept invitation"** and complete the self-onboarding process

### Create Your Own Organization (Optional)

For a completely isolated test environment:

1. Create your own user (see above)
2. From the [Toolkit](https://developers.qonto.com/toolkit/), click on **"QA tool"**
3. Click on **"Create Organization"**
4. Fill in the required fields:
   - **Owner**: Your new user's email address
   - **Price plan code**: Choose based on features you need to test ([see Qonto pricing](https://qonto.com/en/pricing))
   - **Organization name**: Your test organization name
   - **Balance amount**: Starting balance (e.g., `100000` EUR)
5. Submit the form

## Step 3: Start Configuration in GetBlitz

Before creating OAuth2 credentials in Qonto, start the configuration in GetBlitz to get your callback URL:

1. Navigate to **Banks** → **Connect**
2. Select **Qonto** as the provider
3. **Copy the Callback URL** displayed in Step 1 of the configuration page
   - This URL is unique to your connection attempt and looks like:
   - `https://your-getblitz.com/[orgId]/banks/callback/[connectionId]` e.g. `https://your-getblitz.com/acme/banks/callback/abc123def456`

> **Important**: Keep this page open - you'll need it after creating OAuth2 credentials in Qonto.

## Step 4: Create OAuth2 Credentials in Qonto

To integrate GetBlitz with your Qonto account, you need OAuth2 credentials:

1. Go to the [Developer Portal](https://developers.qonto.com/)
2. Navigate to the OAuth2 applications section
3. Create a new OAuth2 application with:
   - **Redirect URI**: Paste the callback URL from GetBlitz (from Step 3)
   - **Scopes**: Select `organization.read` and `webhook` scopes

4. Save your **Client ID** and **Client Secret**

## Step 5: Complete Configuration in GetBlitz

Return to the GetBlitz configuration page:

1. Enter your OAuth2 credentials:
   - **Client ID**: From the Developer Portal
   - **Client Secret**: From the Developer Portal
   - **Sandbox Mode**: Enable for testing, disable for production
   - **Sandbox Token** (if sandbox mode): Available from the Developer Portal
   - **OAuth Base URL**: Auto-filled based on sandbox mode
   - **API Base URL**: Auto-filled based on sandbox mode

2. Click **Connect**
3. You'll be redirected to Qonto to authorize the connection
4. After approval, you'll be returned to GetBlitz

## Step 6: Select Bank Accounts

After successful authorization:

1. GetBlitz will display your Qonto accounts
2. Select the accounts you want to use for payments
3. Complete the setup

## Webhooks

GetBlitz will automatically set up webhooks when you complete the connection. The webhook will listen for transaction events to automatically detect incoming payments.

## Production Setup

When you're ready to go live:

1. Get your **Production credentials** from the [Developer Portal](https://developers.qonto.com/sign-in/)
2. In GetBlitz, create a new Qonto connection:
   - Disable **Sandbox Mode**
   - Enter your production **Client ID** and **Client Secret**
   - Remove the **Sandbox Token**
   - Register the new callback URL in Qonto's production OAuth2 application

> **Important**: The `X-Qonto-Staging-Token` header is not necessary in production.

## API Endpoints

| Environment | OAuth Base URL                           | API Base URL                                  |
| ----------- | ---------------------------------------- | --------------------------------------------- |
| Sandbox     | `https://oauth-sandbox.staging.qonto.co` | `https://thirdparty-sandbox.staging.qonto.co` |
| Production  | `https://oauth.qonto.com`                | `https://thirdparty.qonto.com`                |

## Troubleshooting

### OAuth2 Authorization Fails

- Verify your redirect URI in Qonto matches **exactly** the callback URL from GetBlitz
- Ensure you're using the correct Client ID and Client Secret for your environment

### Callback URL Expired

- If your GetBlitz session expired before completing authorization, start over by clicking "Connect" again on the Qonto provider
- A new callback URL will be generated
- You'll need to update the redirect URI in your Qonto OAuth2 application

### Webhooks Not Receiving Events

- Check that your GetBlitz instance is publicly accessible
- Verify the webhook URL is correctly registered in Qonto

### Sandbox Token Issues

- The sandbox token is only required for the sandbox environment
- Get a fresh token from the [Developer Portal](https://developers.qonto.com/authentication/)

## Additional Resources

- [Qonto API Reference](https://docs.qonto.com/api-reference/introduction)
- [Developer Guidelines](https://docs.qonto.com/get-started/general/developer-guidelines)
- [Business API Authentication](https://docs.qonto.com/get-started/business-api/authentication/oauth/oauth-flow)
- [Webhook Documentation](https://docs.qonto.com/api-reference/business-api/webhooks)
