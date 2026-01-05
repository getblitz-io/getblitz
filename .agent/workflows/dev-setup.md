---
description: Set up the development environment from scratch
---

# Development Environment Setup

This workflow sets up the complete development environment for the GetBlitz project.

## Prerequisites

- Node.js 22+
- pnpm 10+
- Docker & Docker Compose

## Steps

// turbo-all

1. Install dependencies

```bash
pnpm install
```

2. Start infrastructure (MySQL and Redis)

```bash
docker compose up -d
```

3. Wait for database to be ready (may take a few seconds for first run)

```bash
sleep 5
```

4. Generate Prisma client

```bash
pnpm db:generate
```

5. Push database schema

```bash
pnpm db:push
```

6. Start all development servers

```bash
pnpm dev
```

## Notes

- Dashboard will be available at http://localhost:3000
- Make sure `.env` file exists with proper configuration
- Run `cp env.example .env` if not exists
