import type { Job } from "@getblitz/queue";
import { createWorker } from "@getblitz/queue";

import type { ExpireSessionsJobPayload } from "./expire-sessions.queue";
import { getContainer } from "../container";
import { cronLogger } from "../utils";
import {
  EXPIRE_SESSIONS_QUEUE_NAME,
  registerExpireSessionsJob,
} from "./expire-sessions.queue";

/**
 * Initialize the expire sessions worker
 * This should be called from the instrumentation hook
 */
export function initExpireSessionsWorker(): void {
  createWorker<ExpireSessionsJobPayload>(
    EXPIRE_SESSIONS_QUEUE_NAME,
    async (_job: Job<ExpireSessionsJobPayload>) => {
      const container = getContainer();
      const { paymentSessionService } = container;

      try {
        const expiredCount = await paymentSessionService.expireSessions();
        const now = new Date();

        cronLogger.info("Expired payment sessions", {
          count: expiredCount,
          timestamp: now.toISOString(),
        });
      } catch (error) {
        cronLogger.error("Error expiring sessions", {
          error: String(error),
          stack: error instanceof Error ? error.stack : "no stack",
        });
        throw error;
      }
    },
    {
      concurrency: 1, // Only one instance should run at a time
    },
  );

  // Register the repeatable job
  void registerExpireSessionsJob();

  cronLogger.info(`Worker '${EXPIRE_SESSIONS_QUEUE_NAME}' initialized`);
}
