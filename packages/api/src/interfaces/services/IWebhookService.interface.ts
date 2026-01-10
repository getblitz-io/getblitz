import type { WebhookEventType } from "..";

export interface IWebhookService {
  notifyMerchant({
    sessionId,
    event,
  }: {
    sessionId: string;
    event: WebhookEventType;
  }): Promise<void>;
}
