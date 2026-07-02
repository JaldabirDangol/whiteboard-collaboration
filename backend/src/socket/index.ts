import { Server, Socket } from "socket.io"
import { Server as HttpServer } from "http"

import { registerBoardEvents } from "@/socket/events/boardEvent.js"
import { registerPresenceEvents } from "@/socket/events/presenceEvents.js"
import { registerChatEvents } from "@/socket/events/chatEvents.js"
import { registerCommentEvents } from "@/socket/events/commentEvents.js"
import { socketAuth } from "@/socket/middleware/socketAuth.js"
import { checkRateLimit, startCleanup } from "@/socket/rateLimiter.js"


let io: Server;

const RATE_LIMITED_EVENTS = new Set([
  "yjs:update", "laser:stroke", "presence:cursorMove",
  "chat:send", "chat:delete", "comment:add", "comment:delete",
  "board:undo", "board:redo",
]);

const wrapWithRateLimit = <T extends (...args: unknown[]) => void>(socket: Socket, event: string, handler: T): T => {
  if (!RATE_LIMITED_EVENTS.has(event)) return handler;
  return ((...args: unknown[]) => {
    if (!checkRateLimit(socket.id, event)) {
      socket.emit("rate:limited", { event });
      return;
    }
    return handler(...args);
  }) as T;
};

export const initSocket = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      credentials: true,
    }
  })

  io.use(socketAuth)
  startCleanup()

  io.on("connection", (socket) => {
    // Wrap socket.on to inject rate-limiting on high-frequency events.
    // Note: overriding socket.on means socket.off may not match the original
    // handler identity. Currently no backend code uses socket.off.
    const origOn = socket.on.bind(socket);
    socket.on = ((event: string, handler: (...args: unknown[]) => void) => {
      return origOn(event, wrapWithRateLimit(socket, event, handler));
    }) as typeof socket.on;

    registerBoardEvents(io, socket)
    registerPresenceEvents(io, socket)
    registerChatEvents(io, socket)
    registerCommentEvents(io, socket)

    const userId = socket.data.user?.id;
    if (userId) {
      socket.join(`user:${userId}`);
    }
  })

  return io
}

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized")
  }
  return io
}