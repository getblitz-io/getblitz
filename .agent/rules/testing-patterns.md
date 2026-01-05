---
trigger: glob
globs: **/*.test.ts
---

# Testing Patterns (Vitest)

You are an expert in testing with Vitest in this monorepo.

## Setup & Structure

- **Tools**: Use `vitest` globals: `describe`, `it`, `expect`, `vi`, `beforeAll`, `beforeEach`.
- **Mocks**:
  - Use `vi.fn()` for function mocks.
  - Mock resolved values: `.mockResolvedValue(result)`.
  - Mock dependencies using object literals with `vi.fn()` properties.
  - Use `as unknown as Type` when mocking complex interfaces partially.

## Best Practices

- **Describe Blocks**: dedicated `describe("ServiceName", ...)` block for the suite.
- **BeforeAll**: Initialize the service/component under test with mocked dependencies.
- **Test Isolation**: Reset mocks if needed, though often fresh mocks in `beforeAll` tailored for the suite works best if state isn't shared.
- **Type Safety**: Avoid `any` in tests. Define mock interfaces or use `Partial<Type>` where possible.
- **Naming**: `it("should <expected behavior> when <condition>")`.

## Example Pattern

```typescript
describe("MyService", () => {
  let service: MyService;
  const mockRepo = {
    findById: vi.fn(),
  };

  beforeAll(() => {
    service = new MyService(mockRepo as unknown as IRepository);
  });

  it("should return data when found", async () => {
    mockRepo.findById.mockResolvedValue({ id: "1" });
    const res = await service.get({ id: "1" });
    expect(res).toBeDefined();
    expect(mockRepo.findById).toHaveBeenCalledWith({ id: "1" });
  });
});
```
