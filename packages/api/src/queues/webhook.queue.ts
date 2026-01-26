import type { Job } from "@getblitz/queue";
import { createQueue } from "@getblitz/queue";

import type { WebhookEventType } from "../interfaces";

export const WEBHOOK_QUEUE_NAME = "webhook-delivery";

export interface WebhookJobPayload {
  sessionId: string;
  event: WebhookEventType;
}

export const webhookQueue = createQueue<WebhookJobPayload>(WEBHOOK_QUEUE_NAME);

export async function addWebhookJob(
  payload: WebhookJobPayload,
): Promise<Job<WebhookJobPayload>> {
  return webhookQueue.add("process-webhook", payload, {
    attempts: 5,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: true,
  });
}
