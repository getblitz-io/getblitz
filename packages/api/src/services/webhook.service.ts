import { createHmac } from "crypto";

import type { OrganizationWebhook } from "@getblitz/database";

import type {
  IPaymentSessionRepository,
  IWebhookService,
  WebhookEventType,
} from "../interfaces";

export interface MerchantWebhookPayload {
  event: WebhookEventType;
  sessionId: string;
  referenceId: string;
  amountCents: number;
  currency: string;
  provider: string;
  clientToken?: string;
  timestamp: string;
}

export class WebhookService implements IWebhookService {
  constructor(
    private readonly paymentSessionRepository: IPaymentSessionRepository,
  ) {}

  /**
   * Notify merchant's webhook URL about payment events
   * Implements a cascade: Organization level first, then BankAccount level override
   */
  async notifyMerchant({
    sessionId,
    event,
  }: {
    sessionId: string;
    event: WebhookEventType;
  }): Promise<void> {
    const session = await this.paymentSessionRepository.findById({
      id: sessionId,
    });

    if (!session) {
      console.error(
        "Webhook notification failed: Session not found",
        sessionId,
      );
      return;
    }

    const provider = session.bankAccount.organizationBankConnection.providerId;
    if (!provider) {
      console.error(
        "Webhook notification failed: Provider not found",
        sessionId,
      );
      return;
    }

    const payload: MerchantWebhookPayload = {
      event,
      sessionId: session.id,
      referenceId: session.referenceId,
      amountCents: session.amountCents,
      currency: session.currency,
      provider,
      clientToken: session.clientToken ?? undefined,
      timestamp: new Date().toISOString(),
    };

    // 1. Notify Organization-level webhook
    if (session.organization.webhooks.length === 0) {
      return;
    }
    const requests: Promise<void>[] = [];
    for (const webhook of session.organization.webhooks) {
      if (this.shouldNotifyOrg({ webhook, event })) {
        requests.push(
          this.sendWebhook({
            url: webhook.webhookUrl,
            payload,
            secret: webhook.webhookSecret,
          }).catch((err) => console.error("Org-level webhook failed:", err)),
        );
      }
    }
    // no await so we don't block the main thread
    // todo: move to a background job
    Promise.all(requests).catch((err) =>
      console.error("Webhook notification failed:", err),
    );
  }

  private shouldNotifyOrg({
    webhook,
    event,
  }: {
    webhook: OrganizationWebhook;
    event: WebhookEventType;
  }): boolean {
    switch (event) {
      case "payment.success":
        return webhook.notifyPaymentSuccess;
      case "payment.failed":
        return webhook.notifyPaymentFailed;
      case "payment.expired":
        return webhook.notifyPaymentExpired;
      default:
        return false;
    }
  }

  private async sendWebhook({
    url,
    payload,
    secret,
  }: {
    url: string;
    payload: MerchantWebhookPayload;
    secret?: string;
  }): Promise<void> {
    const body = JSON.stringify(payload);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-getblitz-Event": payload.event,
    };

    if (secret) {
      headers["X-getblitz-Signature"] = createHmac("sha256", secret)
        .update(body)
        .digest("hex");
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body,
    });

    if (!response.ok) {
      throw new Error(
        `Webhook responded with ${response.status}: ${response.statusText}`,
      );
    }
  }
}
