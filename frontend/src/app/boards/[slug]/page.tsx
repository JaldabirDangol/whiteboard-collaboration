"use client";

import * as Y from "yjs";
import type { KonvaEventObject } from "konva/lib/Node";
import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { Circle, Group, Layer, Line, Rect, Stage, Text } from "react-konva";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Header from "@/components/canvas/header";
import Chat from "@/components/canvas/chat";
import { useUserStore } from "@/store/useUserStore";
import { useToolStore } from "@/store/useToolStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getBoardDetails, joinBoard, shareBoard } from "@/lib/api";
import { toast } from "sonner";

type BoardShapeBase = {
  id: string;
  color: string;
  strokeWidth: number;
};

type LineShape = BoardShapeBase & {
  type: "line";
  tool: "pen" | "eraser";
  points: number[];
};

type RectShape = BoardShapeBase & {
  type: "rectangle";
  x: number;
  y: number;
  width: number;
  height: number;
};

type CircleShape = BoardShapeBase & {
  type: "circle";
  x: number;
  y: number;
  radius: number;
};

type BoardShape = LineShape | RectShape | CircleShape;

type RemoteCursor = {
  userId: string;
  x: number;
  y: number;
  updatedAt: number;
};

const LOCAL_ORIGIN = "local";
const REMOTE_ORIGIN = "remote";
const SHAPES_KEY = "shapes";
const CURSOR_STALE_MS = 12000;

const getSocketUrl = () => {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL;
  }

  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/?$/, "");
  }

  return "http://localhost:3050";
};

const toUint8 = (value: unknown): Uint8Array => {
  if (value instanceof Uint8Array) return value;
  if (Array.isArray(value)) return new Uint8Array(value);
  if (value && typeof value === "object") {
    const arrLike = value as { data?: number[] };
    if (Array.isArray(arrLike.data)) {
      return new Uint8Array(arrLike.data);
    }
  }
  return new Uint8Array();
};

const parseShapes = (raw: string | undefined): BoardShape[] => {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as BoardShape[]) : [];
  } catch {
    return [];
  }
};

const newShapeId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
};

