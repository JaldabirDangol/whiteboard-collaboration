"use client";

import type { Stage as KonvaStage } from "konva/lib/Stage";
import type { Node as KonvaNode } from "konva/lib/Node";
import type { Transformer as KonvaTransformer } from "konva/lib/shapes/Transformer";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/canvas/header";
import { useUserStore } from "@/store/useUserStore";
import { useToolStore } from "@/store/useToolStore";
import { apiUrl } from "@/constant";
import { getBoardDetails, getPersistedBoardShapes, joinBoard, shareBoard, uploadBoardImage, getUserByEmail, getCommentCountsByBoard } from "@/lib/api";
import { toast } from "sonner";
import type { BoardShape, CircleShape, EllipseShape, ImageShape, LaserStroke, RectShape, TextShape } from "./board-types";
import { newShapeId, normalizeShapesForClient } from "./board-shape-utils";
import { AVATAR_COLORS, getInitials, getStoredProfile } from "./board-profile-utils";
import BoardTopBar from "./board-top-bar";
import BoardRightPanel from "./board-right-panel";
import BoardMobileChat from "./board-mobile-chat";
import BoardCanvasStage from "./board-canvas-stage";
import BoardConnectionStatus from "./board-connection-status";
import BoardZoomControls from "./board-zoom-controls";
import { useBoardRealtime } from "./use-board-realtime";
import { useBoardCanvasInteractions, getAABB } from "./use-board-canvas-interactions";
import { useConnectionStatus } from "@/lib/use-connection-status";
import { Quadtree } from "@/lib/quadtree";
import { handleExportJson as exportJson, handleExportImage as exportImage, handleExportSvgFn as exportSvg } from "./board-export-utils";
import { useTextEditing } from "./use-text-editing";
import { useKeyboardShortcuts } from "./use-keyboard-shortcuts";

