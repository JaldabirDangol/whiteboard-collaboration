import * as Y from "yjs";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { acquireSocket, releaseSocket } from "@/lib/board-socket";
import type { BoardShape, RemoteCursor } from "./board-types";
import {
  LOCAL_ORIGIN,
  REMOTE_ORIGIN,
  SHAPES_KEY,
  normalizeShapesForClient,
  parseShapes,
  toUint8,
} from "./board-shape-utils";

const CURSOR_STALE_MS = 12000;

type UseBoardRealtimeArgs = {
  boardId: string;
  userId?: string;
  persistedShapes?: unknown[];
};

export const useBoardRealtime = ({ boardId, userId, persistedShapes }: UseBoardRealtimeArgs) => {
  const socketRef = useRef<Socket | null>(null);
  const docRef = useRef<Y.Doc | null>(null);
  const yBoardRef = useRef<Y.Map<string> | null>(null);
  const lastCursorEmitAt = useRef(0);
  const userIdRef = useRef(userId);

  const [shapes, setShapes] = useState<BoardShape[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<Record<string, RemoteCursor>>({});
  const [serverReadOnly, setServerReadOnly] = useState(false);
  const [forbiddenMessage, setForbiddenMessage] = useState<string | null>(null);

  const persistShapes = useCallback((nextShapes: BoardShape[]) => {
    const doc = docRef.current;
    const yBoard = yBoardRef.current;
    if (!doc || !yBoard) return;

    const normalizedShapes = normalizeShapesForClient(nextShapes);

    doc.transact(() => {
      yBoard.set(SHAPES_KEY, JSON.stringify(normalizedShapes));
    }, LOCAL_ORIGIN);
  }, []);

  const updateShapesLocally = useCallback((updater: (prev: BoardShape[]) => BoardShape[]) => {
    setShapes((prev) => {
      const next = normalizeShapesForClient(updater(prev));
      persistShapes(next);
      return next;
    });
  }, [persistShapes]);

  const emitCursorMove = useCallback((position: { x: number; y: number }) => {
    const socket = socketRef.current;
    if (!socket) return;

    const now = Date.now();
    if (now - lastCursorEmitAt.current <= 40) return;

    socket.emit("presence:cursorMove", {
      boardId,
      position,
    });
    lastCursorEmitAt.current = now;
  }, [boardId]);

  const emitHistoryEvent = useCallback((type: "undo" | "redo") => {
    const socket = socketRef.current;
    if (!socket) return false;

    if (serverReadOnly) return false;

    socket.emit(type === "undo" ? "board:undo" : "board:redo", { boardId });
    return true;
  }, [boardId, serverReadOnly]);

  useEffect(() => {
    if (!persistedShapes || persistedShapes.length === 0) return;

    setShapes((prev) => {
      if (prev.length > 0) return prev;

      const next = normalizeShapesForClient(persistedShapes as unknown[]);
      const doc = docRef.current;
      const yBoard = yBoardRef.current;

      if (doc && yBoard) {
        doc.transact(() => {
          yBoard.set(SHAPES_KEY, JSON.stringify(next));
        }, REMOTE_ORIGIN);
      }

      return next;
    });
  }, [persistedShapes]);

  // Keep userIdRef in sync without re-creating the socket
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  useEffect(() => {
    const doc = new Y.Doc();
    const yBoard = doc.getMap<string>("board");
    docRef.current = doc;
    yBoardRef.current = yBoard;

    const socket = acquireSocket();
    socketRef.current = socket;

    const applySnapshot = () => {
      const snapshot = yBoard.get(SHAPES_KEY);
      setShapes(normalizeShapesForClient(parseShapes(snapshot)));
    };

    const onDocUpdate = (update: Uint8Array, origin: unknown) => {
      if (origin !== LOCAL_ORIGIN) return;
      socket.emit("yjs:update", { boardId, update: Array.from(update) });
    };

    const onInit = ({ yjsState }: { yjsState: unknown }) => {
      const update = toUint8(yjsState);
      if (update.length === 0) return;
      Y.applyUpdate(doc, update, REMOTE_ORIGIN);
      applySnapshot();
    };

    const onUpdate = (rawUpdate: unknown) => {
      const update = toUint8(rawUpdate);
      if (update.length === 0) return;
      Y.applyUpdate(doc, update, REMOTE_ORIGIN);
      applySnapshot();
    };

    const onState = (rawUpdate: unknown) => {
      const update = toUint8(rawUpdate);
      if (update.length === 0) return;
      Y.applyUpdate(doc, update, REMOTE_ORIGIN);
      applySnapshot();
    };

    const onCursorMove = ({ userId: incomingUserId, position }: { userId?: string; position?: { x: number; y: number } }) => {
      if (!incomingUserId || !position) return;
      if (userIdRef.current && incomingUserId === userIdRef.current) return;

      setRemoteCursors((prev) => ({
        ...prev,
        [incomingUserId]: {
          userId: incomingUserId,
          x: position.x,
          y: position.y,
          updatedAt: Date.now(),
        },
      }));
    };

    const onUserLeft = ({ userId: incomingUserId }: { userId?: string }) => {
      if (!incomingUserId) return;
      setRemoteCursors((prev) => {
        if (!prev[incomingUserId]) return prev;
        const next = { ...prev };
        delete next[incomingUserId];
        return next;
      });
    };

    const onBoardForbidden = ({ message }: { message?: string }) => {
      setServerReadOnly(true);
      setForbiddenMessage(message || "You only have viewer access on this board");
    };

    doc.on("update", onDocUpdate);
    socket.on("board:init", onInit);
    socket.on("yjs:update", onUpdate);
    socket.on("board:state", onState);
    socket.on("board:forbidden", onBoardForbidden);
    socket.on("presence:cursorMove", onCursorMove);
    socket.on("board:userLeft", onUserLeft);
    socket.on("presence:userOffline", onUserLeft);

    socket.emit("board:join", boardId);

    return () => {
      socket.emit("board:leave", boardId);
      socket.off("board:init", onInit);
      socket.off("yjs:update", onUpdate);
      socket.off("board:state", onState);
      socket.off("board:forbidden", onBoardForbidden);
      socket.off("presence:cursorMove", onCursorMove);
      socket.off("board:userLeft", onUserLeft);
      socket.off("presence:userOffline", onUserLeft);
      doc.off("update", onDocUpdate);
      releaseSocket();
      doc.destroy();

      socketRef.current = null;
      docRef.current = null;
      yBoardRef.current = null;
    };
  }, [boardId]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const now = Date.now();
      setRemoteCursors((prev) => {
        let changed = false;
        const next: Record<string, RemoteCursor> = {};

        for (const [cursorUserId, cursor] of Object.entries(prev)) {
          if (now - cursor.updatedAt <= CURSOR_STALE_MS) {
            next[cursorUserId] = cursor;
          } else {
            changed = true;
          }
        }

        return changed ? next : prev;
      });
    }, 2000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const socket = socketRef.current;
      if (!socket) return;

      const modifier = event.ctrlKey || event.metaKey;
      if (!modifier) return;

      const key = event.key.toLowerCase();
      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        socket.emit("board:undo", { boardId });
      }

      if (key === "y" || key === "r" || (key === "z" && event.shiftKey)) {
        event.preventDefault();
        socket.emit("board:redo", { boardId });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [boardId]);

  return {
    shapes,
    setShapes,
    remoteCursors,
    persistShapes,
    updateShapesLocally,
    emitCursorMove,
    emitHistoryEvent,
    serverReadOnly,
    forbiddenMessage,
  };
};
