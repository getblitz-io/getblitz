---
description: Add a new tRPC router or procedure
---

# Add tRPC Router/Procedure

This workflow guides adding new tRPC routes to the API.

## To Add a New Procedure to Existing Router

1. **Open the router file** in `packages/api/src/router/`

2. **Define input schema** using Zod:

```typescript
const myProcedureInput = z.object({
  field: z.string().min(1),
  optionalField: z.number().optional(),
});
```

3. **Add the procedure**:

```typescript
myProcedure: protectedProcedure
  .input(myProcedureInput)
  .mutation(async ({ ctx, input }) => {
    const service = ctx.services.myService;
    return service.doSomething(input);
  }),
```

## To Add a New Router

1. **Create router file** at `packages/api/src/router/my.router.ts`:

```typescript
import { z } from "zod";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

export const myRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.services.myService.list();
  }),

  create: protectedProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.services.myService.create(input);
    }),
});
```

2. **Register in root router** at `packages/api/src/root.ts`:

```typescript
import { myRouter } from "./router/my.router";

export const appRouter = createTRPCRouter({
  // existing routers...
  my: myRouter,
});
```

## Procedure Types

- `publicProcedure` - No auth required
- `protectedProcedure` - Requires authenticated user
- `query` - For read operations
- `mutation` - For write/update operations

## Best Practices

- Always validate input with Zod schemas
- Use services for business logic, not inline in procedures
- Return typed responses
- Handle errors appropriately
- Log important operations
