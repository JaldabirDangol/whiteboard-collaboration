"use client";

import type { Stage as KonvaStage } from "konva/lib/Stage";
import type { KonvaEventObject } from "konva/lib/Node";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Circle, Ellipse, Group, Image as KonvaImage, Layer, Line, Rect, Stage, Text } from "react-konva";
import { Minus, Plus } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/canvas/header";
import { useUserStore } from "@/store/useUserStore";
import { useToolStore } from "@/store/useToolStore";
import { apiUrl } from "@/constant";
import { getBoardDetails, getPersistedBoardShapes, joinBoard, shareBoard, uploadBoardImage, getUserByEmail } from "@/lib/api";
import { toast } from "sonner";
import type { ImageShape, LaserStroke, RectShape } from "./board-types";
import { newShapeId, normalizeShapesForClient } from "./board-shape-utils";
import { AVATAR_COLORS, getInitials, getStoredProfile } from "./board-profile-utils";
import BoardTopBar from "./board-top-bar";
import BoardRightPanel from "./board-right-panel";
import BoardMobileChat from "./board-mobile-chat";
import { useBoardRealtime } from "./use-board-realtime";
import { useBoardCanvasInteractions } from "./use-board-canvas-interactions";
import type { ToolType } from "@/store/useToolStore";

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

  const [stageSize, setStageSize] = useState({ width: 1, height: 1 });
  const [mounted, setMounted] = useState(false);
  const [selectedShapeIds, setSelectedShapeIds] = useState<Set<string>>(new Set());
  const [shareOpen, setShareOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [shareRole, setShareRole] = useState<"EDITOR" | "VIEWER">("VIEWER");
  const [chatOpen, setChatOpen] = useState(false);
  const [activeTopTab, setActiveTopTab] = useState<"Files" | "Canvas" | "Export" | "History">("Canvas");
  const [rightPanelTab, setRightPanelTab] = useState<"activity" | "chat" | "comments">("chat");
  const [draftDisplayName, setDraftDisplayName] = useState("");
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

  const {
    shapes,
    setShapes,
    remoteCursors,
    persistShapes,
    updateShapesLocally,
    emitCursorMove,
    emitHistoryEvent,
    serverReadOnly,
    forbiddenMessage,
  } = useBoardRealtime({
    boardId: id,
    userId: user?.id,
    persistedShapes,
  });

  const currentMembership = useMemo(
    () => boardDetails?.members?.find((member) => member.userId === user?.id) ?? null,
    [boardDetails?.members, user?.id]
  );
  const canEditBoard = (currentMembership?.role === "ADMIN" || currentMembership?.role === "EDITOR") && !serverReadOnly;
  const activeCanvasTool: ToolType = canEditBoard ? selectedTool : "select";

  const {
    zoom,
    setZoom,
    viewport,
    clampZoom,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleWheel,
    normalizeRect,
    updateShapePosition,
  } = useBoardCanvasInteractions({
    selectedTool: activeCanvasTool,
    color,
    strokeWidth,
    setShapes,
    updateShapesLocally,
    emitCursorMove,
    setLaserStrokes,
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
    if (canEditBoard && useToolStore.getState().selected === "select") {
      setTool("pen");
    }
  }, [canEditBoard, setTool]);

  useEffect(() => {
    if (!canEditBoard && selectedTool !== "select") {
      setTool("select");
    }
  }, [canEditBoard, selectedTool, setTool]);

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
    if (!canEditBoard || activeCanvasTool !== "select") return;

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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!canEditBoard) return;

      // Delete selected shapes
      if (e.key === "Delete" && selectedShapeIds.size > 0) {
        e.preventDefault();
        updateShapesLocally((prev) =>
          prev.filter((shape) => !selectedShapeIds.has(shape.id))
        );
        persistShapes(
          shapes.filter((shape) => !selectedShapeIds.has(shape.id))
        );
        setSelectedShapeIds(new Set());
        toast.success(`Deleted ${selectedShapeIds.size} shape(s)`);
      }

      // Ctrl/Cmd+Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        requestHistoryEvent("undo");
      }

      // Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y for redo
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        requestHistoryEvent("redo");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canEditBoard, selectedShapeIds, shapes, updateShapesLocally, persistShapes]);

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
        boardTitle={boardDetails?.title || "Project Draft"}
        isViewOnly={!canEditBoard}
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
      />

      <div className="relative flex min-h-0 flex-1">
        <aside className="hidden w-20 border-r border-slate-200 bg-linear-to-b from-white via-white to-slate-50 px-2 py-3 md:flex md:items-start md:justify-center">
          <Header layout="vertical" disabled={mounted && !canEditBoard} />
        </aside>

        <main ref={boardWrapRef} className="relative min-w-0 flex-1 bg-[radial-gradient(circle_at_1px_1px,#dbe4ef_1px,transparent_1.3px)] bg-size-[20px_20px]">
          <div className="absolute left-2 top-2 z-20 md:hidden">
            <Header disabled={mounted && !canEditBoard} />
          </div>

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
            onMouseDownCapture={(e: KonvaEventObject<MouseEvent>) => {
              if (activeCanvasTool === "select" && !e.evt.shiftKey) {
                // Only clear on empty space click (not on shape), handled by checking if target is Stage
                if ((e.target as any).nodeType === "Stage") {
                  setSelectedShapeIds(new Set());
                }
              }
            }}
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
                        draggable={canEditBoard && selectedTool === "select"}
                        onClick={(e) => {
                          e.cancelBubble = true;
                          handleShapeSelect(shape.id, e.evt.shiftKey);
                        }}
                        onTap={(e) => {
                          handleShapeSelect(shape.id, false);
                        }}
                        onDragEnd={(event) => {
                          if (!canEditBoard || selectedTool !== "select") return;
                          const pos = event.target.position();
                          updateShapePosition(shape.id, pos.x, pos.y);
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
                        x={rect.x}
                        y={rect.y}
                        width={rect.width}
                        height={rect.height}
                        stroke={rect.color}
                        strokeWidth={rect.strokeWidth}
                        fill="transparent"
                        draggable={canEditBoard && selectedTool === "select"}
                        onClick={(e) => {
                          e.cancelBubble = true;
                          handleShapeSelect(shape.id, e.evt.shiftKey);
                        }}
                        onTap={() => {
                          handleShapeSelect(shape.id, false);
                        }}
                        onDragEnd={(event) => {
                          if (!canEditBoard || selectedTool !== "select") return;
                          const pos = event.target.position();
                          updateShapePosition(shape.id, pos.x, pos.y);
                        }}
                        shadowEnabled={isShapeSelected(shape.id)}
                        shadowColor="#6366f1"
                        shadowBlur={isShapeSelected(shape.id) ? 8 : 0}
                      />
                    );
                  }

                    if (shape.type === "image") {
                      return (
                        <BoardImageShape
                          key={shape.id}
                          shape={shape}
                          draggable={canEditBoard && selectedTool === "select"}
                          selected={isShapeSelected(shape.id)}
                          onSelect={(shiftKey) => handleShapeSelect(shape.id, shiftKey)}
                          onDragEnd={(x, y) => updateShapePosition(shape.id, x, y)}
                        />
                      );
                    }

                if (shape.type === "circle") {
                  return (
                    <Circle
                      key={shape.id}
                      x={shape.x}
                      y={shape.y}
                      radius={shape.radius}
                      stroke={shape.color}
                      strokeWidth={shape.strokeWidth}
                      fill="transparent"
                      draggable={canEditBoard && selectedTool === "select"}
                      onClick={(e) => {
                        e.cancelBubble = true;
                        handleShapeSelect(shape.id, e.evt.shiftKey);
                      }}
                      onTap={() => {
                        handleShapeSelect(shape.id, false);
                      }}
                      onDragEnd={(event) => {
                        if (!canEditBoard || selectedTool !== "select") return;
                        const pos = event.target.position();
                        updateShapePosition(shape.id, pos.x, pos.y);
                      }}
                      shadowEnabled={isShapeSelected(shape.id)}
                      shadowColor="#6366f1"
                      shadowBlur={isShapeSelected(shape.id) ? 8 : 0}
                    />
                  );
                }

                if (shape.type === "ellipse") {
                  return (
                    <Ellipse
                      key={shape.id}
                      x={shape.x}
                      y={shape.y}
                      radiusX={shape.radiusX}
                      radiusY={shape.radiusY}
                      stroke={shape.color}
                      strokeWidth={shape.strokeWidth}
                      fill={shape.fill || "transparent"}
                      draggable={canEditBoard && selectedTool === "select"}
                      onClick={(e) => {
                        e.cancelBubble = true;
                        handleShapeSelect(shape.id, e.evt.shiftKey);
                      }}
                      onTap={() => {
                        handleShapeSelect(shape.id, false);
                      }}
                      onDragEnd={(event) => {
                        if (!canEditBoard || selectedTool !== "select") return;
                        const pos = event.target.position();
                        updateShapePosition(shape.id, pos.x, pos.y);
                      }}
                      shadowEnabled={isShapeSelected(shape.id)}
                      shadowColor="#6366f1"
                      shadowBlur={isShapeSelected(shape.id) ? 8 : 0}
                    />
                  );
                }

                if (shape.type === "text") {
                  return (
                    <Text
                      key={shape.id}
                      x={shape.x}
                      y={shape.y}
                      text={shape.text}
                      fontSize={shape.fontSize}
                      fontFamily={shape.fontFamily || "Arial"}
                      fill={shape.color}
                      draggable={canEditBoard && selectedTool === "select"}
                      onClick={(e) => {
                        e.cancelBubble = true;
                        handleShapeSelect(shape.id, e.evt.shiftKey);
                      }}
                      onTap={() => {
                        handleShapeSelect(shape.id, false);
                      }}
                      onDragEnd={(event) => {
                        if (!canEditBoard || selectedTool !== "select") return;
                        const pos = event.target.position();
                        updateShapePosition(shape.id, pos.x, pos.y);
                      }}
                      shadowEnabled={isShapeSelected(shape.id)}
                      shadowColor="#6366f1"
                      shadowBlur={isShapeSelected(shape.id) ? 8 : 0}
                    />
                  );
                }

                return null;
              })}
              </Group>
            </Layer>

            <Layer listening={false}>
              <Group x={viewport.x} y={viewport.y} scaleX={zoom} scaleY={zoom}>
                {laserStrokes.map((stroke) => (
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

        <BoardRightPanel
          members={members}
          rightPanelTab={rightPanelTab}
          onRightPanelTabChange={setRightPanelTab}
          boardId={id}
          currentUserId={user?.id}
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
}: {
  shape: ImageShape;
  draggable: boolean;
  selected: boolean;
  onSelect: (shiftKey: boolean) => void;
  onDragEnd: (x: number, y: number) => void;
}) => {
  const image = useImageElement(shape.url);

  return (
    <KonvaImage
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
    />
  );
};

const useImageElement = (url: string) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!url) {
      setImage(null);
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
