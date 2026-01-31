import type { Job } from "@getblitz/queue";
import { createWorker } from "@getblitz/queue";

import type { WebhookJobPayload } from "./webhook.queue";
import { getContainer } from "../container";
import { webhookLogger } from "../utils";
import { WEBHOOK_QUEUE_NAME } from "./webhook.queue";

/**
 * Initialize the webhook worker
 * This should be called from the instrumentation hook or a dedicated worker process
 */
export function initWebhookWorker() {
  createWorker<WebhookJobPayload>(
    WEBHOOK_QUEUE_NAME,
    async (job: Job<WebhookJobPayload>) => {
      const { sessionId, event } = job.data;
      webhookLogger.info(
        `Processing webhook job for session: ${sessionId}, event: ${event}`,
      );
      const container = getContainer();
      const { webhookService } = container;
      try {
        await webhookService.processWebhookForSession({ sessionId, event });
      } catch (error) {
        webhookLogger.error(`Failed to process webhook job ${job.id}:`, {
          error: String(error),
        });
        throw error;
      }
    },
    {
      concurrency: 5,
    },
  );

  webhookLogger.info(`Worker '${WEBHOOK_QUEUE_NAME}' initialized`);
}
