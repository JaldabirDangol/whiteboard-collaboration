import { io, type Socket } from "socket.io-client";

let sharedSocket: Socket | null = null;
let refCount = 0;

const getSocketUrl = () => {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL;
  }

  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/?$/, "");
  }

  return "http://localhost:3050";
};

export const acquireSocket = (): Socket => {
  if (!sharedSocket) {
    sharedSocket = io(getSocketUrl(), {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });
  }
  refCount++;
  return sharedSocket;
};

export const releaseSocket = () => {
  refCount--;
  if (refCount <= 0 && sharedSocket) {
    sharedSocket.disconnect();
    sharedSocket = null;
    refCount = 0;
  }
};
