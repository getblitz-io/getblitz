---
name: backend-service-creation
description: How to create a new API backend service in the GetBlitz API using Dependency Injection. Use this when the user asks to implement or add a new backend service.
---

# Backend Service Creation

Follow these steps when creating a new API service:

1. **Create the Interface**: Define `I[Name]Service` in `packages/api/src/services/[name].service.ts` or as appropriate.
2. **Implement the Service**: Create a class implementing the interface using Dependency Injection for any repositories or sub-services it requires.
3. **Bind in Container**: Bind your service symbol in `packages/api/src/container/types.ts` and `packages/api/src/container/container.ts`.
4. **Test Pattern**: Create a collocated test file (`[name].service.test.ts`) that uses the AAA (Arrange, Act, Assert) pattern. Mocks should be set up via `vi.fn()` inside `beforeAll`.
