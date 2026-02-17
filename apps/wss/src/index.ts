import { createServer } from "http";

import { attachSocketIO } from "@getblitz/websocket";

import { env } from "./env";

const PORT = parseInt(env.WSS_PORT, 10);
const REDIS_URL = env.REDIS_URL;
const ENCRYPTION_KEY = env.ENCRYPTION_KEY;

function main() {
  console.log("Starting GetBlitz WebSocket Server...");
  console.log(`Port: ${String(PORT)}`);
  console.log(`Redis: ${REDIS_URL}`);
  console.log(`Encryption Key: ${ENCRYPTION_KEY}`);

  // Create HTTP server
  const httpServer = createServer((_req, res) => {
    // Health check endpoint
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }),
    );
  });

  // Attach Socket.io with Redis subscriber
  const { io, redisSubscriber } = attachSocketIO(httpServer, {
    redisUrl: REDIS_URL,
    encryptionKey: ENCRYPTION_KEY,
  });

  // Start HTTP server
  httpServer.listen(PORT, () => {
    console.log(`WebSocket server listening on port ${String(PORT)}`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log("Shutting down...");

    await io.close();
    await redisSubscriber.quit();

    httpServer.close(() => {
      console.log("Server closed");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => {
    shutdown().catch(console.error);
  });
  process.on("SIGINT", () => {
    shutdown().catch(console.error);
  });
}

main();
