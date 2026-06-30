import { Server } from "socket.io"
import { Server as HttpServer } from "http"

import { registerBoardEvents } from "@/socket/events/boardEvent.js"
import { registerPresenceEvents } from "@/socket/events/presenceEvents.js"
import { registerChatEvents } from "@/socket/events/chatEvents.js"
import { registerCommentEvents } from "@/socket/events/commentEvents.js"
import { socketAuth } from "@/socket/middleware/socketAuth.js"
import { checkRateLimit } from "@/socket/rateLimiter.js"


let io: Server;

// Rate-limited events — blocked events emit a "rate:limited" back to the client
const RATE_LIMITED_EVENTS = new Set([
  "yjs:update", "laser:stroke", "presence:cursorMove",
  "chat:send", "chat:delete", "comment:add", "comment:delete",
  "board:undo", "board:redo",
]);

const wrapWithRateLimit = <T extends (...args: unknown[]) => void>(socketId: string, event: string, handler: T): T => {
  if (!RATE_LIMITED_EVENTS.has(event)) return handler;
  return ((...args: unknown[]) => {
    if (!checkRateLimit(socketId, event)) {
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

  io.on("connection", (socket) => {
    // Override socket.on to wrap rate-limited events
    const origOn = socket.on.bind(socket);
    socket.on = ((event: string, handler: (...args: unknown[]) => void) => {
      return origOn(event, wrapWithRateLimit(socket.id, event, handler));
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