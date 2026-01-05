import type { Socket, Server as SocketIOServer } from "socket.io";

/**
 * Setup socket connection handlers
 */
export function setupSocketHandlers(io: SocketIOServer): void {
  io.on("connection", (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Handle joining a payment session room
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

    // Handle joining by reference ID (alternative)
    socket.on("join:reference", (referenceId: string) => {
      if (!referenceId || typeof referenceId !== "string") {
        socket.emit("error", { message: "Invalid reference ID" });
        return;
      }

      // Leave any previous reference rooms
      socket.rooms.forEach((room) => {
        if (room !== socket.id && room.startsWith("ref:")) {
          void socket.leave(room);
        }
      });

      const room = `ref:${referenceId}`;
      void socket.join(room);
      console.log(`Socket ${socket.id} joined room: ${room}`);

      socket.emit("joined", { referenceId, room });
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
  });
}
