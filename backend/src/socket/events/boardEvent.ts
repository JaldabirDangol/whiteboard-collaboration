import { Server, Socket } from "socket.io"
import * as boardServices from "@/controllers/boards/boardServices.js"

export const registerBoardEvents = (io: Server, socket: Socket) => {
    socket.on("board:update", (data) => {
    socket.to(data.boardId).emit("board:update", data)
  })

socket.on("board:join", async (boardId: string) => {
  try {
    socket.join(boardId);

    const [shapes, messages] = await Promise.all([
      boardServices.getShapes(boardId),
      boardServices.getRecentMessages(boardId)
    ]);

    socket.emit("board:init", {
      shapes,
      messages,
      serverTime: Date.now() 
    });

    socket.to(boardId).emit("board:userJoined", { 
      userId: socket.id,
      userName: socket.data.userName 
    });

  } catch (error) {
    socket.emit("error", { message: "Failed to load board data" });
  }
});

  socket.on("board:elementUpdate", (data) => {
    socket.to(data.boardId).emit("board:elementUpdate", data)
  })

  socket.on("board:elementDelete", (data) => {
    socket.to(data.boardId).emit("board:elementDelete", data)
  })

  socket.on("board:clear", (boardId) => {
    socket.to(boardId).emit("board:clear")
  })

  socket.on("board:draw", (data) => {
    socket.to(data.boardId).emit("board:draw", data)
  })

  socket.on("disconnect", (boardId: string) => {
      socket.to(boardId).emit("board:userLeft", { userId: socket.id })
  })
}