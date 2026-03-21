import { Server, Socket } from "socket.io"
import * as Y from "yjs"
import { getYDoc } from "../../../../frontend/src/yjs"

export const registerBoardEvents = (io: Server, socket: Socket) => {

  // JOIN BOARD
  socket.on("board:join", async (boardId: string) => {
    try {
      socket.join(boardId)

      const doc = getYDoc(boardId)

      // Send Yjs state instead of shapes array
      const state = Y.encodeStateAsUpdate(doc)

      socket.emit("board:init", {
        yjsState: state,
        serverTime: Date.now()
      })

      socket.to(boardId).emit("board:userJoined", {
        userId: socket.id,
        userName: socket.data.userName
      })

    } catch (error) {
      socket.emit("error", { message: "Failed to load board data" })
    }
  })

  // 🔥 MAIN SYNC EVENT (THIS REPLACES EVERYTHING)
  socket.on("yjs:update", ({ boardId, update }) => {
    const doc = getYDoc(boardId)

    // Apply update to server doc
    Y.applyUpdate(doc, update)

    // Broadcast to others
    socket.to(boardId).emit("yjs:update", update)
  })

  // DISCONNECT
  socket.on("disconnect", () => {
    socket.broadcast.emit("board:userLeft", {
      userId: socket.id
    })
  })
}