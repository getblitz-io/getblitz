import { createQueue } from "@getblitz/queue";

export const EXPIRE_SESSIONS_QUEUE_NAME = "expire-sessions";

// Empty payload - the worker processes all expired sessions
export type ExpireSessionsJobPayload = Record<string, never>;

export const expireSessionsQueue = createQueue<ExpireSessionsJobPayload>(
  EXPIRE_SESSIONS_QUEUE_NAME,
);

/**
 * Register the repeatable job for expiring sessions
 * This should be called once during worker initialization
 */
export async function registerExpireSessionsJob(): Promise<void> {
  await expireSessionsQueue.add(
    "expire-sessions",
    {},
    {
      repeat: {
        every: 60_000, // Every 60 seconds
      },
      removeOnComplete: true,
      removeOnFail: 100, // Keep last 100 failed jobs for debugging
    },
  );
}
