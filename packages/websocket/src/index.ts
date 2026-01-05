import type { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";

import type { WebSocketConfig, WebSocketResult } from "./types";
import { setupSocketHandlers } from "./handlers";
import { createRedisSubscriber } from "./redis-subscriber";

export type { WebSocketConfig, WebSocketResult } from "./types";
export { setupSocketHandlers } from "./handlers";
export { createRedisSubscriber } from "./redis-subscriber";

/**
 * Attach Socket.io to an existing HTTP server with Redis pub/sub
 */
export function attachSocketIO(
  httpServer: HttpServer,
  config: WebSocketConfig,
): WebSocketResult {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.corsOrigins ?? ["http://localhost:3000"],
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  // Setup socket handlers
  setupSocketHandlers(io);

  // Create Redis subscriber
  const redisSubscriber = createRedisSubscriber(config.redisUrl, io);

  console.log("Socket.io attached to HTTP server");

  return { io, redisSubscriber };
}
