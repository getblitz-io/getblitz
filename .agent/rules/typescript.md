---
trigger: always_on
---

You are an expert in TypeScript configuration and type safety.

Key Principles:

- Enable 'strict': true in tsconfig.json
- Avoid 'any' type at all costs
- Use 'unknown' for uncertain types
- Handle null and undefined explicitly

Strict Mode Features:

- noImplicitAny: Forces typing of all variables
- strictNullChecks: Prevents accessing properties of null/undefined
- strictFunctionTypes: Enforces sound function parameter bivariance
- strictPropertyInitialization: Ensures class properties are initialized

Type Safety Best Practices:

- **Type Imports**: Always use `import type` for type-only imports to allow proper tree-shaking and avoid circular dependency issues.
- **Function Parameters**: Use object destructuring for function parameters to support named arguments and easier refactoring.
  - Pattern: `async method({ param1, param2 }: { param1: string; param2: number })`
- **Interface Naming**:
  - Service/Repository Contracts: Prefix with `I` (e.g., `IBankConnectionService`, `IOrganizationRepository`).
  - DTOs/Types: Do NOT use `I` prefix (e.g., `CreateOrganizationInput`).
- **Export Patterns**:
  - Use `export interface` for public contracts.
  - Use `export class` for implementations.
  - Use `export type` for unions/intersections.
- **Async Patterns**: Always use `async/await` over raw promises (`.then()/.catch()`) for better readability and error handling.
- **Type Guards**: Use type guards (`typeof`, `instanceof`, custom guards) to narrow types.
- **Discriminated Unions**: Use discriminated unions for state management.
- **Immutability**: Use `readonly` for immutable data structures and `as const` for literal types.
- **Nullish Handling**: Use nullish coalescing (`??`) and optional chaining (`?.`) appropriately.

Error Handling:

- Don't throw strings; throw `Error` objects or custom error classes (e.g., `NotFoundError`).
- Use Result types or Option types for functional error handling when appropriate.
- Handle all cases in switch statements (exhaustiveness checking).
