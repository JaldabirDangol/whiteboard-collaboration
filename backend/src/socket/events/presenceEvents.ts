import { Server, Socket } from "socket.io"

const onlineUsers = new Map()

export const registerPresenceEvents = (io: Server, socket: Socket) => {

  const userId = socket.data.user?.id

  if (userId) {
    onlineUsers.set(userId, socket.id)

    io.emit("user_online", userId)
  }

  socket.on("typing", (data) => {
    const { boardId, userId } = data

    socket.to(boardId).emit("user_typing", userId)
  })

  socket.on("stop_typing", (data) => {
    const { boardId, userId } = data

    socket.to(boardId).emit("user_stop_typing", userId)
  })

  socket.on("disconnect", () => {
    if (userId) {
      onlineUsers.delete(userId)
      io.emit("user_offline", userId)
    }
  })

}