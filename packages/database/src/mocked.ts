import type { DeepMockProxy } from "vitest-mock-extended";
import { beforeEach } from "vitest";
import { mockDeep, mockReset } from "vitest-mock-extended";

import type { PrismaClient } from "./generated/client";

/**
 * Creates a deeply mocked PrismaClient instance for unit testing.
 * Based on https://www.prisma.io/docs/orm/prisma-client/testing/unit-testing
 *
 * @example
 * ```ts
 * import { createMockPrismaClient } from "@getblitz/database/mocked";
 *
 * describe("MyService", () => {
 *   const mockPrisma = createMockPrismaClient();
 *
 *   beforeAll(() => {
 *     service = new MyService(mockPrisma as unknown as PrismaClient);
 *   });
 *
 *   it("should query data", async () => {
 *     mockPrisma.user.findUnique.mockResolvedValue({ id: "1", name: "Test" });
 *     const result = await service.getUser("1");
 *     expect(result.name).toBe("Test");
 *   });
 * });
 * ```
 */
export function createMockPrismaClient(): DeepMockProxy<PrismaClient> {
  return mockDeep<PrismaClient>();
}

/**
 * Type alias for a deeply mocked PrismaClient.
 */
export type MockPrismaClient = DeepMockProxy<PrismaClient>;

/**
 * Creates a mocked PrismaClient that auto-resets before each test.
 * Use this when you want automatic cleanup between tests.
 *
 * @example
 * ```ts
 * import { createAutoResetMockPrismaClient } from "@getblitz/database/mocked";
 *
 * describe("MyService", () => {
 *   const mockPrisma = createAutoResetMockPrismaClient();
 *
 *   // No need for beforeEach reset - it's automatic!
 * });
 * ```
 */
export function createAutoResetMockPrismaClient(): DeepMockProxy<PrismaClient> {
  const mock = mockDeep<PrismaClient>();

  beforeEach(() => {
    mockReset(mock);
  });

  return mock;
}

/**
 * Re-export mockDeep and mockReset for convenience when using with transactions.
 */
export { mockDeep, mockReset };
