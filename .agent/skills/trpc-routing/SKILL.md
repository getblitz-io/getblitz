---
name: trpc-routing
description: How to add or modify tRPC routes in the GetBlitz API. Use this when you need to expose a service through the API or create a new endpoint.
---

# tRPC Routing

When exposing new services or adding new endpoints via tRPC:

1. **Add Route Scope**: Create or update the specific router in `packages/api/src/router/`.
2. **Validation**: Always use Zod input schemas for validation (`z.object({...})`).
3. **Register Route**: Ensure the new router is registered in the root router located at `packages/api/src/root.ts`.
4. **Context**: Access injected services via the tRPC context (`ctx.services.myService`).
