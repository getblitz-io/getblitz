import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { IPaymentSessionRepository } from "../interfaces";
import { addWebhookJob } from "../queues/webhook.queue";
import { WebhookService } from "./webhook.service";

vi.mock("../queues/webhook.queue", () => ({
  addWebhookJob: vi.fn(),
}));

describe("WebhookService", () => {
  let service: WebhookService;
  const mockSessionRepo = {
    findById: vi.fn(),
    create: vi.fn(),
    findByReferenceId: vi.fn(),
    updateStatus: vi.fn(),
    updateStatusWithToken: vi.fn(),
    expirePendingSessions: vi.fn(),
    findByOrgIds: vi.fn(),
  };

  beforeAll(() => {
    service = new WebhookService(
      mockSessionRepo as unknown as IPaymentSessionRepository,
    );
  });

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });
  });

  describe("notifyMerchant", () => {
    it("should enqueue a webhook job", async () => {
      const sessionId = "session-1";
      const event = "payment.success";

      await service.notifyMerchant({ sessionId, event });

      expect(addWebhookJob).toHaveBeenCalledWith({ sessionId, event });
    });
  });

  describe("processWebhookForSession", () => {
    it("should send webhook if session and webhook exists", async () => {
      const session = {
        id: "session-1",
        referenceId: "ref-1",
        merchantReferenceId: "order-123",
        amountCents: 1000,
        amountPaidCents: 1000,
        currency: "EUR",
        organization: {
          webhooks: [
            {
              webhookUrl: "https://hook.test",
              webhookSecret: "secret",
              notifyPaymentSuccess: true,
            },
          ],
        },
        bankAccount: {
          accountName: "Test Account",
          accountIban: "DE89370400440532013000",
          accountBic: "COBADEFFXXX",
          organizationBankConnection: {
            id: "conn-1",
            name: "Test Connection",
            providerId: "test-bank",
          },
        },
      };
      mockSessionRepo.findById.mockResolvedValue(session);

      await service.processWebhookForSession({
        sessionId: "session-1",
        event: "payment.success",
      });

      expect(global.fetch).toHaveBeenCalledWith(
        "https://hook.test",
        expect.objectContaining({
          method: "POST",
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          headers: expect.objectContaining({
            "X-GetBlitz-Event": "payment.success",
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            "X-GetBlitz-Signature": expect.any(String),
          }),
        }),
      );
    });

    it("should do nothing if no webhooks configured", async () => {
      const session = {
        id: "session-1",
        organization: { webhooks: [] },
        bankAccount: {
          organizationBankConnection: { providerId: "test" },
        },
      };
      mockSessionRepo.findById.mockResolvedValue(session);

      await service.processWebhookForSession({
        sessionId: "session-1",
        event: "payment.success",
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("should do nothing if session is not found", async () => {
      mockSessionRepo.findById.mockResolvedValue(null);

      await service.processWebhookForSession({
        sessionId: "unknown",
        event: "payment.success",
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("should respect webhook event filters", async () => {
      const session = {
        id: "session-1",
        organization: {
          webhooks: [
            {
              webhookUrl: "https://hook.test",
              notifyPaymentSuccess: false, // Filter out success
            },
          ],
        },
        bankAccount: {
          organizationBankConnection: { providerId: "test" },
        },
      };
      mockSessionRepo.findById.mockResolvedValue(session);

      await service.processWebhookForSession({
        sessionId: "session-1",
        event: "payment.success",
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
