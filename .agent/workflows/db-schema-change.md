---
description: Make database schema changes with Prisma
---

# Database Schema Changes

This workflow guides making database schema changes using Prisma.

## Steps

1. **Edit the schema** at `packages/database/prisma/schema.prisma`:
   - Add or modify models
   - Update relations
   - Add indexes for query optimization

2. **Format the schema**:

```bash
pnpm db:format
```

3. **For development** (resets data):

```bash
pnpm db:push
```

4. **For production** (preserves data):

```bash
pnpm db:migrate
```

5. **Regenerate Prisma client**:

```bash
pnpm db:generate
```

6. **Update TypeScript types** if needed in `packages/shared-types`

## Schema Best Practices

### Naming

- Tables: `PascalCase` (e.g., `PaymentSession`)
- Fields: `camelCase` (e.g., `createdAt`)
- Relations: descriptive names (e.g., `organization` not `org`)

### Required Fields for All Models

```prisma
model MyModel {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // ... other fields

  @@map("my_model") // Database table name in snake_case
}
```

### Indexes

Add indexes for:

- Foreign keys used in WHERE clauses
- Fields commonly filtered/sorted on
- Composite indexes for compound queries

```prisma
@@index([organizationId, status])
@@index([createdAt])
```

### Relations

```prisma
// One-to-many
organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
organizationId String

// One-to-one
@@unique([userId])
```

## Viewing Data

Open Prisma Studio to browse/edit data:

```bash
pnpm db:studio
```

This opens at http://localhost:5555
