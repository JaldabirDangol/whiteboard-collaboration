import { Server, Socket } from "socket.io"

export const registerPresenceEvents = (io: Server, socket: Socket) => {
  let activeBoardId: string | null = null

  socket.on("presence:join", ({ boardId }: { boardId: string }) => {
    activeBoardId = boardId
    socket.join(boardId)

    socket.to(boardId).emit("presence:userOnline", {
      userId: socket.data.user?.id ?? socket.id,
      status: "online",
    })
  })

  socket.on("presence:leave", ({ boardId }: { boardId: string }) => {
    socket.leave(boardId)

    if (activeBoardId === boardId) {
      activeBoardId = null
    }

    socket.to(boardId).emit("presence:userOffline", {
      userId: socket.data.user?.id ?? socket.id,
      status: "offline",
    })
  })

  // Cursor movement
  socket.on("presence:cursorMove", ({ boardId, position }: { boardId: string; position: { x: number; y: number } }) => {
    socket.to(boardId).emit("presence:cursorMove", {
      userId: socket.data.user?.id ?? socket.id,
      position,
    })
  })

  socket.on("disconnect", () => {
    if (!activeBoardId) return

    socket.to(activeBoardId).emit("presence:userOffline", {
      userId: socket.data.user?.id ?? socket.id,
      status: "offline",
    })
  })
}