"use client";

import type { Stage as KonvaStage } from "konva/lib/Stage";
import type { Node as KonvaNode, KonvaEventObject } from "konva/lib/Node";
import type { Transformer as KonvaTransformer } from "konva/lib/shapes/Transformer";
import { useCallback, useEffect, useMemo, useRef, useState, startTransition, type ChangeEvent } from "react";
import { Arrow, Circle, Ellipse, Group, Image as KonvaImage, Layer, Line, Rect, Stage, Text, Transformer } from "react-konva";
import { Minus, Plus } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/canvas/header";
import { useUserStore } from "@/store/useUserStore";
import { useToolStore } from "@/store/useToolStore";
import { apiUrl } from "@/constant";
import { getBoardDetails, getPersistedBoardShapes, joinBoard, shareBoard, uploadBoardImage, getUserByEmail, getCommentCountsByBoard } from "@/lib/api";
import { toast } from "sonner";
import type { BoardShape, CircleShape, EllipseShape, ImageShape, LaserStroke, RectShape, TextShape } from "./board-types";
import { newShapeId, normalizeShapesForClient, serializeShapesToSvg } from "./board-shape-utils";
import { AVATAR_COLORS, getInitials, getStoredProfile } from "./board-profile-utils";
import BoardTopBar from "./board-top-bar";
import BoardRightPanel from "./board-right-panel";
import BoardMobileChat from "./board-mobile-chat";
import { useBoardRealtime } from "./use-board-realtime";
import { useBoardCanvasInteractions, getAABB } from "./use-board-canvas-interactions";
import { useConnectionStatus } from "@/lib/use-connection-status";
import { Quadtree } from "@/lib/quadtree";

