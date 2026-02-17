/* eslint-disable turbo/no-undeclared-env-vars, no-restricted-properties */
// This is a custom server that runs outside of Next.js's normal build process,
// so we need to use process.env directly instead of the validated env module.

import { createServer } from "http";
import next from "next";

import { attachSocketIO } from "@getblitz/websocket";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME ?? "localhost";
const port = parseInt(process.env.PORT ?? "3000", 10);
const encryptionKey = process.env.ENCRYPTION_KEY;

if (!encryptionKey) {
  throw new Error("ENCRYPTION_KEY is not defined");
}

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    const httpServer = createServer((req, res) => {
      handle(req, res).catch((err: unknown) => {
        console.error("Error handling request:", err);
        res.statusCode = 500;
        res.end("Internal Server Error");
      });
    });

    // Conditionally attach Socket.io if ENABLE_WEBSOCKET is set
    if (process.env.ENABLE_WEBSOCKET === "true") {
      const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6380";

      console.log("Attaching WebSocket server...");
      console.log(`Redis URL: ${redisUrl}`);
      console.log(`Encryption Key: ${encryptionKey}`);

      attachSocketIO(httpServer, {
        redisUrl,
        encryptionKey,
      });
    }

    httpServer.listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
      if (process.env.ENABLE_WEBSOCKET === "true") {
        console.log(`> WebSocket server integrated on same port`);
      }
    });

    // Graceful shutdown
    const shutdown = () => {
      console.log("Shutting down...");
      httpServer.close(() => {
        console.log("Server closed");
        process.exit(0);
      });
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  })
  .catch((err: unknown) => {
    console.error("Error starting server:", err);
    process.exit(1);
  });
