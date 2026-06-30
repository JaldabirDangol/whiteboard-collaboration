import { Server, Socket } from "socket.io";
import * as Y from "yjs";
import { getYDoc, destroyYDoc, getActiveBoardIds } from "@/socket/yjs.js"
import {
  getBoardShapesFromDatabase,
  getBoardCurrentSnapshotVersion,
  getBoardSnapshotByVersion,
  getLatestBoardSnapshot,
  getSnapshotAfterVersion,
  getSnapshotBeforeVersion,
  replaceBoardShapes,
  saveBoardSnapshot,
  setBoardCurrentSnapshotVersion,
} from "@/controllers/boards/boardServices.js";
import { canAccessBoard, canEditBoard } from "@/socket/boardAccess.js";
import { getIO } from "@/socket/index.js";
import { logAction } from "@/lib/auditLog.js";

const persistTimers = new Map<string, ReturnType<typeof setTimeout>>();
const persistCounters = new Map<string, number>();
const roomMembers = new Map<string, Set<string>>();

const SHAPES_KEY = "shapes";
const CLIENT_UPDATE_ORIGIN = "client-update";
const UNDO_REDO_ORIGIN = "undo-redo";
const PERSIST_DEBOUNCE_MS = 500;
const SNAPSHOT_INTERVAL = 5; // Save snapshot every N persists
const YDOC_GC_DELAY_MS = 60_000; // 60s grace period before destroying Y.Doc

const trackRoomJoin = (boardId: string, socketId: string) => {
  if (!roomMembers.has(boardId)) {
    roomMembers.set(boardId, new Set());
  }
  roomMembers.get(boardId)!.add(socketId);
};

