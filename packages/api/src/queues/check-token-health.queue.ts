import { createQueue } from "@getblitz/queue";

export const CHECK_TOKEN_HEALTH_QUEUE_NAME = "check-token-health";

export type CheckTokenHealthJobPayload = Record<string, never>;

export const checkTokenHealthQueue = createQueue<CheckTokenHealthJobPayload>(
  CHECK_TOKEN_HEALTH_QUEUE_NAME,
);

export async function registerCheckTokenHealthJob(): Promise<void> {
  await checkTokenHealthQueue.add(
    "check-token-health",
    {},
    {
      repeat: {
        every: 6 * 60 * 60 * 1000, // Every 6 hours
      },
      removeOnComplete: true,
      removeOnFail: 100, // Keep last 100 failed jobs for debugging
    },
  );
}
