import { Server, Socket } from "socket.io";
import * as Y from "yjs";
import { getYDoc } from "@/socket/yjs.js" // Path to the file above

export const registerBoardEvents = (io: Server, socket: Socket) => {

  socket.on("board:join", (boardId: string) => {
    try {
      socket.join(boardId);
      const doc = getYDoc(boardId);

      // 1. Initial Sync: Send the full current state to the new user
      const state = Y.encodeStateAsUpdate(doc);
      socket.emit("board:init", {
        yjsState: state,
        serverTime: Date.now()
      });

      socket.to(boardId).emit("board:userJoined", { userId: socket.id });
    } catch (error) {
      socket.emit("error", { message: "Failed to load board" });
    }
  });

  // 2. Continuous Sync: The "Holy Grail" event
  socket.on("yjs:update", ({ boardId, update }: { boardId: string, update: Uint8Array }) => {
    const doc = getYDoc(boardId);

    // Apply the change to the server's version of the doc
    Y.applyUpdate(doc, new Uint8Array(update));

    // Broadcast that specific change to everyone else in the room
    socket.to(boardId).emit("yjs:update", update);
  });

  socket.on("disconnect", () => {
    socket.broadcast.emit("board:userLeft", { userId: socket.id });
  });
};