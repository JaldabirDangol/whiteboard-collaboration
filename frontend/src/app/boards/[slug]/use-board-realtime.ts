import * as Y from "yjs";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { acquireSocket, releaseSocket } from "@/lib/board-socket";
import type { BoardShape, LaserStroke, RemoteCursor } from "./board-types";
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
  const drawingRef = useRef(false);

  const [shapes, setShapes] = useState<BoardShape[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<Record<string, RemoteCursor>>({});
  const [remoteLaserStrokes, setRemoteLaserStrokes] = useState<LaserStroke[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [serverReadOnly, setServerReadOnly] = useState(false);
  const [forbiddenMessage, setForbiddenMessage] = useState<string | null>(null);
  const hasRemoteDataRef = useRef(false);

  const setShapesWithCache = useCallback((value: React.SetStateAction<BoardShape[]>) => {
    setShapes((prev) => (typeof value === "function" ? (value as (prev: BoardShape[]) => BoardShape[])(prev) : value));
  }, []);

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
    setShapesWithCache((prev) => {
      const next = normalizeShapesForClient(updater(prev));
      persistShapes(next);
      return next;
    });
  }, [persistShapes, setShapesWithCache]);

  const emitLaserStroke = useCallback((stroke: { id: string; points: number[]; color: string; strokeWidth: number }) => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit("laser:stroke", { boardId, stroke });
  }, [boardId]);

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

  // Load shapes from REST API — only bootsrap Yjs if no socket data arrived yet
  useEffect(() => {
    if (!persistedShapes || persistedShapes.length === 0) return;

    const doc = docRef.current;
    const yBoard = yBoardRef.current;
    const next = normalizeShapesForClient(persistedShapes as unknown[]);

    // If we already received data via socket, don't overwrite with REST
    if (hasRemoteDataRef.current) return;

    if (doc && yBoard) {
      const existingShapes = yBoard.get(SHAPES_KEY);
      if (!existingShapes) {
        doc.transact(() => {
          yBoard.set(SHAPES_KEY, JSON.stringify(next));
        }, REMOTE_ORIGIN);
      }
    }

    setShapesWithCache((prev) => {
      if (prev.length > 0 && prev.length === next.length) return prev;
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
      if (drawingRef.current) return;
      const snapshot = yBoard.get(SHAPES_KEY);
      setShapesWithCache(normalizeShapesForClient(parseShapes(snapshot)));
    };

    const onDocUpdate = (update: Uint8Array, origin: unknown) => {
      if (origin !== LOCAL_ORIGIN) return;
      socket.emit("yjs:update", { boardId, update: Array.from(update) });
    };

    const onInit = ({ yjsState }: { yjsState: unknown }) => {
      hasRemoteDataRef.current = true;
      const update = toUint8(yjsState);
      if (update.length === 0) return;
      Y.applyUpdate(doc, update, REMOTE_ORIGIN);
      applySnapshot();
    };

    const onUpdate = (rawUpdate: unknown) => {
      hasRemoteDataRef.current = true;
      const update = toUint8(rawUpdate);
      if (update.length === 0) return;
      Y.applyUpdate(doc, update, REMOTE_ORIGIN);
      applySnapshot();
    };

    const onState = (rawUpdate: unknown) => {
      hasRemoteDataRef.current = true;
      const update = toUint8(rawUpdate);
      if (update.length === 0) return;
      Y.applyUpdate(doc, update, REMOTE_ORIGIN);
      applySnapshot();
    };

    const onLaserStroke = ({ stroke, userId: incomingUserId }: { stroke: LaserStroke; userId?: string }) => {
      if (!stroke || !incomingUserId) return;
      if (userIdRef.current && incomingUserId === userIdRef.current) return;

      setRemoteLaserStrokes((prev) => [...prev, { ...stroke, createdAt: Date.now() }]);

      // Auto-remove after 1.5s (local laser TTL is 1s)
      setTimeout(() => {
        setRemoteLaserStrokes((prev) => prev.filter((s) => s.id !== stroke.id));
      }, 1500);
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

    const onBoardDeleted = () => {
      window.location.href = "/boards";
    };

    const onUserOnline = (payload: { userId?: string }) => {
      const uid = payload?.userId;
      if (!uid) return;
      setOnlineUserIds((prev) => new Set(prev).add(uid));
    };

    const onUserOffline = (payload: { userId?: string }) => {
      const uid = payload?.userId;
      if (!uid) return;
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        next.delete(uid);
        return next;
      });
    };

    const onPresenceState = ({ userIds }: { boardId?: string; userIds?: string[] }) => {
      if (!Array.isArray(userIds)) return;
      setOnlineUserIds(new Set(userIds));
    };

    const joinRoom = () => {
      socket.emit("board:join", boardId);
      socket.emit("presence:join", { boardId });
    };

    const onConnect = () => {
      joinRoom();
    };

    const onConnectError = (err: Error) => {
      console.error("[board:socket] connection error", err.message);
    };

    doc.on("update", onDocUpdate);
    socket.on("connect", onConnect);
    socket.on("connect_error", onConnectError);
    socket.on("board:init", onInit);
    socket.on("yjs:update", onUpdate);
    socket.on("board:state", onState);
    socket.on("board:forbidden", onBoardForbidden);
    socket.on("board:deleted", onBoardDeleted);
    socket.on("laser:stroke", onLaserStroke);
    socket.on("presence:cursorMove", onCursorMove);
    socket.on("board:userLeft", onUserLeft);
    socket.on("presence:userOffline", onUserOffline);
    socket.on("presence:userOnline", onUserOnline);
    socket.on("presence:state", onPresenceState);

    // If already connected (shared socket), join immediately
    if (socket.connected) {
      joinRoom();
    }

    return () => {
      socket.emit("board:leave", boardId);
      socket.off("connect", onConnect);
      socket.off("connect_error", onConnectError);
      socket.off("board:init", onInit);
      socket.off("yjs:update", onUpdate);
      socket.off("board:state", onState);
      socket.off("board:forbidden", onBoardForbidden);
      socket.off("board:deleted", onBoardDeleted);
      socket.off("laser:stroke", onLaserStroke);
      socket.off("presence:cursorMove", onCursorMove);
      socket.off("board:userLeft", onUserLeft);
      socket.off("presence:userOffline", onUserOffline);
      socket.off("presence:userOnline", onUserOnline);
      socket.off("presence:state", onPresenceState);
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

  return {
    shapes,
    setShapes: setShapesWithCache,
    remoteCursors,
    remoteLaserStrokes,
    onlineUserIds,
    persistShapes,
    updateShapesLocally,
    emitCursorMove,
    emitLaserStroke,
    emitHistoryEvent,
    serverReadOnly,
    forbiddenMessage,
    drawingRef,
  };
};