const trackRoomLeave = (boardId: string, socketId: string) => {
  const members = roomMembers.get(boardId);
  if (!members) return;
  members.delete(socketId);
  if (members.size === 0) {
    roomMembers.delete(boardId);
    persistCounters.delete(boardId);
    // Schedule Y.Doc destruction after grace period
    setTimeout(() => {
      // Re-check: someone might have re-joined in the grace window
      if (!roomMembers.has(boardId)) {
        destroyYDoc(boardId);
      }
    }, YDOC_GC_DELAY_MS);
  }
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const validateBoardId = (boardId: unknown, socket: Socket): boardId is string => {
  if (typeof boardId !== "string" || !UUID_REGEX.test(boardId)) {
    socket.emit("error", { message: "Invalid board ID" });
    return false;
  }
  return true;
};

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

const applyShapesToDoc = (doc: Y.Doc, shapes: unknown[]) => {
  doc.getMap<string>("board").set(SHAPES_KEY, JSON.stringify(shapes));
};

const extractShapesFromSnapshot = (snapshot: { data?: unknown } | null) => {
  if (!snapshot || typeof snapshot.data !== "object" || snapshot.data === null) {
    return [];
  }

  const payload = snapshot.data as { shapes?: unknown };
  return Array.isArray(payload.shapes) ? payload.shapes : [];
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

  const currentVersion = await getBoardCurrentSnapshotVersion(boardId);
  const snapshot = currentVersion
    ? await getBoardSnapshotByVersion(boardId, currentVersion)
    : await getLatestBoardSnapshot(boardId);

  const shapes = extractShapesFromSnapshot(snapshot);

  if (shapes.length === 0) {
    return;
  }

  boardMap.set(SHAPES_KEY, JSON.stringify(shapes));
};

const persistBoardStateNow = async (boardId: string, doc: Y.Doc, userId?: string, forceSnapshot = false) => {
  try {
    const shapes = parseShapesFromYDoc(doc);

    // Save snapshot only every N persists (or on forced flush like board:leave/disconnect)
    const count = (persistCounters.get(boardId) ?? 0) + 1;
    persistCounters.set(boardId, count);
    if (forceSnapshot || count % SNAPSHOT_INTERVAL === 0) {
      await saveBoardSnapshot(boardId, { shapes });
    }

    const { orphanedComments } = await replaceBoardShapes(boardId, userId, shapes as Record<string, unknown>[]);
    if (orphanedComments.length > 0) {
      const io = getIO();
      for (const { commentId, shapeId } of orphanedComments) {
        io.to(boardId).emit("comment:removed", { commentId, shapeId });
      }
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

export const registerBoardEvents = (io: Server, socket: Socket) => {
  const joinedBoards = new Set<string>();

  socket.on("board:join", async (boardId: string) => {
    try {
      if (!validateBoardId(boardId, socket)) return;
      if (joinedBoards.has(boardId)) return;

      const canAccess = await canAccessBoard(socket, boardId);
      if (!canAccess) {
        socket.emit("error", { message: "You do not have access to this board" });
        return;
      }

      joinedBoards.add(boardId);
      socket.join(boardId);
      trackRoomJoin(boardId, socket.id);
      const doc = getYDoc(boardId);
      await hydrateDocFromPersistence(boardId, doc);

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
      console.error("[board:join]", error);
      socket.emit("error", { message: "Failed to load board" });
    }
  });

  // 2. Continuous Sync: The "Holy Grail" event
  socket.on("yjs:update", async ({ boardId, update }: { boardId: string, update: unknown }) => {
    try {
      if (!validateBoardId(boardId, socket)) return;
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

      // Trigger debounced persist
      debouncedPersist(boardId, doc, socket.data.user?.id);
    } catch (error) {
      console.error(`[yjs:update] error for board ${boardId}:`, error);
      socket.emit("board:error", {
        message: "Failed to apply update",
      });
    }
  });

  socket.on("board:undo", async ({ boardId }: { boardId: string }) => {
    try {
      if (!validateBoardId(boardId, socket)) return;
      const canEdit = await canEditBoard(socket, boardId);
      if (!canEdit) {
        socket.emit("board:forbidden", {
          boardId,
          message: "You need editor access to modify this board",
        });
        return;
      }

      const pendingTimer = persistTimers.get(boardId);
      if (pendingTimer) {
        clearTimeout(pendingTimer);
        persistTimers.delete(boardId);
        // Flush current state before applying undo so the snapshot chain is intact
        const doc = getYDoc(boardId);
        await persistBoardStateNow(boardId, doc, socket.data.user?.id, true);
      }

      const latestSnapshot = await getLatestBoardSnapshot(boardId);
      if (!latestSnapshot) return;

      let currentVersion = await getBoardCurrentSnapshotVersion(boardId);
      if (!currentVersion) {
        currentVersion = latestSnapshot.version;
        await setBoardCurrentSnapshotVersion(boardId, currentVersion);
      }

      const previousSnapshot = await getSnapshotBeforeVersion(boardId, currentVersion);
      if (!previousSnapshot) return;

      const shapes = extractShapesFromSnapshot(previousSnapshot);
      const doc = getYDoc(boardId);

      // DB first — if this fails, abort without corrupting Y.Doc
      const { orphanedComments } = await replaceBoardShapes(boardId, socket.data.user?.id ?? "system", shapes as Record<string, unknown>[]);
      for (const { commentId, shapeId } of orphanedComments) {
        io.to(boardId).emit("comment:removed", { commentId, shapeId });
      }
      await setBoardCurrentSnapshotVersion(boardId, previousSnapshot.version);

      doc.transact(() => {
        applyShapesToDoc(doc, shapes);
      }, UNDO_REDO_ORIGIN);

      logAction({
        boardId,
        userId: socket.data.user?.id ?? "system",
        action: "board:undo",
        metadata: { version: previousSnapshot.version },
      }).catch(() => {});

      const state = Y.encodeStateAsUpdate(doc);
      io.to(boardId).emit("board:state", Array.from(state));
    } catch (error) {
      console.error(`[board:undo] error for board ${boardId}:`, error);
      socket.emit("board:error", {
        message: "Undo failed due to a server error",
      });
    }
  });

  socket.on("board:redo", async ({ boardId }: { boardId: string }) => {
    try {
      if (!validateBoardId(boardId, socket)) return;
      const canEdit = await canEditBoard(socket, boardId);
      if (!canEdit) {
        socket.emit("board:forbidden", {
          boardId,
          message: "You need editor access to modify this board",
        });
        return;
      }

      const pendingTimer = persistTimers.get(boardId);
      if (pendingTimer) {
        clearTimeout(pendingTimer);
        persistTimers.delete(boardId);
        // Flush current state before applying redo so the snapshot chain is intact
        const doc = getYDoc(boardId);
        await persistBoardStateNow(boardId, doc, socket.data.user?.id, true);
      }

      const latestSnapshot = await getLatestBoardSnapshot(boardId);
      if (!latestSnapshot) return;

      let currentVersion = await getBoardCurrentSnapshotVersion(boardId);
      if (!currentVersion) {
        currentVersion = latestSnapshot.version;
        await setBoardCurrentSnapshotVersion(boardId, currentVersion);
      }

      const nextSnapshot = await getSnapshotAfterVersion(boardId, currentVersion);
      if (!nextSnapshot) return;

      const shapes = extractShapesFromSnapshot(nextSnapshot);
      const doc = getYDoc(boardId);

      // DB first — if this fails, abort without corrupting Y.Doc
      const { orphanedComments } = await replaceBoardShapes(boardId, socket.data.user?.id ?? "system", shapes as Record<string, unknown>[]);
      for (const { commentId, shapeId } of orphanedComments) {
        io.to(boardId).emit("comment:removed", { commentId, shapeId });
      }
      await setBoardCurrentSnapshotVersion(boardId, nextSnapshot.version);

      doc.transact(() => {
        applyShapesToDoc(doc, shapes);
      }, UNDO_REDO_ORIGIN);

      logAction({
        boardId,
        userId: socket.data.user?.id ?? "system",
        action: "board:redo",
        metadata: { version: nextSnapshot.version },
      }).catch(() => {});

      const state = Y.encodeStateAsUpdate(doc);
      io.to(boardId).emit("board:state", Array.from(state));
    } catch (error) {
      console.error(`[board:redo] error for board ${boardId}:`, error);
      socket.emit("board:error", {
        message: "Redo failed due to a server error",
      });
    }
  });

  socket.on("board:leave", async (boardId: string) => {
    if (!validateBoardId(boardId, socket)) return;
    // Cancel any pending debounced persist and flush immediately
    const pendingTimer = persistTimers.get(boardId);
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      persistTimers.delete(boardId);
    }

    const doc = getYDoc(boardId);
    await persistBoardStateNow(boardId, doc, socket.data.user?.id, true);

    socket.leave(boardId);
    trackRoomLeave(boardId, socket.id);
    joinedBoards.delete(boardId);

    socket.to(boardId).emit("board:userLeft", {
      userId: socket.data.user?.id ?? socket.id,
    });
  });

  socket.on("disconnect", async () => {
    const boardIds = Array.from(joinedBoards);
    joinedBoards.clear();

    for (const boardId of boardIds) {
      const pendingTimer = persistTimers.get(boardId);
      if (pendingTimer) {
        clearTimeout(pendingTimer);
        persistTimers.delete(boardId);
      }

      const doc = getYDoc(boardId);
      await persistBoardStateNow(boardId, doc, socket.data.user?.id, true);

      trackRoomLeave(boardId, socket.id);
      socket.to(boardId).emit("board:userLeft", {
        userId: socket.data.user?.id ?? socket.id,
      });
    }
  });
};

export const persistAllActiveBoards = async () => {
  const boardIds = getActiveBoardIds();
  for (const boardId of boardIds) {
    const timer = persistTimers.get(boardId);
    if (timer) {
      clearTimeout(timer);
      persistTimers.delete(boardId);
    }
    const doc = getYDoc(boardId);
    await persistBoardStateNow(boardId, doc, "system", true);
  }
};