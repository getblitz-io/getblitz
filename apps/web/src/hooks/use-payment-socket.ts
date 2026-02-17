"use client";

import type { Socket } from "socket.io-client";
import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

import type { PaymentEvent } from "@getblitz/shared-types";

import { env } from "~/env";

interface UsePaymentSocketOptions {
  sessionId?: string;
  clientToken?: string;
  onPaymentUpdate: (event: PaymentEvent) => void;
}

interface UsePaymentSocketReturn {
  isConnected: boolean;
  error: string | null;
  lastEvent: PaymentEvent | null;
}

export function usePaymentSocket({
  sessionId,
  clientToken,
  onPaymentUpdate,
}: UsePaymentSocketOptions): UsePaymentSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<PaymentEvent | null>(null);

  // Stable callback ref
  const onPaymentUpdateRef = useRef(onPaymentUpdate);

  useEffect(() => {
    onPaymentUpdateRef.current = onPaymentUpdate;
  }, [onPaymentUpdate]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    if (!sessionId || !clientToken) return;

    const wssUrl = env.NEXT_PUBLIC_WSS_URL;

    const socket = io(wssUrl, {
      transports: ["websocket"],
      auth: { token: clientToken },
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join:session", sessionId);
      setIsConnected(true);
      setError(null);
    });

    socket.on("connect_error", (err) => {
      setError(`Connection failed: ${err.message}`);
      setIsConnected(false);
    });

    socket.on("joined", (data: { sessionId: string; room: string }) => {
      console.log(`Joined payment session room: ${data.room}`);
    });

    socket.on("payment:update", (event: PaymentEvent) => {
      setLastEvent(event);
      onPaymentUpdateRef.current(event);
    });

    return () => {
      disconnect();
    };
  }, [sessionId, clientToken, disconnect]);

  return { isConnected, error, lastEvent };
}
