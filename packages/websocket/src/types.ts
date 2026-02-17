import type { Server as SocketIOServer } from "socket.io";

import type { getRedisSubscriber } from "@getblitz/redis";
import type { PaymentEvent } from "@getblitz/shared-types";

export interface WebSocketConfig {
  redisUrl: string;
  encryptionKey: string;
}

export interface PaymentSessionData {
  sessionId: string;
  organizationId: string;
  typ: "payment_socket";
  iat?: number;
  exp?: number;
}

export interface ClientToServerEvents {
  "join:session": (sessionId: string) => void;
  "leave:session": (sessionId: string) => void;
}

export interface ServerToClientEvents {
  joined: (payload: {
    sessionId?: string;
    referenceId?: string;
    room: string;
  }) => void;
  error: (error: { message: string }) => void;
  "payment:update": (event: PaymentEvent) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  session?: PaymentSessionData;
}

export type TypedSocketIOServer = SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export interface WebSocketResult {
  io: TypedSocketIOServer;
  redisSubscriber: ReturnType<typeof getRedisSubscriber>;
}
