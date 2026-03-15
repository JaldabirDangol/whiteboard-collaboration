import { Server, Socket } from "socket.io"

export const registerPresenceEvents = (io: Server, socket: Socket) => {
  // Cursor movement
  socket.on("presence:cursorMove", ({ boardId, position }) => {
    socket.to(boardId).emit("presence:cursorMove", {
      userId: socket.id,
      position,
    })
  })

  
}