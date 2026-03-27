"use client";

import * as Y from "yjs";
import type { KonvaEventObject } from "konva/lib/Node";
import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { Circle, Group, Layer, Line, Rect, Stage, Text } from "react-konva";
import { Cog, HelpCircle, MessageSquareMore, Minus, Plus, Share2, Users, X } from "lucide-react";
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
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;

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
  const setTool = useToolStore((state) => state.setTool);

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
  const [chatOpen, setChatOpen] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState<"activity" | "chat" | "comments">("chat");
  const [zoom, setZoom] = useState(1);
  const [viewport, setViewport] = useState({ x: 0, y: 0 });

  const isDrawing = useRef(false);
  const isPanning = useRef(false);
  const isSpacePressed = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const viewportStart = useRef({ x: 0, y: 0 });
  const draftShapeId = useRef<string | null>(null);
  const lastCursorEmitAt = useRef(0);

  const canDraw = selectedTool !== "select";

  const clampZoom = (value: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));

  const toWorldPoint = (pointer: { x: number; y: number }) => ({
    x: (pointer.x - viewport.x) / zoom,
    y: (pointer.y - viewport.y) / zoom,
  });

  const getWorldPointer = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    const stage = e.target.getStage();
    const pointer = stage?.getPointerPosition();
    if (!pointer) return null;
    return toWorldPoint(pointer);
  };

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
    if (useToolStore.getState().selected === "select") {
      setTool("pen");
    }
  }, [setTool]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;

      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.getAttribute("contenteditable") === "true";

      if (isTyping) return;

      event.preventDefault();
      isSpacePressed.current = true;
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      isSpacePressed.current = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

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
    const stage = e.target.getStage();
    const screenPointer = stage?.getPointerPosition();
    const isMiddleMouse = "button" in e.evt && e.evt.button === 1;

    if ((isSpacePressed.current || isMiddleMouse) && screenPointer) {
      isPanning.current = true;
      isDrawing.current = false;
      panStart.current = { x: screenPointer.x, y: screenPointer.y };
      viewportStart.current = { ...viewport };
      return;
    }

    if (!canDraw) return;

    const pointer = getWorldPointer(e);
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
    const stage = e.target.getStage();
    const screenPointer = stage?.getPointerPosition();

    if (isPanning.current && screenPointer) {
      const dx = screenPointer.x - panStart.current.x;
      const dy = screenPointer.y - panStart.current.y;
      setViewport({
        x: viewportStart.current.x + dx,
        y: viewportStart.current.y + dy,
      });
      return;
    }

    const pointer = getWorldPointer(e);
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

  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();

    if (!(e.evt.ctrlKey || e.evt.metaKey)) {
      setViewport((prev) => ({
        x: prev.x - e.evt.deltaX,
        y: prev.y - e.evt.deltaY,
      }));
      return;
    }

    const delta = e.evt.deltaY > 0 ? -0.1 : 0.1;
    setZoom((prev) => clampZoom(prev + delta));
  };

  const handlePointerUp = () => {
    if (isPanning.current) {
      isPanning.current = false;
      return;
    }

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

  const topTabs = ["Files", "Canvas", "Export", "History"] as const;

  const members = (boardDetails?.members ?? []).map((member) => {
    const label = member.user.name?.trim() || member.user.email;
    const initials = label
      .split(" ")
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");

    return {
      id: member.user.id,
      label,
      initials: initials || label.slice(0, 2).toUpperCase(),
      role: member.role,
    };
  });

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f8fafc]">
      <div className="z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-3 md:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <p className="truncate text-sm font-semibold text-slate-900">{boardDetails?.title || "Project Draft"}</p>
          <div className="hidden items-center gap-4 text-sm md:flex">
            {topTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                className={`pb-1 transition ${
                  tab === "Canvas"
                    ? "border-b-2 border-indigo-600 font-medium text-indigo-600"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" className="md:hidden" onClick={() => setChatOpen((prev) => !prev)}>
            {chatOpen ? <X className="h-4 w-4" /> : <MessageSquareMore className="h-4 w-4" />}
          </Button>

          <Dialog open={shareOpen} onOpenChange={setShareOpen}>
            <DialogTrigger asChild>
              <Button type="button" size="sm" className="gap-1.5 bg-indigo-600 text-white hover:bg-indigo-500">
                <Share2 className="h-4 w-4" />
                Share
              </Button>
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

          <button type="button" className="hidden rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 md:inline-flex">
            <Cog className="h-4 w-4" />
          </button>
          <button type="button" className="hidden rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 md:inline-flex">
            <HelpCircle className="h-4 w-4" />
          </button>
          <div className="hidden h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700 md:flex">
            {user?.email?.slice(0, 2).toUpperCase() || "ME"}
          </div>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1">
        <aside className="hidden w-20 border-r border-slate-200 bg-white md:flex md:items-start md:justify-center">
          <Header layout="vertical" />
        </aside>

        <main ref={boardWrapRef} className="relative min-w-0 flex-1 bg-[radial-gradient(circle_at_1px_1px,#dbe4ef_1px,transparent_1.3px)] bg-size-[20px_20px]">
          <div className="absolute left-2 top-2 z-20 md:hidden">
            <Header />
          </div>

          <Stage
            style={{ touchAction: "none" }}
            width={stageSize.width}
            height={stageSize.height}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
            onTouchCancel={handlePointerUp}
            onWheel={handleWheel}
            onMouseDownCapture={() => {
              if (selectedTool === "select") {
                setSelectedShapeId(null);
              }
            }}
          >
            <Layer>
              <Group x={viewport.x} y={viewport.y} scaleX={zoom} scaleY={zoom}>
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
                        shadowColor="#6366f1"
                        shadowBlur={selectedShapeId === shape.id ? 8 : 0}
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
                        shadowColor="#6366f1"
                        shadowBlur={selectedShapeId === shape.id ? 8 : 0}
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
                      shadowColor="#6366f1"
                      shadowBlur={selectedShapeId === shape.id ? 8 : 0}
                    />
                  );
                })}
              </Group>
            </Layer>

            <Layer listening={false}>
              <Group x={viewport.x} y={viewport.y} scaleX={zoom} scaleY={zoom}>
                {Object.values(remoteCursors).map((cursor) => (
                  <Group key={cursor.userId}>
                    <Circle x={cursor.x} y={cursor.y} radius={5} fill="#4f46e5" />
                    <Text
                      x={cursor.x + 10}
                      y={cursor.y - 12}
                      text={cursorLabelByUserId[cursor.userId] ?? "Unknown user"}
                      fontSize={11}
                      fill="#312e81"
                    />
                  </Group>
                ))}
              </Group>
            </Layer>
          </Stage>

          <div className="pointer-events-auto absolute bottom-4 right-4 z-20 flex items-center gap-2 rounded-xl border border-slate-200 bg-white/95 px-2 py-1.5 shadow-sm backdrop-blur">
            <button
              type="button"
              onClick={() => setZoom((prev) => clampZoom(prev - 0.1))}
              className="grid h-7 w-7 place-items-center rounded-md text-slate-600 transition hover:bg-slate-100"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="min-w-14 rounded-md px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              onClick={() => setZoom((prev) => clampZoom(prev + 0.1))}
              className="grid h-7 w-7 place-items-center rounded-md text-slate-600 transition hover:bg-slate-100"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </main>

        <aside className="hidden h-full w-80 border-l border-slate-200 bg-white lg:block">
          <div className="border-b border-slate-200 px-4 py-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">Team</p>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">Online Now</span>
            </div>
            <div className="flex items-center gap-2">
              {(members.length ? members : [{ id: "you", initials: "YO", label: "You", role: "ADMIN" }]).slice(0, 4).map((member) => (
                <div
                  key={member.id}
                  title={member.label}
                  className="grid h-8 w-8 place-items-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700 ring-2 ring-white"
                >
                  {member.initials}
                </div>
              ))}
              {(members.length ? members.length : 1) > 4 ? (
                <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
                  +{(members.length ? members.length : 1) - 4}
                </span>
              ) : null}
            </div>
          </div>

          <div className="border-b border-slate-200 px-2 pt-2">
            <div className="grid grid-cols-3 gap-1 text-xs">
              {(["activity", "chat", "comments"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setRightPanelTab(tab)}
                  className={`rounded-md px-2 py-2 capitalize transition ${
                    rightPanelTab === tab
                      ? "bg-indigo-50 font-medium text-indigo-700"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[calc(100%-125px)]">
            {rightPanelTab === "chat" ? (
              <Chat boardId={id} currentUserId={user?.id} showHeader={false} className="h-full border-r-0 bg-white" />
            ) : (
              <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-500">
                {rightPanelTab === "activity" ? "Activity feed will appear here." : "Comments panel will appear here."}
              </div>
            )}
          </div>
        </aside>

        <div
          className={`absolute inset-0 z-20 bg-slate-900/25 transition-opacity duration-200 lg:hidden ${
            chatOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
          }`}
          onClick={() => setChatOpen(false)}
        />

        <div
          className={`absolute inset-y-0 right-0 z-30 w-[min(22rem,92vw)] border-l border-slate-200 bg-white transition-transform duration-200 lg:hidden ${
            chatOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <Chat
            boardId={id}
            currentUserId={user?.id}
            showMobileClose
            onClose={() => setChatOpen(false)}
            className="h-full border-r-0 bg-white"
          />
        </div>
      </div>
    </div>
  );
}