export default function Page() {
  const params = useParams();
  const router = useRouter();
  const id = params.slug as string;
  const user = useUserStore((state) => state.user);
  const loading = useUserStore((state) => state.loading);
  const selectedTool = useToolStore((state) => state.selected);
  const color = useToolStore((state) => state.color ?? "#000000");
  const strokeWidth = useToolStore((state) => state.strokeWidth ?? 2);


  const boardWrapRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const stageRef = useRef<KonvaStage | null>(null);
  const shapeRefs = useRef<Map<string, KonvaNode>>(new Map());
  const transformerRef = useRef<KonvaTransformer>(null);

  const [stageSize, setStageSize] = useState({ width: 1, height: 1 });
  const [mounted, setMounted] = useState(false);
  const [selectedShapeIds, setSelectedShapeIds] = useState<Set<string>>(new Set());
  const selectedShapeIdsRef = useRef(selectedShapeIds);
  selectedShapeIdsRef.current = selectedShapeIds;
  const clipboardRef = useRef<BoardShape[]>([]);
  const requestHistoryEventRef = useRef<((type: "undo" | "redo") => void) | null>(null);
  const commentTargetShapeId = selectedShapeIds.size === 1 ? Array.from(selectedShapeIds)[0] : null;
  const [shareOpen, setShareOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [shareRole, setShareRole] = useState<"EDITOR" | "VIEWER">("VIEWER");
  const connectionStatus = useConnectionStatus();
  const [chatOpen, setChatOpen] = useState(true);
  const [activeTopTab, setActiveTopTab] = useState<"Files" | "Canvas" | "Export" | "History">("Canvas");
  const [rightPanelTab, setRightPanelTab] = useState<"chat" | "comments" | null>("chat");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [followUserId, setFollowUserId] = useState<string | null>(null);
  const [draftDisplayName, setDraftDisplayName] = useState("");

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      boardWrapRef.current?.parentElement?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);
  const savedRightPanelTabRef = useRef<"chat" | "comments">("chat");

  useEffect(() => {
    if (isFullscreen) {
      savedRightPanelTabRef.current = rightPanelTab ?? "chat";
      setRightPanelTab(null);
    } else {
      setRightPanelTab(savedRightPanelTabRef.current);
    }
  }, [isFullscreen]);
  const [draftAvatarColor, setDraftAvatarColor] = useState(AVATAR_COLORS[0]);
  const [laserStrokes, setLaserStrokes] = useState<LaserStroke[]>([]);
  const [userSuggestions, setUserSuggestions] = useState<{ id: string; email: string; name?: string | null }[]>([]);

  const { data: boardDetails } = useQuery({
    queryKey: ["board-details", id],
    queryFn: () => getBoardDetails(id),
    enabled: Boolean(id && user),
  });

  const { data: persistedShapes } = useQuery({
    queryKey: ["board-shapes", id],
    queryFn: () => getPersistedBoardShapes(id),
    enabled: Boolean(id && user),
  });

  const { data: commentCounts } = useQuery({
    queryKey: ["comment-counts", id],
    queryFn: () => getCommentCountsByBoard(id),
    enabled: Boolean(id && user),
    refetchInterval: 15000,
  });

  const {
    shapes,
    setShapes,
    remoteCursors,
    persistShapes,
    updateShapesLocally,
    emitCursorMove,
    emitLaserStroke,
    emitShapeDraft,
    emitHistoryEvent,
    syncShapesFromYDoc,
    remoteLaserStrokes,
    remoteDraftShapes,
    onlineUserIds,
    forbiddenMessage,
    drawingRef,
  } = useBoardRealtime({
    boardId: id,
    userId: user?.id,
    persistedShapes,
  });

  const currentMembership = useMemo(
    () => boardDetails?.members?.find((member) => member.userId === user?.id) ?? null,
    [boardDetails?.members, user?.id]
  );
  const canEditBoard = currentMembership?.role === "ADMIN" || currentMembership?.role === "EDITOR";
  const shapesRef = useRef(shapes);
  shapesRef.current = shapes;
  const shapeVersionRef = useRef(0);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving">("saved");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canEditBoardRef = useRef(canEditBoard);
  canEditBoardRef.current = canEditBoard;
  const zoomRef = useRef(1);
  const viewportRef = useRef({ x: 0, y: 0 });

  const {
    editingTextId,
    setEditingTextId,
    editingTextIdRef,
    spawnTextarea,
  } = useTextEditing(boardWrapRef, shapes, updateShapesLocally, shapesRef, zoomRef, viewportRef);

  const setEditingTextIdRef = useRef<(id: string | null) => void>(setEditingTextId);
  setEditingTextIdRef.current = setEditingTextId;
  const spawnTextareaRef = useRef(spawnTextarea);
  spawnTextareaRef.current = spawnTextarea;

  useKeyboardShortcuts({
    canEditBoardRef,
    editingTextIdRef,
    selectedShapeIdsRef,
    setSelectedShapeIds,
    shapesRef,
    updateShapesLocally,
    clipboardRef,
    requestHistoryEventRef,
  });

  // Track shape version for auto-save indicator
  useEffect(() => {
    if (shapeVersionRef.current > 0 && shapes.length > 0) {
      setSaveStatus("saving");
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => setSaveStatus("saved"), 1500);
    }
    shapeVersionRef.current++;
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [shapes]);

  const handleCanvasInteraction = useCallback(() => {
    if (followUserId) setFollowUserId(null);
  }, [followUserId]);

  const quadtreeRef = useRef<Quadtree<BoardShape>>(null!);
  if (!quadtreeRef.current) {
    quadtreeRef.current = new Quadtree<BoardShape>({ x: -1e9, y: -1e9, w: 2e9, h: 2e9 });
  }
  const quadtreeReadyRef = useRef(false);

  const getShapeIdsInRect = useCallback((rect: { x: number; y: number; w: number; h: number }) => {
    return quadtreeRef.current.query(rect).map((s) => s.id);
  }, []);

  const {
    zoom,
    setZoom,
    viewport,
    setViewport,
    clampZoom,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleWheel,
    normalizeRect,
    updateShapePosition,
    marqueeRect,
  } = useBoardCanvasInteractions({
    selectedTool,
    canEdit: canEditBoard,
    color,
    strokeWidth,
    setShapes,
    updateShapesLocally,
    emitCursorMove,
    emitShapeDraft,
    setLaserStrokes,
    emitLaserStroke,
    onDrawingEnd: syncShapesFromYDoc,
    onCanvasInteraction: handleCanvasInteraction,
    onEmptyCanvasClick: () => setSelectedShapeIds(new Set()),
    drawingRef,
    snapToGrid: showGrid,
    onTextCreated: (shapeId, shapeData) => {
      setEditingTextId(shapeId);
      spawnTextarea(shapeId, "", shapeData);
    },
    onMarqueeSelect: (rect) => {
      const ids = quadtreeRef.current.query({ x: rect.x, y: rect.y, w: rect.width, h: rect.height }).map((s) => s.id);
      setSelectedShapeIds(new Set(ids));
    },
    getShapeIdsInRect,
  });
  zoomRef.current = zoom;
  viewportRef.current = viewport;

  const stageSizeRef = useRef(stageSize);
  stageSizeRef.current = stageSize;

  const centerOnPoint = useCallback((wx: number, wy: number) => {
    const cz = zoomRef.current;
    const cs = stageSizeRef.current;
    setViewport({
      x: cs.width / 2 - wx * cz,
      y: cs.height / 2 - wy * cz,
    });
  }, []);

  const handleGoToUser = useCallback((targetUserId: string) => {
    const cursor = remoteCursors[targetUserId];
    if (!cursor) return;
    centerOnPoint(cursor.x, cursor.y);
  }, [remoteCursors, centerOnPoint]);

  const handleFollowUser = useCallback((userId: string | null) => {
    setFollowUserId(userId);
  }, []);

  // Auto-follow: keep viewport centered on followed user's cursor
  useEffect(() => {
    if (!followUserId) return;
    const cursor = remoteCursors[followUserId];
    if (!cursor) return;
    centerOnPoint(cursor.x, cursor.y);
  }, [followUserId, remoteCursors, centerOnPoint]);

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

  // Auto-join the board once when the page loads
  const hasJoinedRef = useRef(false);
  useEffect(() => {
    if (!user?.id || !id || hasJoinedRef.current) return;
    hasJoinedRef.current = true;
    joinBoardMutation.mutate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id]);

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

  const profileStorageKey = user?.id ? `board-profile:${user.id}` : null;
  const storedProfile = getStoredProfile(profileStorageKey);
  const userLabel = storedProfile.displayName.trim() || user?.email || "Me";
  const avatarInitials = getInitials(userLabel);
  const avatarColor = storedProfile.avatarColor;

  const renderedShapes = useMemo(() => {
    const seen = new Map<string, typeof shapes[number]>();
    for (const s of shapes) seen.set(s.id, s);
    return Array.from(seen.values());
  }, [shapes]);

  useEffect(() => {
    quadtreeRef.current.rebuild(renderedShapes, getAABB);
    quadtreeReadyRef.current = true;
  }, [renderedShapes]);

  const visibleShapes = useMemo(() => {
    if (!quadtreeReadyRef.current || stageSize.width <= 1) return renderedShapes;

    const padding = 500;
    const viewRect = {
      x: -viewport.x / zoom - padding,
      y: -viewport.y / zoom - padding,
      w: stageSize.width / zoom + padding * 2,
      h: stageSize.height / zoom + padding * 2,
    };

    return quadtreeRef.current.query(viewRect);
  }, [renderedShapes, viewport, zoom, stageSize]);

  const shapeTypeMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of renderedShapes) map[s.id] = s.type;
    return map;
  }, [renderedShapes]);

  const topTabs = ["Files", "Canvas", "Export", "History"] as const;

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

  const requestHistoryEvent = (type: "undo" | "redo") => {
    if (!boardDetails) return;

    if (!canEditBoard) {
      toast.error("You have viewer access. Editing actions are disabled.");
      return;
    }

    const ok = emitHistoryEvent(type);
    if (!ok) {
      toast.error("Board connection is not ready yet");
      return;
    }

    toast.success(type === "undo" ? "Undo requested" : "Redo requested");
  };
  requestHistoryEventRef.current = requestHistoryEvent;

  const handleExportJson = () => exportJson(shapes, id, boardDetails?.title);

  const handleExportImage = () => exportImage(stageRef, boardDetails?.title);

  const handleExportSvg = () => exportSvg(shapes, boardDetails?.title);

  const handleFileImport = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!canEditBoard) {
      toast.error("You have viewer access. Import is disabled.");
      event.target.value = "";
      return;
    }

    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (file.type.startsWith("image/")) {
      try {
        const asset = await uploadBoardImage(id, file);
        const apiOrigin = apiUrl.replace(/\/api\/?$/, "");
        const imageUrl = asset.url.startsWith("http") ? asset.url : `${apiOrigin}${asset.url}`;

        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new window.Image();
          image.onload = () => resolve(image);
          image.onerror = () => reject(new Error("Unable to load image"));
          image.crossOrigin = "anonymous";
          image.src = imageUrl;
        });

        const maxWidth = 480;
        const scale = Math.min(1, maxWidth / Math.max(1, img.width));
        const width = Math.max(40, img.width * scale);
        const height = Math.max(40, img.height * scale);

        const centerX = (stageSize.width / 2 - viewport.x) / zoom;
        const centerY = (stageSize.height / 2 - viewport.y) / zoom;

        const shape: ImageShape = {
          id: newShapeId(),
          type: "image",
          x: centerX - width / 2,
          y: centerY - height / 2,
          width,
          height,
          url: imageUrl,
          color: "#000000",
          strokeWidth: 1,
        };

        updateShapesLocally((prev) => [...prev, shape]);
        setActiveTopTab("Files");
        toast.success("Image added to canvas");
      } catch (error) {
        toast.error((error as Error).message || "Unable to upload image");
      }
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as { shapes?: unknown } | unknown[];
      const shapePayload = Array.isArray(parsed)
        ? parsed
        : Array.isArray((parsed as { shapes?: unknown })?.shapes)
          ? (parsed as { shapes: unknown[] }).shapes
          : [];

      const nextShapes = normalizeShapesForClient(shapePayload);

      if (nextShapes.length === 0) {
        toast.error("File has no supported shapes");
        return;
      }

      setShapes(nextShapes);
      persistShapes(nextShapes);
      setActiveTopTab("Files");
      toast.success(`Imported ${nextShapes.length} shapes`);
    } catch {
      toast.error("Invalid file. Please import a board JSON file.");
    }
  };

  const saveProfile = () => {
    if (!profileStorageKey) return;

    try {
      localStorage.setItem(
        profileStorageKey,
        JSON.stringify({
          displayName: draftDisplayName.trim(),
          avatarColor: draftAvatarColor,
        })
      );
      setSettingsOpen(false);
      toast.success("Profile settings saved");
    } catch {
      toast.error("Could not save profile settings");
    }
  };

  const openSettings = () => {
    const profile = getStoredProfile(profileStorageKey);
    setDraftDisplayName(profile.displayName);
    setDraftAvatarColor(profile.avatarColor);
    setSettingsOpen(true);
  };

  const onTopTabClick = (tab: (typeof topTabs)[number]) => {
    if (!canEditBoard && tab === "Files") {
      toast.error("You have viewer access. Import is disabled.");
      return;
    }

    setActiveTopTab(tab);

    if (tab === "Files") {
      fileInputRef.current?.click();
      return;
    }

    if (tab === "Export") {
      setExportOpen(true);
      return;
    }

    if (tab === "History") {
      setHistoryOpen(true);
    }

    if (tab === "Canvas") {
      setExportOpen(false);
      setHistoryOpen(false);
    }
  };

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

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!forbiddenMessage) return;
    toast.error(forbiddenMessage);
  }, [forbiddenMessage]);

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

  // Multi-select helper functions
  const handleShapeSelect = (shapeId: string, shiftKey: boolean) => {
    if (shiftKey) {
      // Toggle shape in multi-select
      setSelectedShapeIds((prev) => {
        const next = new Set(prev);
        if (next.has(shapeId)) {
          next.delete(shapeId);
        } else {
          next.add(shapeId);
        }
        return next;
      });
    } else {
      // Single select
      setSelectedShapeIds(new Set([shapeId]));
    }
  };

  const isShapeSelected = (shapeId: string) => selectedShapeIds.has(shapeId);

  // Handle transform end for Transformer
  const handleTransformEnd = () => {
    const tr = transformerRef.current;
    if (!tr) return;

    const ids = selectedShapeIdsRef.current;

    updateShapesLocally((prev) => {
      const next = [...prev];

      ids.forEach((id) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const node = shapeRefs.current.get(id) as any;
        if (!node) return;

        const idx = next.findIndex((s) => s.id === id);
        if (idx === -1) return;

        const shape = next[idx];
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();

        switch (shape.type) {
          case "rectangle": {
            const newWidth = Math.max(5, Math.abs(node.width() * scaleX));
            const newHeight = Math.max(5, Math.abs(node.height() * scaleY));
            node.setAttrs({ scaleX: 1, scaleY: 1, width: newWidth, height: newHeight });
            next[idx] = ({ ...shape, x: node.x(), y: node.y(), width: newWidth, height: newHeight }) as BoardShape;
            break;
          }
          case "circle": {
            const newRadius = Math.max(5, Math.abs(node.radius() * scaleX));
            node.setAttrs({ scaleX: 1, scaleY: 1, radius: newRadius });
            next[idx] = ({ ...shape, x: node.x(), y: node.y(), radius: newRadius }) as BoardShape;
            break;
          }
          case "ellipse": {
            const newRadiusX = Math.max(5, Math.abs(node.radiusX() * scaleX));
            const newRadiusY = Math.max(5, Math.abs(node.radiusY() * scaleY));
            node.setAttrs({ scaleX: 1, scaleY: 1, radiusX: newRadiusX, radiusY: newRadiusY });
            next[idx] = ({ ...shape, x: node.x(), y: node.y(), radiusX: newRadiusX, radiusY: newRadiusY }) as BoardShape;
            break;
          }
          case "text": {
            const newFontSize = Math.max(8, Math.round(node.fontSize() * scaleX));
            node.setAttrs({ scaleX: 1, scaleY: 1, fontSize: newFontSize });
            next[idx] = ({ ...shape, x: node.x(), y: node.y(), fontSize: newFontSize }) as BoardShape;
            break;
          }
          case "image": {
            const newWidth = Math.max(10, Math.abs(node.width() * scaleX));
            const newHeight = Math.max(10, Math.abs(node.height() * scaleY));
            node.setAttrs({ scaleX: 1, scaleY: 1, width: newWidth, height: newHeight });
            next[idx] = ({ ...shape, x: node.x(), y: node.y(), width: newWidth, height: newHeight }) as BoardShape;
            break;
          }
        }
      });

      return next;
    });
  };

  // Attach/detach Transformer nodes
  useEffect(() => {
    const tr = transformerRef.current;
    if (!tr || selectedShapeIds.size === 0) {
      tr?.nodes([]);
      tr?.getLayer()?.batchDraw();
      return;
    }

    const nodes: unknown[] = [];
    selectedShapeIds.forEach((id) => {
      const node = shapeRefs.current.get(id);
      if (!node) return;
      const shape = renderedShapes.find((s) => s.id === id);
      if (shape?.type === "line") return;
      nodes.push(node);
    });

    tr.nodes(nodes as never[]);
    tr.getLayer()?.batchDraw();
  }, [selectedShapeIds, renderedShapes]);

  // Keyboard shortcuts — stable effect, reads refs for safe closure access
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingTextIdRef.current) return;

      const target = e.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.getAttribute("contenteditable") === "true";

      if (isTyping) return;
      if (!canEditBoardRef.current) return;

      const ids = selectedShapeIdsRef.current;

      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        ids.size > 0
      ) {
        e.preventDefault();
        updateShapesLocally((prev) =>
          prev.filter((shape) => !ids.has(shape.id))
        );
        setSelectedShapeIds(new Set());
        toast.success(`Deleted ${ids.size} shape(s)`);
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        requestHistoryEventRef.current?.("undo");
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        requestHistoryEventRef.current?.("redo");
      }

      const offsetShape = (s: BoardShape, dx: number, dy: number): BoardShape => {
        if (s.type === "line") return { ...s, id: newShapeId(), points: s.points.map((v, i) => v + (i % 2 === 0 ? dx : dy)) };
        return { ...s, id: newShapeId(), x: (s as RectShape | CircleShape | EllipseShape | TextShape | ImageShape).x + dx, y: (s as RectShape | CircleShape | EllipseShape | TextShape | ImageShape).y + dy };
      };

      // Duplicate (Ctrl+D)
      if ((e.ctrlKey || e.metaKey) && e.key === "d" && ids.size > 0) {
        e.preventDefault();
        const shapesArr = shapesRef.current;
        const newShapes = shapesArr.filter((s) => ids.has(s.id)).map((s) => offsetShape(s, 20, 20));
        updateShapesLocally((prev) => [...prev, ...newShapes]);
        const newIds = new Set(newShapes.map((s) => s.id));
        setSelectedShapeIds(newIds);
      }

      // Copy (Ctrl+C)
      if ((e.ctrlKey || e.metaKey) && e.key === "c" && ids.size > 0) {
        e.preventDefault();
        clipboardRef.current = shapesRef.current.filter((s) => ids.has(s.id));
      }

      // Paste (Ctrl+V)
      if ((e.ctrlKey || e.metaKey) && e.key === "v" && clipboardRef.current.length > 0) {
        e.preventDefault();
        const pasted = clipboardRef.current.map((s) => offsetShape(s, 30, 30));
        updateShapesLocally((prev) => [...prev, ...pasted]);
        const newIds = new Set(pasted.map((s) => s.id));
        setSelectedShapeIds(newIds);
      }

      // Z-order: bring to front (Ctrl+Shift+])
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "]" && ids.size > 0) {
        e.preventDefault();
        updateShapesLocally((prev) => {
          const moved = prev.filter((s) => ids.has(s.id));
          const rest = prev.filter((s) => !ids.has(s.id));
          return [...rest, ...moved];
        });
      }

      // Z-order: send to back (Ctrl+Shift+[)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "[" && ids.size > 0) {
        e.preventDefault();
        updateShapesLocally((prev) => {
          const moved = prev.filter((s) => ids.has(s.id));
          const rest = prev.filter((s) => !ids.has(s.id));
          return [...moved, ...rest];
        });
      }

      // Select All (Ctrl+A)
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault();
        const allIds = new Set(shapesRef.current.map((s) => s.id));
        setSelectedShapeIds(allIds);
      }

      // Alignment shortcuts (Ctrl+Shift+L/R/C/H/V)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && ids.size > 1) {
        const shapesArr = shapesRef.current.filter((s) => ids.has(s.id));
        const nonLine = shapesArr.filter((s) => s.type !== "line");
        if (nonLine.length < 2) return;

        const getBox = (s: BoardShape) => {
          if (s.type === "rectangle" || s.type === "image") return { x: (s as RectShape).x, y: (s as RectShape).y, w: (s as RectShape).width, h: (s as RectShape).height };
          if (s.type === "circle") return { x: (s as CircleShape).x - (s as CircleShape).radius, y: (s as CircleShape).y - (s as CircleShape).radius, w: (s as CircleShape).radius * 2, h: (s as CircleShape).radius * 2 };
          if (s.type === "ellipse") return { x: (s as EllipseShape).x - (s as EllipseShape).radiusX, y: (s as EllipseShape).y - (s as EllipseShape).radiusY, w: (s as EllipseShape).radiusX * 2, h: (s as EllipseShape).radiusY * 2 };
          if (s.type === "text") return { x: (s as TextShape).x, y: (s as TextShape).y, w: (s as TextShape).text.length * (s as TextShape).fontSize * 0.6 + 10, h: (s as TextShape).fontSize + 10 };
          return null;
        };

        if (e.key === "l") {
          e.preventDefault();
          const minX = Math.min(...nonLine.map((s) => getBox(s)!.x));
          updateShapesLocally((prev) => prev.map((s) => ids.has(s.id) && s.type !== "line" ? { ...s, x: minX } : s));
        }
        if (e.key === "r") {
          e.preventDefault();
          const shapesWithBox = nonLine.map((s) => ({ s, box: getBox(s)! }));
          updateShapesLocally((prev) => prev.map((s) => {
            if (!ids.has(s.id) || s.type === "line") return s;
            const box = getBox(s);
            if (!box) return s;
            const maxRight = Math.max(...shapesWithBox.map(({ box }) => box.x + box.w));
            if (s.type === "rectangle" || s.type === "image") return { ...s, x: maxRight - box.w } as BoardShape;
            if (s.type === "circle") return { ...s, x: maxRight - box.w + (s as CircleShape).radius } as BoardShape;
            if (s.type === "ellipse") return { ...s, x: maxRight - box.w + (s as EllipseShape).radiusX } as BoardShape;
            return s;
          }));
        }
        if (e.key === "c") {
          e.preventDefault();
          const shapesWithBox = nonLine.map((s) => ({ s, box: getBox(s)! }));
          const totalW = Math.max(...shapesWithBox.map(({ box }) => box.x + box.w)) - Math.min(...shapesWithBox.map(({ box }) => box.x));
          const center = Math.min(...shapesWithBox.map(({ box }) => box.x)) + totalW / 2;
          updateShapesLocally((prev) => prev.map((s) => {
            if (!ids.has(s.id) || s.type === "line") return s;
            const box = getBox(s);
            if (!box) return s;
            if (s.type === "rectangle" || s.type === "image") return { ...s, x: center - box.w / 2 } as BoardShape;
            if (s.type === "circle") return { ...s, x: center } as BoardShape;
            if (s.type === "ellipse") return { ...s, x: center } as BoardShape;
            if (s.type === "text") return { ...s, x: center - box.w / 2 } as BoardShape;
            return s;
          }));
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [updateShapesLocally]);

  // User search for share dialog
  useEffect(() => {
    if (shareEmail.trim().length < 2) {
      setUserSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      const user = await getUserByEmail(shareEmail.trim());
      setUserSuggestions(user ? [user] : []);
    }, 300);

    return () => clearTimeout(timer);
  }, [shareEmail]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f8fafc]">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json,image/*"
        className="hidden"
        onChange={handleFileImport}
      />

      <BoardTopBar
        boardId={id}
        boardTitle={boardDetails?.title || "Project Draft"}
        isViewOnly={!canEditBoard}
        saveStatus={saveStatus}
        topTabs={topTabs}
        activeTopTab={activeTopTab}
        onTopTabClick={onTopTabClick}
        chatOpen={chatOpen}
        onToggleChat={() => {
          setChatOpen((prev) => !prev);
          setRightPanelTab((prev) => prev === "chat" ? null : "chat");
        }}
        shareOpen={shareOpen}
        onShareOpenChange={setShareOpen}
        shareEmail={shareEmail}
        onShareEmailChange={setShareEmail}
        shareRole={shareRole}
        onShareRoleChange={setShareRole}
        onInviteCollaborator={() => {
          const email = shareEmail.trim();
          if (!email) {
            toast.error("Email is required");
            return;
          }
          shareBoardMutation.mutate({ email, role: shareRole });
        }}
        sharePending={shareBoardMutation.isPending}
        userSuggestions={userSuggestions}
        onSelectSuggestion={(email) => setShareEmail(email)}
        shareLink={getShareLink()}
        onCopyShareLink={copyShareLink}
        exportOpen={exportOpen}
        onExportOpenChange={setExportOpen}
        onExportImage={handleExportImage}
        onExportSvg={handleExportSvg}
        onExportJson={handleExportJson}
        historyOpen={historyOpen}
        onHistoryOpenChange={setHistoryOpen}
        onUndo={() => requestHistoryEvent("undo")}
        onRedo={() => requestHistoryEvent("redo")}
        settingsOpen={settingsOpen}
        onSettingsOpenChange={setSettingsOpen}
        onOpenSettings={openSettings}
        draftAvatarColor={draftAvatarColor}
        draftDisplayName={draftDisplayName}
        onDraftDisplayNameChange={setDraftDisplayName}
        onDraftAvatarColorChange={setDraftAvatarColor}
        userEmail={user?.email}
        userLabel={userLabel}
        onSaveSettings={saveProfile}
        helpOpen={helpOpen}
        onHelpOpenChange={setHelpOpen}
        avatarColor={avatarColor}
        avatarInitials={avatarInitials}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid((prev) => !prev)}
      />

      <div className="relative flex min-h-0 flex-1">
        <aside className="hidden bg-linear-to-b from-white via-white to-slate-50 px-2 py-3 md:flex md:items-start md:justify-center overflow-y-auto max-h-full w-28 [&::-webkit-scrollbar]:hidden">
          <Header 
            layout="vertical" 
            disabled={mounted && !canEditBoard}
            onUndo={() => requestHistoryEvent("undo")}
            onRedo={() => requestHistoryEvent("redo")}
          />
        </aside>

        <main ref={boardWrapRef} className="relative min-w-0 flex-1 bg-[radial-gradient(circle_at_1px_1px,#dbe4ef_1px,transparent_1.3px)] bg-size-[20px_20px]">
          <div className="absolute left-2 top-2 z-20 md:hidden">
            <Header 
              disabled={mounted && !canEditBoard}
              onUndo={() => requestHistoryEvent("undo")}
              onRedo={() => requestHistoryEvent("redo")}
            />
          </div>

          {showGrid && (
            <div
              className="pointer-events-none absolute inset-0 z-10"
              style={{
                backgroundImage: "linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)",
                backgroundSize: "20px 20px",
              }}
            />
          )}
          <BoardCanvasStage
            stageSize={stageSize}
            stageRef={stageRef}
            viewport={viewport}
            zoom={zoom}
            renderedShapes={visibleShapes}
            canEditBoard={canEditBoard}
            selectedShapeIds={selectedShapeIds}
            selectedShapeIdsRef={selectedShapeIdsRef}
            shapeRefs={shapeRefs}
            transformerRef={transformerRef}
            handlePointerDown={handlePointerDown}
            handlePointerMove={handlePointerMove}
            handlePointerUp={handlePointerUp}
            handleWheel={handleWheel}
            handleShapeSelect={handleShapeSelect}
            isShapeSelected={isShapeSelected}
            handleTransformEnd={handleTransformEnd}
            normalizeRect={normalizeRect}
            updateShapePosition={updateShapePosition}
            updateShapesLocally={updateShapesLocally}
            marqueeRect={marqueeRect}
            commentCounts={commentCounts}
            setSelectedShapeIds={setSelectedShapeIds}
            setRightPanelTab={setRightPanelTab}
            remoteDraftShapes={remoteDraftShapes}
            laserStrokes={laserStrokes}
            remoteLaserStrokes={remoteLaserStrokes}
            remoteCursors={remoteCursors}
            cursorLabelByUserId={cursorLabelByUserId}
            editingTextId={editingTextId}
            setEditingTextId={setEditingTextId}
            spawnTextarea={spawnTextarea}
          />
          <BoardConnectionStatus connectionStatus={connectionStatus} />
          <BoardZoomControls
            zoom={zoom}
            setZoom={setZoom}
            clampZoom={clampZoom}
            stageSize={stageSize}
            shapes={shapes}
            setViewport={setViewport}
          />
        </main>

        <BoardRightPanel
          members={members}
          rightPanelTab={rightPanelTab}
          onRightPanelTabChange={setRightPanelTab}
          boardId={id}
          currentUserId={user?.id}
          selectedShapeId={commentTargetShapeId}
          shapeTypeMap={shapeTypeMap}
          onlineUserIds={onlineUserIds}
          onGoToUser={handleGoToUser}
          followUserId={followUserId}
          onFollowUser={handleFollowUser}
        />

        <BoardMobileChat boardId={id} currentUserId={user?.id} chatOpen={chatOpen} onClose={() => setChatOpen(false)} />
      </div>
    </div>
  );
}
