import { Server, Socket } from "socket.io";
import * as Y from "yjs";
import { getYDoc } from "@/socket/yjs.js" // Path to the file above
import {
  getBoardShapesFromDatabase,
  getLatestBoardSnapshot,
  replaceBoardShapes,
  saveBoardSnapshot,
} from "@/controllers/boards/boardServices.js";
import { canAccessBoard, canEditBoard } from "@/socket/boardAccess.js";

const undoManagers = new Map<string, Y.UndoManager>();
const persistTimers = new Map<string, ReturnType<typeof setTimeout>>();

const SHAPES_KEY = "shapes";
const CLIENT_UPDATE_ORIGIN = "client-update";
const PERSIST_DEBOUNCE_MS = 2000;

const toUint8 = (value: unknown): Uint8Array => {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (Array.isArray(value)) return new Uint8Array(value);
  if (value && typeof value === "object") {
    const arrLike = value as { data?: number[] };
    if (Array.isArray(arrLike.data)) {
      return new Uint8Array(arrLike.data);
    }
  }
  return new Uint8Array();
};

const parseShapesFromYDoc = (doc: Y.Doc) => {
  const boardMap = doc.getMap<string>("board");
  const rawShapes = boardMap.get(SHAPES_KEY);

  if (!rawShapes || typeof rawShapes !== "string") {
    return [];
  }

  try {
    const parsed = JSON.parse(rawShapes);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const hydrateDocFromPersistence = async (boardId: string, doc: Y.Doc) => {
  const boardMap = doc.getMap<string>("board");
  const inMemoryShapes = parseShapesFromYDoc(doc);

  // If we already have in-memory content, keep it as source of truth.
  if (inMemoryShapes.length > 0) {
    return;
  }

  const shapesFromDb = await getBoardShapesFromDatabase(boardId);
  if (shapesFromDb.length > 0) {
    boardMap.set(SHAPES_KEY, JSON.stringify(shapesFromDb));
    return;
  }

  const latestSnapshot = await getLatestBoardSnapshot(boardId);
  if (!latestSnapshot || typeof latestSnapshot.data !== "object" || latestSnapshot.data === null) {
    return;
  }

  const snapshotData = latestSnapshot.data as { shapes?: unknown };
  const shapes = Array.isArray(snapshotData.shapes) ? snapshotData.shapes : [];

  if (shapes.length === 0) {
    return;
  }

  boardMap.set(SHAPES_KEY, JSON.stringify(shapes));
};

const persistBoardStateNow = async (boardId: string, doc: Y.Doc, userId?: string) => {
  try {
    const shapes = parseShapesFromYDoc(doc);
    await saveBoardSnapshot(boardId, { shapes });

    if (userId) {
      await replaceBoardShapes(boardId, userId, shapes as Record<string, unknown>[]);
    }
  } catch (error) {
    console.error("[board:persist] immediate persist failed", { boardId, error });
  }
};

const debouncedPersist = (boardId: string, doc: Y.Doc, userId?: string) => {
  const existing = persistTimers.get(boardId);
  if (existing) clearTimeout(existing);

  persistTimers.set(
    boardId,
    setTimeout(async () => {
      persistTimers.delete(boardId);
      await persistBoardStateNow(boardId, doc, userId);
    }, PERSIST_DEBOUNCE_MS),
  );
};

const getUndoManager = (boardId: string, doc: Y.Doc) => {
  if (undoManagers.has(boardId)) {
    return undoManagers.get(boardId)!;
  }

  const boardMap = doc.getMap("board");
  const undoManager = new Y.UndoManager(boardMap, {
    trackedOrigins: new Set([CLIENT_UPDATE_ORIGIN]),
  });
  undoManagers.set(boardId, undoManager);
  return undoManager;
};

export const registerBoardEvents = (io: Server, socket: Socket) => {
  let activeBoardId: string | null = null;

  socket.on("board:join", async (boardId: string) => {
    try {
      // Guard: skip if already joined this board on this socket
      if (activeBoardId === boardId) {
        return;
      }

      const canAccess = await canAccessBoard(socket, boardId);
      if (!canAccess) {
        socket.emit("error", { message: "You do not have access to this board" });
        return;
      }

      if (activeBoardId && activeBoardId !== boardId) {
        socket.leave(activeBoardId);
      }

      activeBoardId = boardId;
      socket.join(boardId);
      const doc = getYDoc(boardId);
      await hydrateDocFromPersistence(boardId, doc);
      getUndoManager(boardId, doc);

      // 1. Initial Sync: Send the full current state to the new user
      const state = Y.encodeStateAsUpdate(doc);
      socket.emit("board:init", {
        yjsState: Array.from(state),
        serverTime: Date.now(),
      });

      socket.to(boardId).emit("board:userJoined", {
        userId: socket.data.user?.id ?? socket.id,
      });
    } catch (error) {
      socket.emit("error", { message: "Failed to load board" });
    }
  });

  // 2. Continuous Sync: The "Holy Grail" event
  socket.on("yjs:update", async ({ boardId, update }: { boardId: string, update: unknown }) => {
    const canEdit = await canEditBoard(socket, boardId);
    if (!canEdit) {
      socket.emit("board:forbidden", {
        boardId,
        message: "You need editor access to modify this board",
      });
      return;
    }

    const doc = getYDoc(boardId);
    const normalizedUpdate = toUint8(update);
    if (normalizedUpdate.length === 0) {
      return;
    }

    // Apply the change to the server's version of the doc
    Y.applyUpdate(doc, normalizedUpdate, CLIENT_UPDATE_ORIGIN);

    // Broadcast that specific change to everyone else in the room
    socket.to(boardId).emit("yjs:update", Array.from(normalizedUpdate));
    debouncedPersist(boardId, doc, socket.data.user?.id);
  });

  // ── Explicit object-level events ──

  socket.on("board:draw", async (payload: {
    boardId: string;
    type: string;
    data: Record<string, unknown>;
    objectId: string;
  }) => {
    const { boardId, type, data, objectId } = payload;
    const canEdit = await canEditBoard(socket, boardId);
    if (!canEdit) {
      socket.emit("board:forbidden", { boardId, message: "You need editor access to draw" });
      return;
    }

    const userId = socket.data.user?.id;
    if (!userId) return;

    try {
      // Sync into Y.Doc — DB persistence happens via debounced persist
      const doc = getYDoc(boardId);
      const shapes = parseShapesFromYDoc(doc);
      shapes.push({ ...data, id: objectId, type });
      doc.getMap<string>("board").set(SHAPES_KEY, JSON.stringify(shapes));

      socket.to(boardId).emit("board:draw:broadcast", {
        objectId,
        type,
        data,
        userId,
      });

      socket.to(boardId).emit("board:history:update", {
        boardId,
        action: "draw",
        objectId,
      });

      debouncedPersist(boardId, doc, userId);
    } catch (error) {
      console.error("[board:draw]", error);
    }
  });

  socket.on("board:update-object", async (payload: {
    boardId: string;
    objectId: string;
    data: Record<string, unknown>;
  }) => {
    const { boardId, objectId, data } = payload;
    const canEdit = await canEditBoard(socket, boardId);
    if (!canEdit) {
      socket.emit("board:forbidden", { boardId, message: "You need editor access to update" });
      return;
    }

    try {
      // Sync into Y.Doc — DB persistence happens via debounced persist
      const doc = getYDoc(boardId);
      const shapes = parseShapesFromYDoc(doc);
      const idx = shapes.findIndex((s: Record<string, unknown>) => s.id === objectId);
      if (idx !== -1) {
        shapes[idx] = { ...shapes[idx], ...data };
        doc.getMap<string>("board").set(SHAPES_KEY, JSON.stringify(shapes));
      }

      socket.to(boardId).emit("board:update-object:broadcast", {
        objectId,
        data,
        userId: socket.data.user?.id,
      });

      socket.to(boardId).emit("board:history:update", {
        boardId,
        action: "update",
        objectId,
      });

      debouncedPersist(boardId, doc, socket.data.user?.id);
    } catch (error) {
      console.error("[board:update-object]", error);
    }
  });

  socket.on("board:delete-object", async (payload: {
    boardId: string;
    objectId: string;
  }) => {
    const { boardId, objectId } = payload;
    const canEdit = await canEditBoard(socket, boardId);
    if (!canEdit) {
      socket.emit("board:forbidden", { boardId, message: "You need editor access to delete" });
      return;
    }

    try {
      // Sync into Y.Doc — DB persistence happens via debounced persist
      const doc = getYDoc(boardId);
      const shapes = parseShapesFromYDoc(doc);
      const filtered = shapes.filter((s: Record<string, unknown>) => s.id !== objectId);
      doc.getMap<string>("board").set(SHAPES_KEY, JSON.stringify(filtered));

      socket.to(boardId).emit("board:delete-object:broadcast", {
        objectId,
        userId: socket.data.user?.id,
      });

      socket.to(boardId).emit("board:history:update", {
        boardId,
        action: "delete",
        objectId,
      });

      debouncedPersist(boardId, doc, socket.data.user?.id);
    } catch (error) {
      console.error("[board:delete-object]", error);
    }
  });

  socket.on("board:undo", async ({ boardId }: { boardId: string }) => {
    const canEdit = await canEditBoard(socket, boardId);
    if (!canEdit) {
      socket.emit("board:forbidden", {
        boardId,
        message: "You need editor access to modify this board",
      });
      return;
    }

    const doc = getYDoc(boardId);
    const undoManager = getUndoManager(boardId, doc);

    undoManager.undo();
    const state = Y.encodeStateAsUpdate(doc);
    io.to(boardId).emit("board:state", Array.from(state));
    await persistBoardStateNow(boardId, doc, socket.data.user?.id);
  });

  socket.on("board:redo", async ({ boardId }: { boardId: string }) => {
    const canEdit = await canEditBoard(socket, boardId);
    if (!canEdit) {
      socket.emit("board:forbidden", {
        boardId,
        message: "You need editor access to modify this board",
      });
      return;
    }

    const doc = getYDoc(boardId);
    const undoManager = getUndoManager(boardId, doc);

    undoManager.redo();
    const state = Y.encodeStateAsUpdate(doc);
    io.to(boardId).emit("board:state", Array.from(state));
    await persistBoardStateNow(boardId, doc, socket.data.user?.id);
  });

  socket.on("board:leave", async (boardId: string) => {
    // Cancel any pending debounced persist and flush immediately
    const pendingTimer = persistTimers.get(boardId);
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      persistTimers.delete(boardId);
    }

    const doc = getYDoc(boardId);
    await persistBoardStateNow(boardId, doc, socket.data.user?.id);

    socket.leave(boardId);
    if (activeBoardId === boardId) {
      activeBoardId = null;
    }

    socket.to(boardId).emit("board:userLeft", {
      userId: socket.data.user?.id ?? socket.id,
    });
  });

  socket.on("disconnect", async () => {
    if (!activeBoardId) return;

    // Cancel any pending debounced persist and flush immediately
    const pendingTimer = persistTimers.get(activeBoardId);
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      persistTimers.delete(activeBoardId);
    }

    const doc = getYDoc(activeBoardId);
    await persistBoardStateNow(activeBoardId, doc, socket.data.user?.id);

    socket.to(activeBoardId).emit("board:userLeft", {
      userId: socket.data.user?.id ?? socket.id,
    });
  });
};