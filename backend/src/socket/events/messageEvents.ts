import { Server, Socket } from "socket.io"

export const registerMessageEvents = (io: Server, socket: Socket) => {

  socket.on("send_message", (data) => {
    const boardId = data.boardId

    io.to(boardId).emit("receive_message", data)
  })

}