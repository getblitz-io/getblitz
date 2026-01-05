import type { Socket } from "socket.io-client";
import { io } from "socket.io-client";

import type { PaymentEvent } from "./types";

export class GetBlitzSocket {
  private socket: Socket | null = null;
  private handlers: ((event: PaymentEvent) => void)[] = [];

  constructor(private url: string) {}

  async connect(sessionId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = io(this.url, { transports: ["websocket"] });

      this.socket.on("connect", () => {
        this.socket?.emit("join:session", sessionId);
        resolve();
      });

      this.socket.on("connect_error", (err) => {
        reject(new Error(`WebSocket connection failed: ${err.message}`));
      });

      this.socket.on("payment:update", (event: PaymentEvent) => {
        this.handlers.forEach((h) => h(event));
      });
    });
  }

  onPaymentUpdate(handler: (event: PaymentEvent) => void): void {
    this.handlers.push(handler);
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.handlers = [];
  }
}
