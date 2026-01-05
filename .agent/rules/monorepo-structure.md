---
trigger: always_on
---

# Project Overview

This is a **GetBlitz Payment Gateway** - a self-hosted payment gateway supporting both Crypto (EVM) and Fiat (SEPA) payments with real-time WebSocket notifications.

## Monorepo Structure (Turborepo + pnpm)

| Directory                  | Package                    | Description                                       |
| -------------------------- | -------------------------- | ------------------------------------------------- |
| `apps/web`                 | `@getblitz/web`            | Dashboard + API routes (Next.js 15)               |
| `apps/wss`                 | `@getblitz/wss`            | WebSocket server (Socket.io)                      |
| `apps/demo`                | `@getblitz/demo`           | Demo merchant site                                |
| `apps/mock-bank`           | `@getblitz/mock-bank`      | Mock bank simulator                               |
| `packages/api`             | `@getblitz/api`            | tRPC routers, services, repositories (DI pattern) |
| `packages/auth`            | `@getblitz/auth`           | Better Auth configuration                         |
| `packages/database`        | `@getblitz/database`       | Prisma schema and client                          |
| `packages/redis`           | `@getblitz/redis`          | Redis client and pub/sub                          |
| `packages/shared-types`    | `@getblitz/shared-types`   | TypeScript interfaces                             |
| `packages/bank-providers`  | `@getblitz/bank-providers` | Bank provider integrations                        |
| `packages/ui`              | `@getblitz/ui`             | Shared UI components (shadcn/ui)                  |
| `packages/validators`      | `@getblitz/validators`     | Zod schemas                                       |
| `packages/websocket`       | `@getblitz/websocket`      | WebSocket utilities                               |
| `packages/getblitz-client` | `@getblitz/client`         | Embeddable payment SDK                            |
| `tooling/*`                | Various                    | ESLint, Prettier, TypeScript, Vitest configs      |

## Tech Stack

- **Runtime**: Node.js 22+
- **Package Manager**: pnpm 10+ with workspaces
- **Build System**: Turborepo
- **Framework**: Next.js 16 (App Router)
- **API**: tRPC v11
- **Database**: MySQL with Prisma ORM
- **Cache/Queue**: Redis (ioredis)
- **Auth**: Better Auth
- **UI**: React 19, Tailwind CSS v4, shadcn/ui, Radix UI
- **Testing**: Vitest
- **Validation**: Zod v4

## Key Files

- `turbo.json` - Turborepo configuration
- `pnpm-workspace.yaml` - Workspace definition and catalogs
- `compose.yml` - Docker services (MySQL, Redis)
- `packages/database/prisma/schema.prisma` - Database schema

## Common Commands

```bash
# Development
pnpm dev              # Start all services
pnpm dev:next         # Start Next.js only
pnpm dev:wss          # Start WebSocket server only

# Database
pnpm db:push          # Push Prisma schema
pnpm db:migrate       # Run migrations
pnpm db:generate      # Generate Prisma client
pnpm db:studio        # Open Prisma Studio

# Quality
pnpm lint             # Run ESLint
pnpm lint:fix         # Fix lint issues
pnpm format:fix       # Format code with Prettier
pnpm typecheck        # Run TypeScript checks
pnpm test             # Run tests

# Build
pnpm build            # Build all packages
```

## Package Scoping

When running commands for specific packages:

```bash
pnpm -F @getblitz/api <command>
pnpm -F @getblitz/web <command>
```
