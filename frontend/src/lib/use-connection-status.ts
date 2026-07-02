"use client";

import { useEffect, useState, startTransition } from "react";
import { acquireSocket, releaseSocket } from "./board-socket";

export type ConnectionStatus = "connected" | "connecting" | "disconnected" | "error";

export const useConnectionStatus = () => {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");

  useEffect(() => {
    const socket = acquireSocket();

    const onConnect = () => setStatus("connected");
    const onDisconnect = () => setStatus("disconnected");
    const onConnectError = () => setStatus("error");

    if (socket.connected) {
      startTransition(() => setStatus("connected"));
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      releaseSocket();
    };
  }, []);

  return status;
};
