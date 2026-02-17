import type { Socket } from "socket.io";
import { jwtVerify } from "jose";

import type {
  ClientToServerEvents,
  InterServerEvents,
  PaymentSessionData,
  ServerToClientEvents,
  SocketData,
  TypedSocketIOServer,
} from "./types";

/**
 * Setup socket connection handlers
 */
export function setupSocketHandlers({
  io,
  encryptionKey,
}: {
  io: TypedSocketIOServer;
  encryptionKey: string;
}): void {
  const secret = new TextEncoder().encode(encryptionKey);

  // Auth middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;

    if (!token) {
      next(new Error("Authentication error: Token missing"));
      return;
    }

    void (async () => {
      try {
        const { payload } = await jwtVerify(token, secret);
        // Validate token type
        if (payload.typ !== "payment_socket") {
          next(new Error("Authentication error: Invalid token type"));
          return;
        }

        socket.data.session = payload as unknown as PaymentSessionData;
        next();
      } catch (err) {
        console.error("Token verification failed:", err);
        next(new Error("Authentication error: Invalid token"));
      }
    })();
  });

  io.on(
    "connection",
    (
      socket: Socket<
        ClientToServerEvents,
        ServerToClientEvents,
        InterServerEvents,
        SocketData
      >,
    ) => {
      console.log(`Client connected: ${socket.id}`);

      // Auto-join session room from token
      const sessionData = socket.data.session;

      if (sessionData?.sessionId) {
        const sessionId = sessionData.sessionId;
        const room = `session:${sessionId}`;
        void socket.join(room);
        console.log(`Socket ${socket.id} auto-joined room: ${room}`);
        socket.emit("joined", { sessionId, room });
      }

      // Handle joining a payment session room (Legacy/Manual)
      socket.on("join:session", (sessionId: string) => {
        if (!sessionId || typeof sessionId !== "string") {
          socket.emit("error", { message: "Invalid session ID" });
          return;
        }

        // Leave any previous session rooms
        socket.rooms.forEach((room) => {
          if (room !== socket.id && room.startsWith("session:")) {
            void socket.leave(room);
          }
        });

        // Join the new session room
        const room = `session:${sessionId}`;
        void socket.join(room);
        console.log(`Socket ${socket.id} joined room: ${room}`);

        socket.emit("joined", { sessionId, room });
      });

      // Handle leaving a room
      socket.on("leave:session", (sessionId: string) => {
        const room = `session:${sessionId}`;
        void socket.leave(room);
        console.log(`Socket ${socket.id} left room: ${room}`);
      });

      // Handle disconnect
      socket.on("disconnect", (reason) => {
        console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
      });

      // Handle errors
      socket.on("error", (error) => {
        console.error(`Socket error for ${socket.id}:`, error);
      });
    },
  );
}
