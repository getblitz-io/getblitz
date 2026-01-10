import type { BankWebhookResult } from "..";

export interface IBankWebhookService {
  /** Process webhook by connection ID */
  processWebhookByConnectionId({
    connectionId,
    request,
  }: {
    connectionId: string;
    request: Request;
  }): Promise<BankWebhookResult>;
}
