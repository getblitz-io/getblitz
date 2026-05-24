# GetBlitz AI Guidelines

These are the rules for the GetBlitz monorepo.

## TypeScript & General Patterns

- **Strict Typing:** Never use `any`; use `unknown` if uncertain. Handle `null`/`undefined` explicitly. Use type guards (`typeof`, `instanceof`).
- **Naming & Imports:** Prefix Service/Repository contracts with `I` (e.g., `IBankConnectionService`). Do not prefix DTOs/types. Always use `import type` for type-only imports to aid tree-shaking.
- **Function Signatures:** Always use object destructuring for parameters: `async method({ param1, param2 }: { param1: string, param2: number })`.
- **Error Handling:** Throw `Error` objects or custom classes (e.g., `NotFoundError`), never plain strings. Use `async/await` exclusively over `.then()`.

## API & Backend (`@getblitz/api`)

- **Architecture:** Uses a Dependency Injection (DI) container pattern. Repositories are injected into services, which are registered in `src/container/`.
- **tRPC (v11):** The API router exposes `publicProcedure`, `protectedProcedure`, etc. Context `ctx.services` provides DI access to all domains.
- **Repositories:** Extend `BaseRepository` and use the injected `PrismaClient`.

## Bank Providers (`@getblitz/bank-providers`)

- **Structure:** All providers must extend `BaseBankProvider` and be registered in the `ProviderRegistry`. New providers belong in `src/providers/[name]/`.
- **Security:** Never log credentials. Provider configurations are encrypted at rest. Use `ProviderRegistry.createProvider()` for instantiation.

## Frontend: Next.js & React (`@getblitz/web`, `@getblitz/ui`)

- **App Router:** Default to Server Components. Use `'use client'` only when strictly necessary (state, hooks, events). Fetch data in Server Components or via tRPC mutations.
- **Styling:** Use Tailwind CSS v4 and `shadcn/ui`. Always use the `cn()` utility to merge classes, and `cva` for variant styles.
- **Routing:** Use `(folder)` for route groups (shared layouts) and `_folder` for private UI components.

## Testing (Vitest & E2E Playwright)

- **Feature Mandate:** Whenever implementing, updating, or rolling out new features or endpoints, **you must write corresponding E2E tests** (either page/browser flows, tRPC API calls, or REST endpoints) inside `apps/web/e2e/tests/` to guarantee coverage and prevent regressions.
- **Unit & Integration (Vitest):**
  - **Type Safety:** Avoid `any` in tests. Define mock interfaces, use `Partial<Type>`, or cast via `as unknown as Type` for partial mocks.
  - **Setup:** Create a `describe` block, and mock dependencies inside `beforeAll` using `vi.fn()`.
  - **Naming:** Follow the `it("should <expected behavior> when <condition>")` pattern.
- **End-to-End & Integration (Playwright E2E):**
  - **Location:** All E2E files are stored under `apps/web/e2e/`. Tests belong in `apps/web/e2e/tests/`.
  - **Database Strategy:** Tests run against `getblitz_test`. Parallel workers are isolated: always use randomized suffixes/identifiers for mock models (e.g. `e2e-org-${rand}`) to avoid database constraint violations.
  - **Session & Auth Fixture:** Use programmatic session cookie injection. Use `import { test, expect } from "../fixtures/auth.fixture"` to access a pre-authenticated `authenticatedPage` and pre-populated `organization`/`session` data.
  - **tRPC Testing:** Use the custom `ApiTestClient.callTRPC` client. Since the backend uses `superjson`, always serialize query/mutation parameters before sending (e.g. `JSON.stringify(superjson.serialize(input))`).
  - **REST API Testing:** Use `ApiTestClient.callRestV1` with an generated organization API Key. Pass explicit query parameters (like `?take=50&skip=0`) to satisfy validation schemas. Expect raw entity objects directly (no nested `.data` wrapper).
  - **Next.js Port & Isolation:** Tests execute on port `3005` in test mode (`pnpm dev:test`). The build directory is dynamically isolated to `.next-test` in `next.config.js` to prevent collisions with active local dev servers on port `3000`.

## Internationalization (`next-intl`)

- **Setup:** Utilizes `next-intl`. Translations are stored in `messages/{locale}.ts`.
- **Usage:** Retrieve translations with `useTranslations` (client) or `getTranslations` (server). Format plurals and interpolations using ICU MessageFormat. Never hardcode static text in components.

## Dev Setup

- Assume that the dev server is already running. Only start it if explicitly asked.

## Dependencies

- **Installation Workspace Rule:** If a dependency is used in multiple packages (excluding `@getblitz/client` and `@getblitz/shared-types`), add it to the catalog in `pnpm-workspace.yaml`. To install and save to the catalog, run: `pnpm add <package-name> --save-catalog`.