export default function Page() {
  const params = useParams();
  const id = params.slug as string;
  const user = useUserStore((state) => state.user);
  const selectedTool = useToolStore((state) => state.selected);
  const color = useToolStore((state) => state.color ?? "#000000");
  const strokeWidth = useToolStore((state) => state.strokeWidth ?? 2);

  const boardWrapRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const docRef = useRef<Y.Doc | null>(null);
  const yBoardRef = useRef<Y.Map<string> | null>(null);

  const [stageSize, setStageSize] = useState({ width: 1, height: 1 });
  const [shapes, setShapes] = useState<BoardShape[]>([]);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [remoteCursors, setRemoteCursors] = useState<Record<string, RemoteCursor>>({});
  const [shareOpen, setShareOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [shareRole, setShareRole] = useState<"EDITOR" | "VIEWER">("VIEWER");

  const isDrawing = useRef(false);
  const draftShapeId = useRef<string | null>(null);
  const lastCursorEmitAt = useRef(0);

  const canDraw = selectedTool !== "select";

  const { data: boardDetails } = useQuery({
    queryKey: ["board-details", id],
    queryFn: () => getBoardDetails(id),
    enabled: Boolean(id),
  });

  const cursorLabelByUserId = useMemo(() => {
    const labels: Record<string, string> = {};

    for (const member of boardDetails?.members ?? []) {
      labels[member.userId] = member.user.name?.trim() || member.user.email;
    }

    return labels;
  }, [boardDetails]);

  const joinBoardMutation = useMutation({
    mutationFn: () => joinBoard(id),
    onError: (error: Error) => {
      toast.error(error.message || "Unable to join this board");
    },
  });

  const shareBoardMutation = useMutation({
    mutationFn: ({ email, role }: { email: string; role: "EDITOR" | "VIEWER" }) =>
      shareBoard(id, email, role),
    onSuccess: () => {
      toast.success("Board shared successfully");
      setShareEmail("");
      setShareRole("VIEWER");
      setShareOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Unable to share board");
    },
  });

  const getShareLink = () => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/boards/${id}`;
  };

  const copyShareLink = async () => {
    const link = getShareLink();
    if (!link) return;

    try {
      await navigator.clipboard.writeText(link);
      toast.success("Share link copied");
    } catch {
      toast.error("Unable to copy link");
    }
  };

  const persistShapes = (nextShapes: BoardShape[]) => {
    const doc = docRef.current;
    const yBoard = yBoardRef.current;
    if (!doc || !yBoard) return;

    doc.transact(() => {
      yBoard.set(SHAPES_KEY, JSON.stringify(nextShapes));
    }, LOCAL_ORIGIN);
  };

  const updateShapesLocally = (updater: (prev: BoardShape[]) => BoardShape[]) => {
    setShapes((prev) => {
      const next = updater(prev);
      persistShapes(next);
      return next;
    });
  };

  useEffect(() => {
    const element = boardWrapRef.current;
    if (!element) return;

    const setSize = () => {
      setStageSize({
        width: Math.max(1, element.clientWidth),
        height: Math.max(1, element.clientHeight),
      });
    };

    setSize();

    const observer = new ResizeObserver(() => setSize());
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!user?.id || !id) return;
    joinBoardMutation.mutate();
  }, [id, user?.id]);

  useEffect(() => {
    const doc = new Y.Doc();
    const yBoard = doc.getMap<string>("board");
    docRef.current = doc;
    yBoardRef.current = yBoard;

    const socket = io(getSocketUrl(), {
      withCredentials: true,
      transports: ["websocket"],
    });
    socketRef.current = socket;

    const applySnapshot = () => {
      const snapshot = yBoard.get(SHAPES_KEY);
      setShapes(parseShapes(snapshot));
    };

    const onDocUpdate = (update: Uint8Array, origin: unknown) => {
      if (origin !== LOCAL_ORIGIN) return;
      socket.emit("yjs:update", { boardId: id, update: Array.from(update) });
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

    const onCursorMove = ({ userId, position }: { userId?: string; position?: { x: number; y: number } }) => {
      if (!userId || !position) return;
      if (user?.id && userId === user.id) return;

      setRemoteCursors((prev) => ({
        ...prev,
        [userId]: {
          userId,
          x: position.x,
          y: position.y,
          updatedAt: Date.now(),
        },
      }));
    };

    const onUserLeft = ({ userId }: { userId?: string }) => {
      if (!userId) return;
      setRemoteCursors((prev) => {
        if (!prev[userId]) return prev;
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    };

    doc.on("update", onDocUpdate);
    socket.on("board:init", onInit);
    socket.on("yjs:update", onUpdate);
    socket.on("board:state", onState);
    socket.on("presence:cursorMove", onCursorMove);
    socket.on("board:userLeft", onUserLeft);
    socket.on("presence:userOffline", onUserLeft);

    socket.emit("board:join", id);

    return () => {
      socket.emit("board:leave", id);
      socket.off("board:init", onInit);
      socket.off("yjs:update", onUpdate);
      socket.off("board:state", onState);
      socket.off("presence:cursorMove", onCursorMove);
      socket.off("board:userLeft", onUserLeft);
      socket.off("presence:userOffline", onUserLeft);
      doc.off("update", onDocUpdate);
      socket.disconnect();
      doc.destroy();

      socketRef.current = null;
      docRef.current = null;
      yBoardRef.current = null;
    };
  }, [id, user?.id]);

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
        socket.emit("board:undo", { boardId: id });
      }

      if (key === "y" || (key === "z" && event.shiftKey)) {
        event.preventDefault();
        socket.emit("board:redo", { boardId: id });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [id]);

  const handlePointerDown = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!canDraw) return;

    const pointer = e.target.getStage()?.getPointerPosition();
    if (!pointer) return;

    isDrawing.current = true;
    const id = newShapeId();
    draftShapeId.current = id;

    setShapes((prev) => {
      if (selectedTool === "pen" || selectedTool === "eraser") {
        return [
          ...prev,
          {
            id,
            type: "line",
            tool: selectedTool,
            points: [pointer.x, pointer.y],
            color,
            strokeWidth,
          },
        ];
      }

      if (selectedTool === "rectangle") {
        return [
          ...prev,
          {
            id,
            type: "rectangle",
            x: pointer.x,
            y: pointer.y,
            width: 0,
            height: 0,
            color,
            strokeWidth,
          },
        ];
      }

      if (selectedTool === "circle") {
        return [
          ...prev,
          {
            id,
            type: "circle",
            x: pointer.x,
            y: pointer.y,
            radius: 0,
            color,
            strokeWidth,
          },
        ];
      }

      return prev;
    });
  };

  const handlePointerMove = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    const pointer = e.target.getStage()?.getPointerPosition();
    const socket = socketRef.current;

    if (pointer && socket) {
      const now = Date.now();
      if (now - lastCursorEmitAt.current > 40) {
        socket.emit("presence:cursorMove", {
          boardId: id,
          position: {
            x: pointer.x,
            y: pointer.y,
          },
        });
        lastCursorEmitAt.current = now;
      }
    }

    if (!isDrawing.current || !canDraw) return;
    if (!pointer) return;
    const targetId = draftShapeId.current;
    if (!targetId) return;

    setShapes((prev) => {
      const next = prev.map((shape) => {
        if (shape.id !== targetId) return shape;

        if (shape.type === "line") {
          return {
            ...shape,
            points: [...shape.points, pointer.x, pointer.y],
          };
        }

        if (shape.type === "rectangle") {
          return {
            ...shape,
            width: pointer.x - shape.x,
            height: pointer.y - shape.y,
          };
        }

        const dx = pointer.x - shape.x;
        const dy = pointer.y - shape.y;

        return {
          ...shape,
          radius: Math.sqrt(dx * dx + dy * dy),
        };
      });

      return next;
    });
  };

  const handlePointerUp = () => {
    if (!isDrawing.current) return;

    isDrawing.current = false;
    draftShapeId.current = null;
    setShapes((prev) => {
      persistShapes(prev);
      return prev;
    });
  };

  const normalizeRect = (shape: RectShape): RectShape => {
    const x = shape.width < 0 ? shape.x + shape.width : shape.x;
    const y = shape.height < 0 ? shape.y + shape.height : shape.y;

    return {
      ...shape,
      x,
      y,
      width: Math.abs(shape.width),
      height: Math.abs(shape.height),
    };
  };

  const updateShapePosition = (shapeId: string, x: number, y: number) => {
    updateShapesLocally((prev) =>
      prev.map((shape) => {
        if (shape.id !== shapeId) return shape;

        if (shape.type === "line") {
          if (shape.points.length < 2) return shape;

          const startX = shape.points[0];
          const startY = shape.points[1];
          const dx = x - startX;
          const dy = y - startY;

          return {
            ...shape,
            points: shape.points.map((point, index) => point + (index % 2 === 0 ? dx : dy)),
          };
        }

        if (shape.type === "rectangle") {
          return {
            ...shape,
            x,
            y,
          };
        }

        return {
          ...shape,
          x,
          y,
        };
      })
    );
  };

  return (
    <div className="h-screen flex flex-col">
      <Header />
      <div className="flex gap-6 flex-1">
        <Chat boardId={id} currentUserId={user?.id} />
        <div ref={boardWrapRef} className="relative flex-1 bg-white">
          <Stage
            width={stageSize.width}
            height={stageSize.height}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
            onMouseDownCapture={() => {
              if (selectedTool === "select") {
                setSelectedShapeId(null);
              }
            }}
          >
            <Layer>
              {shapes.map((shape) => {
                if (shape.type === "line") {
                  return (
                    <Line
                      key={shape.id}
                      points={shape.points}
                      stroke={shape.color}
                      strokeWidth={shape.strokeWidth}
                      tension={0.5}
                      lineCap="round"
                      lineJoin="round"
                      draggable={selectedTool === "select"}
                      onClick={() => setSelectedShapeId(shape.id)}
                      onTap={() => setSelectedShapeId(shape.id)}
                      onDragEnd={(event) => {
                        const pos = event.target.position();
                        updateShapePosition(shape.id, pos.x, pos.y);
                        event.target.position({ x: 0, y: 0 });
                      }}
                      shadowEnabled={selectedShapeId === shape.id}
                      shadowColor="#0f172a"
                      shadowBlur={selectedShapeId === shape.id ? 6 : 0}
                      globalCompositeOperation={
                        shape.tool === "eraser" ? "destination-out" : "source-over"
                      }
                    />
                  );
                }

                if (shape.type === "rectangle") {
                  const rect = normalizeRect(shape);
                  return (
                    <Rect
                      key={shape.id}
                      x={rect.x}
                      y={rect.y}
                      width={rect.width}
                      height={rect.height}
                      stroke={rect.color}
                      strokeWidth={rect.strokeWidth}
                      fill="transparent"
                      draggable={selectedTool === "select"}
                      onClick={() => setSelectedShapeId(shape.id)}
                      onTap={() => setSelectedShapeId(shape.id)}
                      onDragEnd={(event) => {
                        const pos = event.target.position();
                        updateShapePosition(shape.id, pos.x, pos.y);
                      }}
                      shadowEnabled={selectedShapeId === shape.id}
                      shadowColor="#0f172a"
                      shadowBlur={selectedShapeId === shape.id ? 6 : 0}
                    />
                  );
                }

                return (
                  <Circle
                    key={shape.id}
                    x={shape.x}
                    y={shape.y}
                    radius={shape.radius}
                    stroke={shape.color}
                    strokeWidth={shape.strokeWidth}
                    fill="transparent"
                    draggable={selectedTool === "select"}
                    onClick={() => setSelectedShapeId(shape.id)}
                    onTap={() => setSelectedShapeId(shape.id)}
                    onDragEnd={(event) => {
                      const pos = event.target.position();
                      updateShapePosition(shape.id, pos.x, pos.y);
                    }}
                    shadowEnabled={selectedShapeId === shape.id}
                    shadowColor="#0f172a"
                    shadowBlur={selectedShapeId === shape.id ? 6 : 0}
                  />
                );
              })}
            </Layer>
            <Layer listening={false}>
              {Object.values(remoteCursors).map((cursor) => (
                <Group key={cursor.userId}>
                  <Circle x={cursor.x} y={cursor.y} radius={4} fill="#2563eb" />
                  <Text
                    x={cursor.x + 8}
                    y={cursor.y - 10}
                    text={cursorLabelByUserId[cursor.userId] ?? "Unknown user"}
                    fontSize={12}
                    fill="#1e3a8a"
                  />
                </Group>
              ))}
            </Layer>
          </Stage>
          <div className="absolute top-3 right-3 z-20">
            <Dialog open={shareOpen} onOpenChange={setShareOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">Share</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Share Board</DialogTitle>
                </DialogHeader>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <p className="text-sm text-slate-600">Invite a collaborator by email</p>
                    <input
                      value={shareEmail}
                      onChange={(event) => setShareEmail(event.target.value)}
                      type="email"
                      placeholder="teammate@example.com"
                      className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                    />
                    <select
                      value={shareRole}
                      onChange={(event) => setShareRole(event.target.value as "EDITOR" | "VIEWER")}
                      className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                    >
                      <option value="VIEWER">Viewer</option>
                      <option value="EDITOR">Editor</option>
                    </select>
                    <Button
                      className="w-full"
                      onClick={() => {
                        const email = shareEmail.trim();
                        if (!email) {
                          toast.error("Email is required");
                          return;
                        }
                        shareBoardMutation.mutate({ email, role: shareRole });
                      }}
                      disabled={shareBoardMutation.isPending}
                    >
                      {shareBoardMutation.isPending ? "Sharing..." : "Invite collaborator"}
                    </Button>
                  </div>

                  <div className="space-y-2 border-t border-slate-200 pt-3">
                    <p className="text-sm text-slate-600">Share link</p>
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700 break-all">
                      {getShareLink()}
                    </div>
                    <Button variant="secondary" className="w-full" onClick={copyShareLink}>
                      Copy link
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
}