export default function Page() {
  const params = useParams();
  const router = useRouter();
  const id = params.slug as string;
  const user = useUserStore((state) => state.user);
  const loading = useUserStore((state) => state.loading);
  const selectedTool = useToolStore((state) => state.selected);
  const color = useToolStore((state) => state.color ?? "#000000");
  const strokeWidth = useToolStore((state) => state.strokeWidth ?? 2);
  const setTool = useToolStore((state) => state.setTool);

  const boardWrapRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const stageRef = useRef<KonvaStage | null>(null);
  const shapeRefs = useRef<Map<string, KonvaNode>>(new Map());
  const transformerRef = useRef<KonvaTransformer>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [stageSize, setStageSize] = useState({ width: 1, height: 1 });
  const [mounted, setMounted] = useState(false);
  const [selectedShapeIds, setSelectedShapeIds] = useState<Set<string>>(new Set());
  const selectedShapeIdsRef = useRef(selectedShapeIds);
  selectedShapeIdsRef.current = selectedShapeIds;
  const clipboardRef = useRef<BoardShape[]>([]);
  const commentTargetShapeId = selectedShapeIds.size === 1 ? Array.from(selectedShapeIds)[0] : null;
  const [shareOpen, setShareOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [shareRole, setShareRole] = useState<"EDITOR" | "VIEWER">("VIEWER");
  const connectionStatus = useConnectionStatus();
  const [chatOpen, setChatOpen] = useState(false);
  const [activeTopTab, setActiveTopTab] = useState<"Files" | "Canvas" | "Export" | "History">("Canvas");
  const [rightPanelTab, setRightPanelTab] = useState<"activity" | "chat" | "comments">("chat");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [followUserId, setFollowUserId] = useState<string | null>(null);
  const [draftDisplayName, setDraftDisplayName] = useState("");

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      boardWrapRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);
  const [draftAvatarColor, setDraftAvatarColor] = useState(AVATAR_COLORS[0]);
  const [laserStrokes, setLaserStrokes] = useState<LaserStroke[]>([]);
const [editingTextId, setEditingTextId] = useState<string | null>(null);
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
    serverReadOnly,
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
  const editingTextIdRef = useRef(editingTextId);
  editingTextIdRef.current = editingTextId;

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

  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
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
  }, [renderedShapes]);

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

  const downloadBlob = (blob: Blob, filename: string) => {
    if (typeof window === "undefined") return;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    const payload = {
      boardId: id,
      exportedAt: new Date().toISOString(),
      shapes,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    downloadBlob(blob, `${boardDetails?.title || "board"}-shapes.json`);
    toast.success("Board exported as JSON");
  };

  const handleExportImage = () => {
    const stage = stageRef.current;
    if (!stage) {
      toast.error("Canvas is not ready yet");
      return;
    }

    const dataUrl = stage.toDataURL({ pixelRatio: 2 });
    if (!dataUrl) {
      toast.error("Unable to export canvas");
      return;
    }

    const anchor = document.createElement("a");
    anchor.href = dataUrl;
    anchor.download = `${boardDetails?.title || "board"}.png`;
    anchor.click();
    toast.success("Board exported as PNG");
  };

  const handleExportSvg = () => {
    const svgContent = serializeShapesToSvg(shapes, boardDetails?.title || "Whiteboard");
    const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
    downloadBlob(blob, `${boardDetails?.title || "board"}.svg`);
    toast.success("Board exported as SVG");
  };

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

  // Text editing helpers
  const spawnTextarea = (
    shapeId: string,
    text = "",
    position?: { x: number; y: number; fontSize: number; fontFamily: string; color: string },
  ) => {
    const shape = position
      ? { id: shapeId, type: "text" as const, x: position.x, y: position.y, fontSize: position.fontSize, fontFamily: position.fontFamily, color: position.color }
      : (shapesRef.current.find((s) => s.id === shapeId) as { id: string; type: "text"; x: number; y: number; fontSize: number; fontFamily: string; color: string } | undefined);
    if (!shape) return;

    const existing = textareaRef.current;
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
      textareaRef.current = null;
    }

    const container = boardWrapRef.current;
    if (!container) return;

    const el = document.createElement("textarea");
    el.value = text;
    el.dataset.editingTextId = shapeId;
    el.style.position = "absolute";
    el.style.left = `${shape.x * zoom + viewport.x}px`;
    el.style.top = `${shape.y * zoom + viewport.y}px`;
    el.style.fontSize = `${shape.fontSize * zoom}px`;
    el.style.fontFamily = shape.fontFamily || "Arial";
    el.style.color = shape.color;
    el.style.background = "rgba(255,255,255,0.9)";
    el.style.border = "2px dashed #6366f1";
    el.style.outline = "none";
    el.style.resize = "none";
    el.style.overflow = "hidden";
    el.style.minWidth = "120px";
    el.style.minHeight = `${shape.fontSize * zoom + 12}px`;
    el.style.whiteSpace = "pre-wrap";
    el.style.zIndex = "30";
    el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
    el.style.lineHeight = "1.3";
    el.style.padding = "4px";
    el.style.margin = "0";
    el.style.borderRadius = "4px";

    container.appendChild(el);
    textareaRef.current = el;

    // Use rAF to wait for React re-render before focusing
    requestAnimationFrame(() => {
      el.focus();
      el.select();
    });

    el.addEventListener("pointerdown", (e) => e.stopPropagation());

    let cancelled = false;

    el.addEventListener("blur", () => {
      if (cancelled) return;
      finishTextEditing(el.value);
      // cleanupTextarea intentionally NOT called here —
      // finishTextEditing calls setEditingTextId(null), which
      // triggers the cleanup effect (line 901) to remove the DOM node.
      // Calling it here would cause a NotFoundError when spawnTextarea
      // removes an existing textarea and synchronously fires blur.
    });

    el.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cancelled = true;
        cancelTextEditing(el.value);
        cleanupTextarea(el);
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        finishTextEditing(el.value);
        cleanupTextarea(el);
      }
    });
  };

  const cleanupTextarea = (el: HTMLTextAreaElement) => {
    try {
      if (el.parentNode) el.parentNode.removeChild(el);
    } catch {
      // Ignore — may be called re-entrantly during blur propagation
    }
    if (textareaRef.current === el) textareaRef.current = null;
  };

  const finishTextEditing = (text: string) => {
    const id = editingTextIdRef.current;
    if (!id) return;

    if (!text.trim()) {
      updateShapesLocally((prev) =>
        prev.filter((shape) => shape.id !== id)
      );
    } else {
      updateShapesLocally((prev) =>
        prev.map((shape) =>
          shape.id === id && shape.type === "text"
            ? { ...shape, text }
            : shape
        )
      );
    }

    setEditingTextId(null);
  };

  const cancelTextEditing = (text: string) => {
    const id = editingTextIdRef.current;
    if (!id) return;

    if (!text.trim()) {
      updateShapesLocally((prev) =>
        prev.filter((shape) => shape.id !== id)
      );
    }

    setEditingTextId(null);
  };

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
        requestHistoryEvent("undo");
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        requestHistoryEvent("redo");
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

  // Sync textarea position on zoom/scroll
  useEffect(() => {
    if (!editingTextId || !textareaRef.current) return;
    const shape = shapes.find((s) => s.id === editingTextId);
    if (!shape || shape.type !== "text") return;

    const el = textareaRef.current;
    el.style.left = `${shape.x * zoom + viewport.x}px`;
    el.style.top = `${shape.y * zoom + viewport.y}px`;
    el.style.fontSize = `${shape.fontSize * zoom}px`;
    el.style.minHeight = `${shape.fontSize * zoom + 12}px`;
  }, [editingTextId, zoom, viewport, shapes]);

  // Cleanup textarea when editing ends
  useEffect(() => {
    if (editingTextId) return;
    const el = textareaRef.current;
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
      textareaRef.current = null;
    }
  }, [editingTextId]);

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
        onToggleChat={() => setChatOpen((prev) => !prev)}
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
        <aside className="hidden w-24 border-r border-slate-200 bg-linear-to-b from-white via-white to-slate-50 px-2 py-3 md:flex md:items-start md:justify-center">
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
          <Stage
            ref={stageRef}
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
          >
            <Layer>
              <Rect
                x={0}
                y={0}
                width={stageSize.width}
                height={stageSize.height}
                fill="white"
                listening={false}
              />
              <Group x={viewport.x} y={viewport.y} scaleX={zoom} scaleY={zoom}>
                  {renderedShapes.map((shape) => {
                  const shapeCommentCount = commentCounts?.[shape.id] ?? 0;
                  if (shape.type === "line") {
                    const isArrow = shape.tool === "arrow";
                    const arrowLen = Math.hypot(shape.points[2] - shape.points[0], shape.points[3] - shape.points[1]);
                    return isArrow ? (
                      <Arrow
                        key={shape.id}
                        id={shape.id}
                        points={shape.points}
                        stroke={shape.color}
                        strokeWidth={shape.strokeWidth}
                        pointerLength={Math.max(8, Math.min(arrowLen * 0.15, 30))}
                        pointerWidth={Math.max(6, Math.min(arrowLen * 0.1, 24))}
                        fill={shape.color}
                        lineCap="round"
                        lineJoin="round"
                        draggable={canEditBoard}
                        onClick={(e) => {
                          e.cancelBubble = true;
                          handleShapeSelect(shape.id, e.evt.shiftKey);
                        }}
                        onTap={() => {
                          handleShapeSelect(shape.id, false);
                        }}
                        onDragEnd={(event) => {
                          if (!canEditBoard) return;
                          const pos = event.target.position();
                          updateShapesLocally((prev) =>
                            prev.map((s) => {
                              if (s.id !== shape.id || s.type !== "line") return s;
                              return {
                                ...s,
                                points: s.points.map((p, i) => p + (i % 2 === 0 ? pos.x : pos.y)),
                              };
                            })
                          );
                          event.target.position({ x: 0, y: 0 });
                        }}
                        shadowEnabled={isShapeSelected(shape.id)}
                        shadowColor="#6366f1"
                        shadowBlur={isShapeSelected(shape.id) ? 8 : 0}
                      />
                    ) : (
                      <Line
                        key={shape.id}
                        id={shape.id}
                        points={shape.points}
                        stroke={shape.color}
                        strokeWidth={shape.strokeWidth}
                        tension={0.5}
                        lineCap="round"
                        lineJoin="round"
                        draggable={canEditBoard}
                        onClick={(e) => {
                          e.cancelBubble = true;
                          handleShapeSelect(shape.id, e.evt.shiftKey);
                        }}
                        onTap={() => {
                          handleShapeSelect(shape.id, false);
                        }}
                        onDragEnd={(event) => {
                          if (!canEditBoard) return;
                          const pos = event.target.position();
                          updateShapesLocally((prev) =>
                            prev.map((s) => {
                              if (s.id !== shape.id || s.type !== "line") return s;
                              const dx = pos.x;
                              const dy = pos.y;
                              return {
                                ...s,
                                points: s.points.map((p, i) => p + (i % 2 === 0 ? dx : dy)),
                              };
                            })
                          );
                          event.target.position({ x: 0, y: 0 });
                        }}
                        shadowEnabled={isShapeSelected(shape.id)}
                        shadowColor="#6366f1"
                        shadowBlur={isShapeSelected(shape.id) ? 8 : 0}
                        globalCompositeOperation={
                          shape.tool === "eraser" ? "destination-out" : "source-over"
                        }
                      />
                    );
                  }

                  if (shape.type === "rectangle") {
                    const rect: RectShape = normalizeRect(shape);
                    return (
                      <Rect
                        key={shape.id}
                        id={shape.id}
                        x={rect.x}
                        y={rect.y}
                        width={rect.width}
                        height={rect.height}
                        stroke={rect.color}
                        strokeWidth={rect.strokeWidth}
                        fill={rect.fill || "transparent"}
                        draggable={canEditBoard}
                        onClick={(e) => {
                          e.cancelBubble = true;
                          handleShapeSelect(shape.id, e.evt.shiftKey);
                        }}
                        onTap={() => {
                          handleShapeSelect(shape.id, false);
                        }}
                        onDragEnd={(event) => {
                          if (!canEditBoard) return;
                          const pos = event.target.position();
                          updateShapePosition(shape.id, pos.x, pos.y);
                        }}
                        shadowEnabled={isShapeSelected(shape.id)}
                        shadowColor="#6366f1"
                        shadowBlur={isShapeSelected(shape.id) ? 8 : 0}
                        ref={(node) => {
                          if (node) shapeRefs.current.set(shape.id, node);
                          else shapeRefs.current.delete(shape.id);
                        }}
                      />
                    );
                  }

                    if (shape.type === "image") {
                      return (
                        <BoardImageShape
                          key={shape.id}
                          shape={shape}
                          draggable={canEditBoard}
                          selected={isShapeSelected(shape.id)}
                          onSelect={(shiftKey) => handleShapeSelect(shape.id, shiftKey)}
                          onDragEnd={(x, y) => updateShapePosition(shape.id, x, y)}
                          getShapeNode={(node) => {
                            if (node) shapeRefs.current.set(shape.id, node);
                            else shapeRefs.current.delete(shape.id);
                          }}
                        />
                      );
                    }

                if (shape.type === "circle") {
                  return (
                    <Circle
                      key={shape.id}
                      id={shape.id}
                      x={shape.x}
                      y={shape.y}
                      radius={shape.radius}
                      stroke={shape.color}
                      strokeWidth={shape.strokeWidth}
                      fill={shape.fill || "transparent"}
                      draggable={canEditBoard}
                      onClick={(e) => {
                        e.cancelBubble = true;
                        handleShapeSelect(shape.id, e.evt.shiftKey);
                      }}
                      onTap={() => {
                        handleShapeSelect(shape.id, false);
                      }}
                      onDragEnd={(event) => {
                        if (!canEditBoard) return;
                        const pos = event.target.position();
                        updateShapePosition(shape.id, pos.x, pos.y);
                      }}
                      shadowEnabled={isShapeSelected(shape.id)}
                      shadowColor="#6366f1"
                      shadowBlur={isShapeSelected(shape.id) ? 8 : 0}
                      ref={(node) => {
                        if (node) shapeRefs.current.set(shape.id, node);
                        else shapeRefs.current.delete(shape.id);
                      }}
                    />
                  );
                }

                if (shape.type === "ellipse") {
                  return (
                    <Ellipse
                      key={shape.id}
                      id={shape.id}
                      x={shape.x}
                      y={shape.y}
                      radiusX={shape.radiusX}
                      radiusY={shape.radiusY}
                      stroke={shape.color}
                      strokeWidth={shape.strokeWidth}
                      fill={shape.fill || "transparent"}
                      draggable={canEditBoard}
                      onClick={(e) => {
                        e.cancelBubble = true;
                        handleShapeSelect(shape.id, e.evt.shiftKey);
                      }}
                      onTap={() => {
                        handleShapeSelect(shape.id, false);
                      }}
                      onDragEnd={(event) => {
                        if (!canEditBoard) return;
                        const pos = event.target.position();
                        updateShapePosition(shape.id, pos.x, pos.y);
                      }}
                      shadowEnabled={isShapeSelected(shape.id)}
                      shadowColor="#6366f1"
                      shadowBlur={isShapeSelected(shape.id) ? 8 : 0}
                      ref={(node) => {
                        if (node) shapeRefs.current.set(shape.id, node);
                        else shapeRefs.current.delete(shape.id);
                      }}
                    />
                  );
                }

                if (shape.type === "text") {
                  return (
                    <Text
                      key={shape.id}
                      id={shape.id}
                      x={shape.x}
                      y={shape.y}
                      text={shape.text}
                      fontSize={shape.fontSize}
                      fontFamily={shape.fontFamily || "Arial"}
                      fill={shape.color}
                      draggable={canEditBoard && editingTextId !== shape.id}
                      onClick={(e) => {
                        e.cancelBubble = true;
                        handleShapeSelect(shape.id, e.evt.shiftKey);
                      }}
                      onTap={() => {
                        handleShapeSelect(shape.id, false);
                      }}
                      onDblClick={() => {
                        setEditingTextId(shape.id);
                        spawnTextarea(shape.id, shape.text);
                      }}
                      onDragEnd={(event) => {
                        if (!canEditBoard) return;
                        const pos = event.target.position();
                        updateShapePosition(shape.id, pos.x, pos.y);
                      }}
                      shadowEnabled={isShapeSelected(shape.id)}
                      shadowColor="#6366f1"
                      shadowBlur={isShapeSelected(shape.id) ? 8 : 0}
                      ref={(node) => {
                        if (node) shapeRefs.current.set(shape.id, node);
                        else shapeRefs.current.delete(shape.id);
                      }}
                    />
                  );
                }

                return null;
              })}
              {canEditBoard && selectedShapeIds.size > 0 && (
                <Transformer
                  ref={transformerRef}
                  rotateEnabled={false}
                  keepRatio={false}
                  enabledAnchors={[
                    "top-left",
                    "top-center",
                    "top-right",
                    "middle-left",
                    "middle-right",
                    "bottom-left",
                    "bottom-center",
                    "bottom-right",
                  ]}
                  boundBoxFunc={(oldBox, newBox) => {
                    if (newBox.width < 10 || newBox.height < 10) return oldBox;
                    return newBox;
                  }}
                  onTransformEnd={handleTransformEnd}
                />
              )}
              {marqueeRect && (
                <Rect
                  x={marqueeRect.x}
                  y={marqueeRect.y}
                  width={marqueeRect.width}
                  height={marqueeRect.height}
                  stroke="#6366f1"
                  strokeWidth={1 / zoom}
                  dash={[6 / zoom, 4 / zoom]}
                  fill="rgba(99, 102, 241, 0.08)"
                  listening={false}
                />
              )}
              {commentCounts ? renderedShapes.map((shape) => {
                const count = commentCounts[shape.id];
                if (!count) return null;
                let bx = 0, by = 0;
                switch (shape.type) {
                  case "rectangle": bx = shape.x + shape.width; by = shape.y; break;
                  case "circle": bx = shape.x + shape.radius; by = shape.y - shape.radius; break;
                  case "ellipse": bx = shape.x + shape.radiusX; by = shape.y - shape.radiusY; break;
                  case "line": {
                    const pts = shape.points;
                    let mx = -Infinity, my = -Infinity;
                    for (let i = 0; i < pts.length; i += 2) {
                      if (pts[i] > mx) mx = pts[i];
                      if (pts[i + 1] > my) my = pts[i + 1];
                    }
                    bx = mx; by = my;
                    break;
                  }
                  case "text": bx = shape.x + 40; by = shape.y - 6; break;
                  case "image": bx = shape.x + shape.width; by = shape.y; break;
                  default: { const s = shape as { x?: number; y?: number }; bx = s.x ?? 0; by = s.y ?? 0; }
                }
                return (
                  <Group key={`badge-${shape.id}`} x={bx} y={by}>
                    <Circle radius={9} fill="#6366f1" stroke="#fff" strokeWidth={2} />
                    <Text
                      x={-9} y={-7}
                      width={18} height={14}
                      text={String(count)}
                      fontSize={10}
                      fontStyle="bold"
                      fill="#fff"
                      align="center"
                      verticalAlign="middle"
                    />
                  </Group>
                );
              }) : null}
              </Group>
            </Layer>

            {/* Remote draft shapes layer (in-progress drawings from others) */}
            <Layer listening={false}>
              <Group x={viewport.x} y={viewport.y} scaleX={zoom} scaleY={zoom}>
                {Array.from(remoteDraftShapes.values()).map((draft) => (
                  <DraftShapeRenderer key={draft.id} shape={draft} />
                ))}
              </Group>
            </Layer>

            <Layer listening={false}>
              <Group x={viewport.x} y={viewport.y} scaleX={zoom} scaleY={zoom}>
                {[...laserStrokes, ...remoteLaserStrokes].map((stroke) => (
                  <Line
                    key={stroke.id}
                    points={stroke.points}
                    stroke={stroke.color}
                    strokeWidth={stroke.strokeWidth}
                    tension={0.5}
                    lineCap="round"
                    lineJoin="round"
                    opacity={0.85}
                  />
                ))}
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

          {connectionStatus !== "connected" && (
            <div className="pointer-events-auto absolute bottom-4 left-4 z-20 flex items-center gap-2 rounded-xl border border-slate-200 bg-white/95 px-3 py-1.5 shadow-sm backdrop-blur">
              <span className={`inline-block h-2 w-2 rounded-full ${
                connectionStatus === "connecting" ? "bg-amber-400 animate-pulse" :
                connectionStatus === "error" ? "bg-red-500" :
                "bg-slate-400"
              }`} />
              <span className="text-xs font-medium text-slate-600">
                {connectionStatus === "connecting" ? "Connecting..." :
                 connectionStatus === "error" ? "Connection failed" :
                 "Disconnected"}
              </span>
              {connectionStatus === "error" && (
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="ml-1 text-xs text-indigo-600 hover:text-indigo-500 underline"
                >
                  Retry
                </button>
              )}
            </div>
          )}
          <div className="pointer-events-auto absolute bottom-4 right-4 z-20 flex items-center gap-2 rounded-xl border border-slate-200 bg-white/95 px-2 py-1.5 shadow-sm backdrop-blur">
            <button
              type="button"
              onClick={() => {
                if (shapes.length === 0) { setZoom(1); setViewport({ x: 0, y: 0 }); return; }
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                for (const s of shapes) {
                  if (s.type === "line") {
                    for (let i = 0; i < s.points.length; i += 2) {
                      if (s.points[i] < minX) minX = s.points[i];
                      if (s.points[i + 1] < minY) minY = s.points[i + 1];
                      if (s.points[i] > maxX) maxX = s.points[i];
                      if (s.points[i + 1] > maxY) maxY = s.points[i + 1];
                    }
                  } else if (s.type === "circle") {
                    if (s.x - s.radius < minX) minX = s.x - s.radius;
                    if (s.y - s.radius < minY) minY = s.y - s.radius;
                    if (s.x + s.radius > maxX) maxX = s.x + s.radius;
                    if (s.y + s.radius > maxY) maxY = s.y + s.radius;
                  } else if (s.type === "ellipse") {
                    if (s.x - s.radiusX < minX) minX = s.x - s.radiusX;
                    if (s.y - s.radiusY < minY) minY = s.y - s.radiusY;
                    if (s.x + s.radiusX > maxX) maxX = s.x + s.radiusX;
                    if (s.y + s.radiusY > maxY) maxY = s.y + s.radiusY;
                  } else if (s.type === "text") {
                    if (s.x < minX) minX = s.x;
                    if (s.y < minY) minY = s.y;
                    const tw = s.text.length * s.fontSize * 0.6 + 10;
                    if (s.x + tw > maxX) maxX = s.x + tw;
                    if (s.y + s.fontSize + 10 > maxY) maxY = s.y + s.fontSize + 10;
                  } else {
                    const shape = s as { x: number; y: number; width: number; height: number };
                    if (shape.x < minX) minX = shape.x;
                    if (shape.y < minY) minY = shape.y;
                    if (shape.x + shape.width > maxX) maxX = shape.x + shape.width;
                    if (shape.y + shape.height > maxY) maxY = shape.y + shape.height;
                  }
                }
                const cw = maxX - minX || 1;
                const ch = maxY - minY || 1;
                const pad = 40;
                const fitZoom = Math.min((stageSize.width - pad * 2) / cw, (stageSize.height - pad * 2) / ch, 2);
                setZoom(Math.max(0.1, fitZoom));
                setViewport({ x: (stageSize.width - cw * fitZoom) / 2 - minX * fitZoom, y: (stageSize.height - ch * fitZoom) / 2 - minY * fitZoom });
              }}
              className="grid h-7 w-7 place-items-center rounded-md text-xs font-bold text-slate-600 transition hover:bg-slate-100"
              title="Fit to screen"
            >
              Fit
            </button>
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

