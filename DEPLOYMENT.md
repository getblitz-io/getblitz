# Deployment Guide

This guide explains how to deploy GetBlitz to various cloud platforms.

## One-Click Deployment

### DigitalOcean App Platform

1.  Click the **Deploy to DigitalOcean** button in the README.
2.  Connect your GitHub account and select the `getblitz-io/getblitz` repository.
3.  **Instance Configuration (Defaults)**:
    - **Web Service**: Defaults to `basic-xs` (~$5/mo). Handles both API/Frontend and WebSocket traffic.
    - **Database/Redis**: Defaults to `db-s-1vcpu-1gb` (~$15/mo each).
    - **Total Estimated Cost**: ~$35/month.
4.  **Environment Configuration**:
    - `AUTH_SECRET`: **Required**. Enter a secure random string (min 32 chars).
    - `ENCRYPTION_KEY`: **Required**. Enter a secure random string (min 32 chars).
    - `AUTH_GOOGLE_ID`: **Required**. Your Google OAuth Client ID.
    - `AUTH_GOOGLE_SECRET`: **Required**. Your Google OAuth Client Secret.
    - `DATABASE_*`, `REDIS_URL`, `NEXT_PUBLIC_*`: Automatically configured.
5.  **Build**:
    - The build command `pnpm db:generate && pnpm --filter @getblitz/web build:standalone` prepares the standalone Next.js app with integrated WebSockets.

### Render

1.  Click the **Deploy to Render** button in the README.
2.  Connect your GitHub account.
3.  **Instance Configuration (Defaults)**:
    - **Services**: Defaults to `Starter` (~$7/mo each).
    - **Database/Redis**: Defaults to `Starter` (~$7/mo + ~$10/mo depending on region).
    - **Total Estimated Cost**: ~$25-30/month.
4.  **Environment Configuration**:
    - `AUTH_SECRET` & `ENCRYPTION_KEY`: Will be automatically generated.
    - `AUTH_GOOGLE_ID` & `AUTH_GOOGLE_SECRET`: You will be prompted to enter these in the Render dashboard.
    - `NODE_VERSION`: Preset to `22.12.0`.
5.  **Resources**:
    - Render will generate a `render.yaml` based blueprint.
    - It will create a single Web Service (Dashboard + WSS), a MySQL Database, and a Redis instance.

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

## Release Process

GetBlitz uses a single-branch development strategy.

1.  **Main Branch**: The `main` branch is the core working branch. All PRs from contributors and organization members should target `main`.
2.  **Versioning & Changelogs**: We use `release-please` to automate versioning and changelog generation.
    - When a PR is merged into `main`, `release-please` will automatically create/update a "Release PR".
    - This Release PR collects all changes since the last release and prepares the version bump and CHANGELOG.md.
3.  **Deploying a Release**:
    - Once you are ready to release, simply merge the "Release PR" back into `main`.
    - This will trigger the final release workflow, which publishes packages to npm (if applicable) and creates a GitHub Release.
    - Your deployment platform (DigitalOcean, Render, etc.) should be configured to deploy whenever there is a push to `main`.

> **Note**: Avoid manual version bumps. Follow [Conventional Commits](https://www.conventionalcommits.org/) to ensure `release-please` can correctly determine the next version.
