import type { Job } from "@getblitz/queue";
import { createWorker } from "@getblitz/queue";

import type { CleanupBankConnectionsJobPayload } from "./cleanup-bank-connections.queue";
import { getContainer } from "../container";
import { cronLogger } from "../utils";
import {
  CLEANUP_BANK_CONNECTIONS_QUEUE_NAME,
  registerCleanupBankConnectionsJob,
} from "./cleanup-bank-connections.queue";

/**
 * Initialize the cleanup bank connections worker
 * This should be called from the instrumentation hook
 */
export function initCleanupBankConnectionsWorker(): void {
  createWorker<CleanupBankConnectionsJobPayload>(
    CLEANUP_BANK_CONNECTIONS_QUEUE_NAME,
    async (_job: Job<CleanupBankConnectionsJobPayload>) => {
      const container = getContainer();
      const { bankConnectionService } = container;

      try {
        const { expiredCount, cutoffDate } =
          await bankConnectionService.cleanupExpiredConnections();
        const now = new Date();

        cronLogger.info("Cleaned up expired bank connections", {
          count: expiredCount,
          cutoffDate: cutoffDate.toISOString(),
          timestamp: now.toISOString(),
        });
      } catch (error) {
        cronLogger.error("Error cleaning up bank connections", {
          error: String(error),
        });
        throw error;
      }
    },
    {
      concurrency: 1, // Only one instance should run at a time
    },
  );

  // Register the repeatable job
  void registerCleanupBankConnectionsJob();

  cronLogger.info(
    `Worker '${CLEANUP_BANK_CONNECTIONS_QUEUE_NAME}' initialized`,
  );
}
