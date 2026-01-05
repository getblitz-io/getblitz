import type { PaymentEvent } from "@getblitz/shared-types";
import { PAYMENT_EVENTS_CHANNEL } from "@getblitz/shared-types";

import { getRedisPublisher } from "./client";

/**
 * Publish a payment event to Redis Pub/Sub
 */
export async function publishPaymentEvent(event: PaymentEvent): Promise<void> {
  const publisher = getRedisPublisher();

  try {
    await publisher.publish(PAYMENT_EVENTS_CHANNEL, JSON.stringify(event));
    console.log(
      `Published payment event: ${event.type} for ${event.referenceId}`,
    );
  } catch (error) {
    console.error("Failed to publish payment event:", error);
    throw error;
  }
}
