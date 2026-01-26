import { createQueue } from "@getblitz/queue";

export const CLEANUP_BANK_CONNECTIONS_QUEUE_NAME = "cleanup-bank-connections";

// Empty payload - the worker cleans up all expired connections
export type CleanupBankConnectionsJobPayload = Record<string, never>;

export const cleanupBankConnectionsQueue =
  createQueue<CleanupBankConnectionsJobPayload>(
    CLEANUP_BANK_CONNECTIONS_QUEUE_NAME,
  );

/**
 * Register the repeatable job for cleaning up bank connections
 * This should be called once during worker initialization
 */
export async function registerCleanupBankConnectionsJob(): Promise<void> {
  await cleanupBankConnectionsQueue.add(
    "cleanup-bank-connections",
    {},
    {
      repeat: {
        pattern: "0 0 * * *", // Daily at midnight
      },
      removeOnComplete: true,
      removeOnFail: 100, // Keep last 100 failed jobs for debugging
    },
  );
}
