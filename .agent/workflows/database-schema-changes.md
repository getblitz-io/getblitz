---
description: how to apply database schema changes
---

1. Edit `packages/database/prisma/schema.prisma`. Ensure you include `id` using `uuid(7)`, `createdAt`, and `updatedAt` for all new models, along with relationships and indexes.
   // turbo
2. Format the schema:
   `pnpm db:format`
3. Create a migration replace `<migration-name>` with a descriptive name:
   `pnpm db:migrate <migration-name>`
   // turbo
4. Regenerate the client:
   `pnpm db:generate`
