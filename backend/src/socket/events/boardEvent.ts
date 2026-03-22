import { Server, Socket } from "socket.io";
import * as Y from "yjs";
import { getYDoc } from "@/socket/yjs.js" // Path to the file above

const undoManagers = new Map<string, Y.UndoManager>();

const getUndoManager = (boardId: string, doc: Y.Doc) => {
  if (undoManagers.has(boardId)) {
    return undoManagers.get(boardId)!;
  }

  const boardMap = doc.getMap("board");
  const undoManager = new Y.UndoManager(boardMap);
  undoManagers.set(boardId, undoManager);
  return undoManager;
};

export const registerBoardEvents = (io: Server, socket: Socket) => {
  let activeBoardId: string | null = null;

  socket.on("board:join", (boardId: string) => {
    try {
      if (activeBoardId && activeBoardId !== boardId) {
        socket.leave(activeBoardId);
      }

      activeBoardId = boardId;
      socket.join(boardId);
      const doc = getYDoc(boardId);
      getUndoManager(boardId, doc);

      // 1. Initial Sync: Send the full current state to the new user
      const state = Y.encodeStateAsUpdate(doc);
      socket.emit("board:init", {
        yjsState: state,
        serverTime: Date.now(),
      });

      socket.to(boardId).emit("board:userJoined", {
        userId: socket.data.user?.id ?? socket.id,
      });
    } catch (error) {
      socket.emit("error", { message: "Failed to load board" });
    }
  });

  socket.on("board:leave", (boardId: string) => {
    socket.leave(boardId);
    if (activeBoardId === boardId) {
      activeBoardId = null;
    }

    socket.to(boardId).emit("board:userLeft", {
      userId: socket.data.user?.id ?? socket.id,
    });
  });

  // 2. Continuous Sync: The "Holy Grail" event
  socket.on("yjs:update", ({ boardId, update }: { boardId: string, update: Uint8Array }) => {
    const doc = getYDoc(boardId);

    // Apply the change to the server's version of the doc
    Y.applyUpdate(doc, new Uint8Array(update));

    // Broadcast that specific change to everyone else in the room
    socket.to(boardId).emit("yjs:update", update);
  });

  socket.on("board:undo", ({ boardId }: { boardId: string }) => {
    const doc = getYDoc(boardId);
    const undoManager = getUndoManager(boardId, doc);

    undoManager.undo();
    const state = Y.encodeStateAsUpdate(doc);
    io.to(boardId).emit("board:state", state);
  });

  socket.on("board:redo", ({ boardId }: { boardId: string }) => {
    const doc = getYDoc(boardId);
    const undoManager = getUndoManager(boardId, doc);

    undoManager.redo();
    const state = Y.encodeStateAsUpdate(doc);
    io.to(boardId).emit("board:state", state);
  });

  socket.on("disconnect", () => {
    if (!activeBoardId) return;

    socket.to(activeBoardId).emit("board:userLeft", {
      userId: socket.data.user?.id ?? socket.id,
    });
  });
};