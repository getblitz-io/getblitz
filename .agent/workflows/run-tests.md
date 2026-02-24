---
description: run tests with vitest
---

1. Run specific test suites via workspace targeting, such as `pnpm -F [package-name] test` (e.g., `pnpm -F @getblitz/api test`).
2. Alternatively, use `vitest` with filters (-t "test name") in the corresponding directory. Test files must be collocated and named `[name].test.ts`.
