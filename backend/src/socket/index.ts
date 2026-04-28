import { Server } from "socket.io"
import { Server as HttpServer } from "http"

import { registerBoardEvents } from "@/socket/events/boardEvent.js"
import { registerPresenceEvents } from "@/socket/events/presenceEvents.js"
import { registerChatEvents } from "@/socket/events/chatEvents.js"
import { socketAuth } from "@/socket/middleware/socketAuth.js"


let io: Server;

export const initSocket = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      credentials: true,
    }
  })

  io.use(socketAuth)

  io.on("connection", (socket) => {
    console.log("user connected:", socket.id)

    registerBoardEvents(io, socket)
    registerPresenceEvents(io, socket)
    registerChatEvents(io, socket)
  })

  return io
}

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized")
  }
  return io
}