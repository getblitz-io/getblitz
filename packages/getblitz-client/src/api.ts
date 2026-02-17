import type { PaymentSessionDetails } from "./types";

export class GetBlitzApiClient {
  constructor(private baseUrl: string) {}

  async getSession({
    sessionId,
    clientToken,
  }: {
    sessionId: string;
    clientToken: string;
  }): Promise<PaymentSessionDetails> {
    const res = await fetch(`${this.baseUrl}/api/v1/sessions/${sessionId}`, {
      headers: {
        Authorization: `Bearer ${clientToken}`,
      },
    });
    if (!res.ok) {
      const error = await res.text().catch(() => "Unknown error");
      throw new Error(`Failed to fetch session: ${error}`);
    }
    return res.json() as Promise<PaymentSessionDetails>;
  }
}
