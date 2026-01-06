# Deployment Guide

This guide explains how to deploy GetBlitz to various cloud platforms.

## One-Click Deployment

### DigitalOcean App Platform

1.  Click the **Deploy to DigitalOcean** button in the README.
2.  Connect your GitHub account and select the `getblitz-io/getblitz` repository.
3.  **Instance Configuration (Defaults)**:
    - **Web/WSS Services**: Defaults to `basic-xs` (~$5/mo each). Good for low-traffic production. Upgrade to `basic-s` or larger for higher concurrency.
    - **Database/Redis**: Defaults to `db-s-1vcpu-1gb` (~$15/mo each). This is the minimum for production stability.
    - **Total Estimated Cost**: ~$40/month.
4.  **Environment Configuration**:
    - **Web Service**:
      - `AUTH_SECRET`: **Required**. Enter a secure random string (min 32 chars).
      - `ENCRYPTION_KEY`: **Required**. Enter a secure random string (min 32 chars).
      - `AUTH_GOOGLE_ID`: **Required**. Your Google OAuth Client ID.
      - `AUTH_GOOGLE_SECRET`: **Required**. Your Google OAuth Client Secret.
      - `NEXT_PUBLIC_WSS_URL`: **Required**. The public URL of your WebSocket service (e.g., `wss://app-name-wss.ondigitalocean.app`). _Note: You will find this URL in the DigitalOcean dashboard after the first build, checking the `wss` component._
      - `DATABASE_*` & `REDIS_URL`: Automatically injected.
    - **WSS Service**:
      - `REDIS_URL` & `CORS_ORIGINS`: Automatically injected.
5.  **Build**:
    - The build command `pnpm db:generate && pnpm build` ensures the Prisma client is generated before the app starts.

### Render

1.  Click the **Deploy to Render** button in the README.
2.  Connect your GitHub account.
3.  **Instance Configuration (Defaults)**:
    - **Services**: Defaults to `Starter` (~$7/mo each). Prevents cold-starts (unlike free tier).
    - **Database/Redis**: Defaults to `Starter` (~$7/mo + ~$10/mo depending on region).
    - **Total Estimated Cost**: ~$30-40/month.
4.  **Environment Configuration**:
    - `AUTH_SECRET` & `ENCRYPTION_KEY`: Will be automatically generated.
    - `AUTH_GOOGLE_ID` & `AUTH_GOOGLE_SECRET`: You will be prompted to enter these in the Render dashboard.
    - `NEXT_PUBLIC_WSS_URL`: Mapping to the WSS service URL. ensure it starts with `wss://` or `https://` (client handles upgrade).
    - `NODE_VERSION`: Preset to `22.12.0`.
5.  **Resources**:
    - Render will generate a `render.yaml` based blueprint.
    - It will create a Web Service (Dashboard), a Web Service (WebSocket), a MySQL Database, and a Redis instance.

## Manual Deployment

### Docker Compose (Self-Hosted)

For a simple VPS deployment (e.g., EC2, Droplet, Hetzner), you can use Docker Compose.

```bash
# 1. Clone the repository
git clone https://github.com/getblitz-io/getblitz.git
cd getblitz

# 2. Configure Environment
cp .env.example .env
# Edit .env with your secrets

# 3. Start Services
docker compose up -d
```

### Vercel (Next.js Only)

To deploy only the Dashboard/API (`apps/web`):

1.  Import the project to Vercel.
2.  Set Root Directory to `apps/web`.
3.  **Build Command**: `pnpm db:generate && pnpm build`
    - _Note_: You may need to configure the "Output Directory" to `.next` (default).
4.  **Environment Variables**:
    - Provide `DATABASE_HOST`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME` pointing to your external hosted database.
    - Provide `REDIS_URL`.
    - Provide `AUTH_SECRET`, `ENCRYPTION_KEY`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`.
    - Provide `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_WSS_URL`.

> **Note**: The WebSocket Server (`apps/wss`) cannot be hosted on Vercel as it requires a long-running process. You must deploy it separately.
