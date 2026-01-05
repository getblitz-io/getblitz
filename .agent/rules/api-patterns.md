---
trigger: glob
globs: packages/api/**
---

# API Package Guidelines (`@getblitz/api`)

You are an expert in the `packages/api` backend architecture.

## Core Architecture

- **Dependency Injection**: The API uses a DI container pattern (`src/container/`).
  - Services are registered in the container.
  - Repositories are injected into services.
  - The `TRPCContext` exposes the container's services.
- **tRPC**: The API is built with tRPC v11.
  - Procedures: `publicProcedure`, `protectedProcedure`, `organizationProcedure`.
  - Context: `ctx.services` gives access to all domains.

## Naming & Structure

- **Interfaces**:
  - Service contracts: `I[Name]Service` (e.g., `IBankConnectionService`).
  - Repository contracts: `I[Name]Repository`.
  - DTOs/Inputs: Descriptive names without `I` prefix (e.g., `CreateOptions`).
- **Files**:
  - Services: `src/services/[name].service.ts`
  - Repositories: `src/repositories/[name].repository.ts`
  - Routers: `src/router/[name].router.ts`

## Coding Patterns

- **Service Methods**:
  - Use object destructuring for all method parameters.
  - Return explicit types (avoid `any`).
  - Example:
    ```typescript
    async method({ id, data }: { id: string; data: UpdateInput }): Promise<Result>
    ```

- **Repositories**:
  - Extend `BaseRepository`.
  - Use `PrismaClient` (injected).

- **Error Handling**:
  - Use custom error classes (e.g., `NotFoundError` from `./organization.service` or generic TRPC errors).
  - Do not throw plain strings.