const BoardImageShape = ({
  shape,
  draggable,
  selected,
  onSelect,
  onDragEnd,
  getShapeNode,
}: {
  shape: ImageShape;
  draggable: boolean;
  selected: boolean;
  onSelect: (shiftKey: boolean) => void;
  onDragEnd: (x: number, y: number) => void;
  getShapeNode?: (node: KonvaNode | null) => void;
}) => {
  const image = useImageElement(shape.url);

  return (
    <KonvaImage
      id={shape.id}
      image={image ?? undefined}
      x={shape.x}
      y={shape.y}
      width={shape.width}
      height={shape.height}
      draggable={draggable}
      onClick={(e) => {
        e.cancelBubble = true;
        onSelect(e.evt.shiftKey);
      }}
      onTap={() => {
        onSelect(false);
      }}
      onDragEnd={(event) => {
        const pos = event.target.position();
        onDragEnd(pos.x, pos.y);
      }}
      stroke={selected ? "#6366f1" : undefined}
      strokeWidth={selected ? 2 : 0}
      shadowEnabled={selected}
      shadowColor="#6366f1"
      shadowBlur={selected ? 8 : 0}
      ref={getShapeNode}
    />
  );
};

const DraftShapeRenderer = ({ shape }: { shape: BoardShape }) => {
  if (shape.type === "line") {
    return (
      <Line
        points={shape.points}
        stroke={shape.color}
        strokeWidth={shape.strokeWidth}
        tension={0.5}
        lineCap="round"
        lineJoin="round"
        opacity={0.4}
        dash={[6 / 1, 4 / 1]}
        listening={false}
      />
    );
  }

  if (shape.type === "rectangle") {
    const x = shape.width < 0 ? shape.x + shape.width : shape.x;
    const y = shape.height < 0 ? shape.y + shape.height : shape.y;
    return (
      <Rect
        x={x}
        y={y}
        width={Math.abs(shape.width)}
        height={Math.abs(shape.height)}
        stroke={shape.color}
        strokeWidth={shape.strokeWidth}
        fill={shape.fill || "transparent"}
        opacity={0.4}
        dash={[6 / 1, 4 / 1]}
        listening={false}
      />
    );
  }

  if (shape.type === "circle") {
    return (
      <Circle
        x={shape.x}
        y={shape.y}
        radius={shape.radius}
        stroke={shape.color}
        strokeWidth={shape.strokeWidth}
        fill={shape.fill || "transparent"}
        opacity={0.4}
        dash={[6 / 1, 4 / 1]}
        listening={false}
      />
    );
  }

  if (shape.type === "ellipse") {
    return (
      <Ellipse
        x={shape.x}
        y={shape.y}
        radiusX={shape.radiusX}
        radiusY={shape.radiusY}
        stroke={shape.color}
        strokeWidth={shape.strokeWidth}
        fill={shape.fill || "transparent"}
        opacity={0.4}
        dash={[6 / 1, 4 / 1]}
        listening={false}
      />
    );
  }

  return null;
};

const useImageElement = (url: string) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!url) {
      startTransition(() => setImage(null));
      return;
    }

    let active = true;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (active) setImage(img);
    };
    img.onerror = () => {
      if (active) setImage(null);
    };
    img.src = url;

    return () => {
      active = false;
    };
  }, [url]);

  return image;
};
