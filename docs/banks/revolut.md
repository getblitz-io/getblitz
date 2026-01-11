# Revolut Business API Integration Guide

This guide will help you set up your Revolut Business account for integration with GetBlitz Payment Gateway.

## Prerequisites

Before you begin, you'll need:

- A Revolut Business account
- Access to the [Revolut Business Web App](https://business.revolut.com/)
- OpenSSL installed on your system (comes pre-installed on macOS and most Linux distributions)

## Step 1: Generate Your Certificate

Revolut uses certificate-based authentication. You'll need to generate a private key and public certificate using OpenSSL.

### Generate the Private Key and Certificate

Open a terminal and run the following commands:

```bash
# Navigate to a secure directory where you want to store your certificates
cd ~/revolut-certs

# Generate a 2048-bit RSA private key
openssl genrsa -out privatecert.pem 2048

# Generate a public certificate (valid for 5 years)
openssl req -new -x509 -key privatecert.pem -out publiccert.cer -days 1825
```

When prompted, enter your organization details:

```
Country Name (2 letter code) []: US
State or Province Name (full name) []: California
Locality Name (eg, city) []: San Francisco
Organization Name (eg, company) []: Your Company Name
Organizational Unit Name (eg, section) []: Engineering
Common Name (eg, fully qualified host name) []: your-domain.com
Email Address []: api@your-domain.com
```

> **Note**: You must enter at least one piece of information (e.g., Country Name) for the certificate to be generated successfully.

### View Your Public Certificate

To display your public certificate contents (you'll need this for the next step):

```bash
cat publiccert.cer
```

Copy the entire output, including the `-----BEGIN CERTIFICATE-----` and `-----END CERTIFICATE-----` lines.

## Step 2: Upload Certificate to Revolut

1. Log in to the [Revolut Business Web App](https://business.revolut.com/)
2. Click on the **gear icon** (Settings) in the top right corner
3. Navigate to **APIs** → **Business API**
4. Click **Add API certificate** (or **Add new** if you already have certificates)
5. Paste the contents of your `publiccert.cer` into the **X509 public key** field
6. Enter your **OAuth redirect URI** (e.g., `https://your-domain.com/banks/callback/revolut`)
7. Give your certificate a meaningful title (e.g., "GetBlitz Production")
8. Click **Continue**

> **Important**: Copy the **Client ID** displayed in the API Certificate details. You'll need this for GetBlitz configuration.

### Optional: IP Whitelisting

For additional security, you can provide a list of IP addresses that are allowed to access the API. Only traffic from these IP addresses will be permitted.

## Step 3: Configure GetBlitz

In your GetBlitz dashboard:

1. Navigate to **Banks** → **Connect**
2. Select **Revolut Business** as the provider
3. Enter your configuration:
   - **Client ID**: The Client ID from Revolut (obtained in Step 2)
   - **OAuth Redirect URI**: Must match exactly what you configured in Revolut (e.g., `https://your-domain.com/banks/callback/revolut`)
   - **Private Key (PEM)**: Paste the entire contents of your `privatecert.pem` file, including the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines
   - **Sandbox Mode**: Enable for testing, disable for production

4. Click **Configure** to save your settings

## Step 4: Complete OAuth Authorization

After configuring your provider:

1. You'll be redirected to Revolut's consent page
2. Log in to your Revolut Business account if prompted
3. Review and approve the requested permissions
4. You'll be redirected back to GetBlitz with your accounts connected

## Step 5: Select Bank Accounts

After successful authorization:

1. GetBlitz will display your Revolut accounts
2. Select the accounts you want to use for receiving payments
3. Complete the setup

## API Endpoints Reference

| Environment | Base URL                                   |
| ----------- | ------------------------------------------ |
| Sandbox     | `https://sandbox-b2b.revolut.com/api/1.0/` |
| Production  | `https://b2b.revolut.com/api/1.0/`         |

## Troubleshooting

### Certificate Upload Fails

- Ensure you copied the entire certificate, including the `-----BEGIN CERTIFICATE-----` and `-----END CERTIFICATE-----` lines
- Verify the certificate was generated correctly by running:
  ```bash
  openssl x509 -in publiccert.cer -text -noout
  ```

### OAuth Authorization Fails

- Verify your redirect URI matches **exactly** what's configured in Revolut (including protocol, domain, and path)
- Check that your private key matches the public certificate uploaded to Revolut
- Ensure the Client ID is correct

### Token Refresh Issues

- The refresh token does not expire under normal circumstances
- For Freelancer plan accounts, the refresh token expires every 90 days due to PSD2 SCA regulations
- If your refresh token expires, you'll need to re-authorize through the OAuth flow

### JWT Client Assertion Expired

The JWT client assertion used for authentication has an expiration time. GetBlitz automatically generates fresh JWTs for each API request, but if you encounter this error:

1. Verify your system clock is synchronized
2. Check that your private key is valid and not corrupted

## Security Best Practices

1. **Keep your private key secure**: Never share your private key. Store it in a secure location and use appropriate file permissions.

2. **Use separate certificates for environments**: Generate different certificates for sandbox and production environments.

3. **Rotate certificates periodically**: While certificates can be valid for up to 5 years, consider rotating them annually.

4. **Monitor API access**: Regularly review your API activity in the Revolut Business dashboard.

## Additional Resources

- [Revolut Business API Documentation](https://developer.revolut.com/docs/guides/manage-accounts/get-started/make-your-first-api-request)
- [Revolut Developer Portal](https://developer.revolut.com/)
- [OpenSSL Documentation](https://www.openssl.org/docs/)
