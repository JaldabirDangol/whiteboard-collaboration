import { Server, Socket } from "socket.io"

export const registerBoardEvents = (io: Server, socket: Socket) => {

  // join board room
  socket.on("join_board", (boardId: string) => {
    socket.join(boardId)
    console.log(`${socket.id} joined board ${boardId}`)
  })

  // leave board
  socket.on("leave_board", (boardId: string) => {
    socket.leave(boardId)
  })

  // board updated
  socket.on("board_updated", (data) => {
    const { boardId, update } = data

    io.to(boardId).emit("board_update_received", update)
  })

}