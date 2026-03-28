import type { GetBlitzClientConfig, GetBlitzEventCallbacks } from "./types";
import { GetBlitzApiClient } from "./api";
import { GetBlitzSocket } from "./socket";
import { GetBlitzWidget } from "./ui/widget";

export class GetBlitz {
  private config: GetBlitzClientConfig;
  private api: GetBlitzApiClient;
  private socket: GetBlitzSocket;
  private widget: GetBlitzWidget | null = null;
  private callbacks: GetBlitzEventCallbacks = {};

  constructor(config: GetBlitzClientConfig) {
    this.config = config;
    const baseUrl = config.apiUrl ?? window.location.origin;
    this.api = new GetBlitzApiClient(baseUrl);
    // Default wssUrl to same origin (self-hosted mode), can be overridden for split deploys (Vercel)
    this.socket = new GetBlitzSocket(config.wssUrl ?? baseUrl);
  }

  async mount(selector: string): Promise<void> {
    const container = document.querySelector(selector);
    if (!container) throw new Error(`Element not found: ${selector}`);
    // Fetch session details
    const session = await this.api.getSession({
      sessionId: this.config.sessionId,
      clientToken: this.config.clientToken,
    });

    // Connect WebSocket
    await this.socket.connect({
      sessionId: this.config.sessionId,
      clientToken: this.config.clientToken,
    });

    // Listen for payment events
    this.socket.onPaymentUpdate((event) => {
      this.widget?.updateStatus(event.status);

      if (event.status === "PAID" && this.callbacks.onSuccess) {
        this.callbacks.onSuccess(event.clientToken ?? "");
      }
      if (event.status === "PARTIAL" && this.callbacks.onPartial) {
        this.callbacks.onPartial();
      }
      if (event.status === "FAILED" && this.callbacks.onError) {
        this.callbacks.onError(new Error("Payment failed"));
      }
      if (event.status === "EXPIRED" && this.callbacks.onExpired) {
        this.callbacks.onExpired();
      }
    });

    // Render widget
    this.widget = new GetBlitzWidget(
      container as HTMLElement,
      session,
      this.config,
    );
    this.widget.render();
  }

  on<K extends keyof GetBlitzEventCallbacks>(
    event: K,
    callback: NonNullable<GetBlitzEventCallbacks[K]>,
  ): this {
    this.callbacks[event] = callback;
    return this;
  }

  destroy(): void {
    this.socket.disconnect();
    this.widget?.destroy();
    this.widget = null;
  }
}
