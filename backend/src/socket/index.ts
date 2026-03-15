import { Server } from "socket.io"
import { Server as HttpServer } from "http"

import { registerMessageEvents } from "@/socket/events/messageEvents.js"
import { registerBoardEvents } from "@/socket/events/boaordEvent.js"
import { registerPresenceEvents } from "@/socket/events/presenceEvents.js"
import { socketAuth } from "@/socket/middleware/socketAuth.js"

export const initSocket = (server: HttpServer) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173"
    }
  })

  io.use(socketAuth)

  io.on("connection", (socket) => {
    console.log("user connected:", socket.id)

    registerMessageEvents(io, socket)
    registerBoardEvents(io, socket)
    registerPresenceEvents(io, socket)
  })

  return io
}