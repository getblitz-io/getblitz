---
trigger: glob
globs: packages/database/**
---

# Database Guidelines (`@getblitz/database`)

You are an expert in Prisma ORM and database schema design.

## Schema Management

- **Location**: `packages/database/prisma/schema.prisma`.
- **Formatting**: Always format with `pnpm format:fix` (runs prisma format).
- **Naming**: camelCase for fields, PascalCase for models.

## Type Safety

- **Includes**: Use `satisfies Prisma.ModelInclude` or `Prisma.ModelSelect` patterns to define strict return types in repositories.
- **Enums**: Use proper Prisma enums.

## Migrations

- **Development**: Use `pnpm db:push` for rapid prototyping.
- **Production-Ready**: Use `pnpm db:migrate` to create migration history.
- **Seeding**: Maintain valid seed scripts.

## Repository Pattern

- When querying the DB, generally do it through `packages/api` repositories, not raw calls in components/handlers, to enforce business logic.
