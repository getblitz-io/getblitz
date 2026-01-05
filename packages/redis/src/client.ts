import Redis from "ioredis";

import { env } from "./env";

let redisClient: Redis | null = null;
let redisPublisher: Redis | null = null;
let redisSubscriber: Redis | null = null;

function getRedisUrl(): string {
  return env.REDIS_URL;
}

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(getRedisUrl(), {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    redisClient.on("error", (err: Error) => {
      console.error("Redis Client Error:", err);
    });

    redisClient.on("connect", () => {
      console.log("Redis Client Connected");
    });
  }
  return redisClient;
}

/**
 * Get a dedicated publisher instance for Pub/Sub
 * (Publisher should not be used for regular commands when subscribed)
 */
export function getRedisPublisher(): Redis {
  if (!redisPublisher) {
    redisPublisher = new Redis(getRedisUrl(), {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    redisPublisher.on("error", (err: Error) => {
      console.error("Redis Publisher Error:", err);
    });
  }
  return redisPublisher;
}

/**
 * Get a dedicated subscriber instance for Pub/Sub
 * (Subscriber should not be used for regular commands when subscribed)
 * @param redisUrl - Optional Redis URL. If not provided, uses REDIS_URL env var or default
 */
export function getRedisSubscriber(redisUrl?: string): Redis {
  if (!redisSubscriber) {
    const url = redisUrl ?? getRedisUrl();
    redisSubscriber = new Redis(url, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    redisSubscriber.on("error", (err: Error) => {
      console.error("Redis Subscriber Error:", err);
    });

    redisSubscriber.on("connect", () => {
      console.log("Redis Subscriber Connected");
    });
  }
  return redisSubscriber;
}

export async function closeRedisConnections(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
  if (redisPublisher) {
    await redisPublisher.quit();
    redisPublisher = null;
  }
  if (redisSubscriber) {
    await redisSubscriber.quit();
    redisSubscriber = null;
  }
}
