import type { Server as SocketIOServer } from "socket.io";

import type { Redis } from "@getblitz/redis";
import type { PaymentEvent } from "@getblitz/shared-types";
import { getRedisSubscriber } from "@getblitz/redis";
import {
  PAYMENT_EVENTS_CHANNEL,
  PaymentEventSchema,
} from "@getblitz/shared-types";

export function createRedisSubscriber(
  redisUrl: string,
  io: SocketIOServer,
): Redis {
  const subscriber = getRedisSubscriber(redisUrl);

  subscriber.on("connect", () => {
    console.log("Redis Subscriber connected");
  });

  subscriber.on("error", (err: Error) => {
    console.error("Redis Subscriber error:", err);
  });

  // Subscribe to payment events channel
  void subscriber
    .subscribe(PAYMENT_EVENTS_CHANNEL)
    .then((count) => {
      console.log(
        `Subscribed to ${String(count)} channel(s): ${PAYMENT_EVENTS_CHANNEL}`,
      );
    })
    .catch((err: Error) => {
      console.error("Failed to subscribe to payment events:", err);
    });

  // Handle incoming messages
  subscriber.on("message", (channel: string, message: string) => {
    if (channel !== PAYMENT_EVENTS_CHANNEL) return;

    try {
      const parsed: unknown = JSON.parse(message);
      const result = PaymentEventSchema.safeParse(parsed);

      if (!result.success) {
        console.error("Invalid payment event:", result.error);
        return;
      }

      const event = result.data;
      handlePaymentEvent(io, event);
    } catch (error) {
      console.error("Error processing Redis message:", error);
    }
  });

  return subscriber;
}

function handlePaymentEvent(io: SocketIOServer, event: PaymentEvent): void {
  console.log(
    `Processing payment event: ${event.type} for ${event.referenceId}`,
  );

  // Emit to session room
  io.to(`session:${event.sessionId}`).emit("payment:update", event);

  // Also emit to reference room
  io.to(`ref:${event.referenceId}`).emit("payment:update", event);

  // Log room membership for debugging
  const sessionRoom = io.sockets.adapter.rooms.get(
    `session:${event.sessionId}`,
  );
  const refRoom = io.sockets.adapter.rooms.get(`ref:${event.referenceId}`);

  console.log(
    `Emitted to ${String(sessionRoom?.size ?? 0)} clients in session room, ` +
      `${String(refRoom?.size ?? 0)} clients in reference room`,
  );
}
