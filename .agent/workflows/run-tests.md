---
description: run tests with vitest or playwright e2e
---

1. **Unit & Integration Tests (Vitest)**:
   - Run specific test suites via workspace targeting: `pnpm --filter [package-name] test` (e.g., `pnpm --filter @getblitz/api test`).
   - Run a single test file or name match: `vitest -t "test name"`.
   - Test files are collocated and named `[name].test.ts`.

2. **End-to-End Tests (Playwright)**:
   - Prerequisites: `docker compose up -d`, create `getblitz_test` DB, copy/use `apps/web/.env.test`.
   - Install Playwright browsers (optional; `test:e2e` also runs this idempotently): `pnpm --filter @getblitz/web test:e2e:install`.
   - Run the E2E browser, tRPC, and REST API tests: `pnpm --filter @getblitz/web test:e2e`.
   - Run tests interactively: `pnpm --filter @getblitz/web test:e2e:ui`.
   - Target a specific test suite: `pnpm --filter @getblitz/web test:e2e -- e2e/tests/api.spec.ts`.
   - Run all portal UI tests: `pnpm --filter @getblitz/web test:e2e -- e2e/tests/portal`.
   - Run one portal area: `pnpm --filter @getblitz/web test:e2e -- e2e/tests/portal/payments/simulate.spec.ts`.
   - The test environment is isolated to a test database (`getblitz_test`) and test port (`3005`). Do NOT run E2E tests against port 3000 as it will conflict with local dev.
