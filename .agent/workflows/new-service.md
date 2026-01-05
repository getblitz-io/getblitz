---
description: Create a new service in the API package following the DI pattern
---

# Create New Service

This workflow guides creating a new service in the packages/api module following the project's Dependency Injection pattern.

## Steps

1. **Define the interface** in `packages/api/src/interfaces/index.ts`:
   - Create an interface prefixed with `I` (e.g., `IMyNewService`)
   - Define all public methods with proper types
   - Export the interface

2. **Create the service file** at `packages/api/src/services/my-new.service.ts`:
   - Import the interface and dependencies
   - Create a class that implements the interface
   - Use constructor injection for dependencies (repositories, other services)
   - Add proper error handling and logging

3. **Register the symbol** in `packages/api/src/container/types.ts`:
   - Add the service symbol: `MyNewService: Symbol.for("MyNewService")`

4. **Register in container** in `packages/api/src/container/container.ts`:
   - Bind the service to its implementation
   - Inject required dependencies

5. **Create tests** at `packages/api/src/services/my-new.service.test.ts`:
   - Write unit tests with mocked dependencies
   - Test happy paths and error cases
   - Follow AAA pattern (Arrange, Act, Assert)

6. **Export from index** if needed for external use

## Service Template

```typescript
import type { IMyNewService, IMyRepository } from "../interfaces";
import type { ILogger } from "../utils";

export class MyNewService implements IMyNewService {
  constructor(
    private readonly repository: IMyRepository,
    private readonly logger: ILogger,
  ) {}

  async myMethod(input: MyInput): Promise<MyOutput> {
    this.logger.info("Processing request", { input });

    try {
      const result = await this.repository.find(input.id);
      return result;
    } catch (error) {
      this.logger.error("Failed to process", { error });
      throw error;
    }
  }
}
```

## Test Template

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MyNewService } from "./my-new.service";

describe("MyNewService", () => {
  let service: MyNewService;
  let mockRepository: MockedObject<IMyRepository>;
  let mockLogger: MockedObject<ILogger>;

  beforeEach(() => {
    mockRepository = {
      find: vi.fn(),
    };
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
    };
    service = new MyNewService(mockRepository, mockLogger);
  });

  describe("myMethod", () => {
    it("should return result when found", async () => {
      // Arrange
      const expected = { id: "123" };
      mockRepository.find.mockResolvedValue(expected);

      // Act
      const result = await service.myMethod({ id: "123" });

      // Assert
      expect(result).toEqual(expected);
    });
  });
});
```
