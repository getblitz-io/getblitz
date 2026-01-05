import type { Server as SocketIOServer } from "socket.io";

import type { getRedisSubscriber } from "@getblitz/redis";

export interface WebSocketConfig {
  redisUrl: string;
  corsOrigins?: string[];
}

export interface WebSocketResult {
  io: SocketIOServer;
  redisSubscriber: ReturnType<typeof getRedisSubscriber>;
}
