import type { KonvaEventObject } from "konva/lib/Node";
import { useEffect, useRef, useState } from "react";
import type { ToolType } from "@/store/useToolStore";
import { useToolStore } from "@/store/useToolStore";
import type { BoardShape, LaserStroke, RectShape } from "./board-types";
import { newShapeId } from "./board-shape-utils";

export interface MarqueeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;
const LASER_TTL_MS = 1000;
const LASER_COLOR = "#f23523";
const MIN_DRAW_DELTA = 0.5;
const GRID_SIZE = 20;

const snap = (value: number) => Math.round(value / GRID_SIZE) * GRID_SIZE;

export const getAABB = (s: BoardShape): { x: number; y: number; w: number; h: number } | null => {
  if (s.type === "line") {
    if (s.points.length < 2) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < s.points.length; i += 2) {
      if (s.points[i] < minX) minX = s.points[i];
      if (s.points[i + 1] < minY) minY = s.points[i + 1];
      if (s.points[i] > maxX) maxX = s.points[i];
      if (s.points[i + 1] > maxY) maxY = s.points[i + 1];
    }
    return { x: minX, y: minY, w: maxX - minX || 1, h: maxY - minY || 1 };
  }
  if (s.type === "rectangle") return { x: s.x, y: s.y, w: s.width, h: s.height };
  if (s.type === "circle") return { x: s.x - s.radius, y: s.y - s.radius, w: s.radius * 2, h: s.radius * 2 };
  if (s.type === "ellipse") return { x: s.x - s.radiusX, y: s.y - s.radiusY, w: s.radiusX * 2, h: s.radiusY * 2 };
  if (s.type === "image") return { x: s.x, y: s.y, w: s.width, h: s.height };
  if (s.type === "text") return { x: s.x, y: s.y, w: s.text.length * s.fontSize * 0.6 + 10, h: s.fontSize + 10 };
  return null;
};

type UseBoardCanvasInteractionsArgs = {
  selectedTool: ToolType;
  canEdit: boolean;
  color: string;
  strokeWidth: number;
  setShapes: React.Dispatch<React.SetStateAction<BoardShape[]>>;
  updateShapesLocally: (updater: (prev: BoardShape[]) => BoardShape[]) => void;
  emitCursorMove: (position: { x: number; y: number }) => void;
  emitShapeDraft?: (draft: BoardShape) => void;
  setLaserStrokes: React.Dispatch<React.SetStateAction<LaserStroke[]>>;
  emitLaserStroke?: (stroke: { id: string; points: number[]; color: string; strokeWidth: number }) => void;
  onDrawingEnd?: () => void;
  onCanvasInteraction?: () => void;
  onEmptyCanvasClick?: () => void;
  onTextCreated?: (shapeId: string, shapeData: { x: number; y: number; fontSize: number; fontFamily: string; color: string }) => void;
  drawingRef: React.MutableRefObject<boolean>;
  onMarqueeSelect?: (rect: MarqueeRect) => void;
  snapToGrid?: boolean;
};

export const useBoardCanvasInteractions = ({
  selectedTool,
  canEdit,
  color,
  strokeWidth,
  setShapes,
  updateShapesLocally,
  emitCursorMove,
  emitShapeDraft,
  setLaserStrokes,
  emitLaserStroke,
  onDrawingEnd,
  onCanvasInteraction,
  onEmptyCanvasClick,
  onTextCreated,
  drawingRef,
  onMarqueeSelect,
  snapToGrid = false,
}: UseBoardCanvasInteractionsArgs) => {
  const [zoom, setZoom] = useState(1);
  const [viewport, setViewport] = useState({ x: 0, y: 0 });
  const [marqueeRect, setMarqueeRect] = useState<MarqueeRect | null>(null);
  const marqueeStart = useRef<{ x: number; y: number } | null>(null);

  const isDrawing = useRef(false);
  const isPanning = useRef(false);
  const isSpacePressed = useRef(false);
  const selectedToolRef = useRef(selectedTool);
  const colorRef = useRef(color);
  const strokeWidthRef = useRef(strokeWidth);
  const emitShapeDraftRef = useRef(emitShapeDraft);
  const onDrawingEndRef = useRef(onDrawingEnd);
  const onCanvasInteractionRef = useRef(onCanvasInteraction);
  const onEmptyCanvasClickRef = useRef(onEmptyCanvasClick);
  const panStart = useRef({ x: 0, y: 0 });
  const viewportStart = useRef({ x: 0, y: 0 });
  const draftShapeId = useRef<string | null>(null);
  const laserDraftId = useRef<string | null>(null);
  const laserTimers = useRef<Map<string, number>>(new Map());
  const lastDrawPoint = useRef<{ x: number; y: number } | null>(null);
  const pinchStart = useRef<{ distance: number; zoom: number; cx: number; cy: number } | null>(null);
  const touchIds = useRef<Set<number>>(new Set());

  useEffect(() => {
    selectedToolRef.current = selectedTool;
  }, [selectedTool]);

  useEffect(() => {
    colorRef.current = color;
  }, [color]);

  useEffect(() => {
    strokeWidthRef.current = strokeWidth;
  }, [strokeWidth]);

  useEffect(() => {
    emitShapeDraftRef.current = emitShapeDraft;
  }, [emitShapeDraft]);

  useEffect(() => {
    onDrawingEndRef.current = onDrawingEnd;
  }, [onDrawingEnd]);

  useEffect(() => {
    onCanvasInteractionRef.current = onCanvasInteraction;
  }, [onCanvasInteraction]);

  useEffect(() => {
    onEmptyCanvasClickRef.current = onEmptyCanvasClick;
  }, [onEmptyCanvasClick]);

  const canEditRef = useRef(canEdit);
  useEffect(() => {
    canEditRef.current = canEdit;
  }, [canEdit]);

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
    return () => {
      laserTimers.current.forEach((timer) => window.clearTimeout(timer));
      laserTimers.current.clear();
    };
  }, []);

  const handlePointerDown = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    const currentTool = useToolStore.getState().selected;
    const stage = e.target.getStage();
    const screenPointer = stage?.getPointerPosition();
    const isMiddleMouse = "button" in e.evt && e.evt.button === 1;

    if ("touches" in e.evt) {
      for (let i = 0; i < e.evt.touches.length; i++) {
        touchIds.current.add(e.evt.touches[i].identifier);
      }
      if (e.evt.touches.length === 2) {
        const t1 = e.evt.touches[0];
        const t2 = e.evt.touches[1];
        const distance = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        pinchStart.current = {
          distance,
          zoom,
          cx: (t1.clientX + t2.clientX) / 2,
          cy: (t1.clientY + t2.clientY) / 2,
        };
        return;
      }
    }

    if ((isSpacePressed.current || isMiddleMouse) && screenPointer) {
      isPanning.current = true;
      isDrawing.current = false;
      panStart.current = { x: screenPointer.x, y: screenPointer.y };
      viewportStart.current = { ...viewport };
      return;
    }

    if (!canEditRef.current) return;

    onCanvasInteractionRef.current?.();

    // Clicking on a shape node — skip drawing, let shape onClick handle selection
    if (e.target !== e.target.getStage()) return;

    onEmptyCanvasClickRef.current?.();

    const pointer = getWorldPointer(e);
    if (!pointer) return;

    if (currentTool === "select") {
      marqueeStart.current = pointer;
      setMarqueeRect(null);
      return;
    }

    if (currentTool === "text") {
      const id = newShapeId();
      const fontSize = useToolStore.getState().fontSize;
      const fontFamily = useToolStore.getState().fontFamily;

      setShapes((prev) => [
        ...prev,
        {
          id,
          type: "text",
          x: pointer.x,
          y: pointer.y,
          text: "",
          fontSize,
          fontFamily,
          color: colorRef.current,
          strokeWidth: 1,
        },
      ]);

      onTextCreated?.(id, {
        x: pointer.x,
        y: pointer.y,
        fontSize,
        fontFamily,
        color: colorRef.current,
      });
      return;
    }

    isDrawing.current = true;
    drawingRef.current = true;
    const id = newShapeId();
    draftShapeId.current = id;
    lastDrawPoint.current = pointer;
    const currentFill = useToolStore.getState().fill;

    if (currentTool === "laser") {
      laserDraftId.current = id;
      setLaserStrokes((prev) => [
        ...prev,
        {
          id,
          points: [pointer.x, pointer.y],
          color: LASER_COLOR,
          strokeWidth: strokeWidthRef.current,
          createdAt: Date.now(),
        },
      ]);
      return;
    }

    setShapes((prev) => {
      if (currentTool === "pen" || currentTool === "eraser") {
        return [
          ...prev,
          {
            id,
            type: "line",
            tool: currentTool as "pen" | "eraser",
            points: [pointer.x, pointer.y],
            color: colorRef.current,
            strokeWidth: strokeWidthRef.current,
          },
        ];
      }

      if (currentTool === "line" || currentTool === "arrow") {
        return [
          ...prev,
          {
            id,
            type: "line",
            tool: currentTool as "line" | "arrow",
            points: [pointer.x, pointer.y],
            color: colorRef.current,
            strokeWidth: strokeWidthRef.current,
          },
        ];
      }

      if (currentTool === "rectangle") {
        return [
          ...prev,
          {
            id,
            type: "rectangle",
            x: pointer.x,
            y: pointer.y,
            width: 0,
            height: 0,
            color: colorRef.current,
            strokeWidth: strokeWidthRef.current,
            fill: currentFill,
          },
        ];
      }

      if (currentTool === "circle") {
        return [
          ...prev,
          {
            id,
            type: "circle",
            x: pointer.x,
            y: pointer.y,
            radius: 0,
            color: colorRef.current,
            strokeWidth: strokeWidthRef.current,
            fill: currentFill,
          },
        ];
      }

      if (currentTool === "ellipse") {
        return [
          ...prev,
          {
            id,
            type: "ellipse",
            x: pointer.x,
            y: pointer.y,
            radiusX: 0,
            radiusY: 0,
            color: colorRef.current,
            strokeWidth: strokeWidthRef.current,
            fill: currentFill,
          },
        ];
      }

      return prev;
    });
  };

  const handlePointerMove = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    const currentTool = useToolStore.getState().selected;
    const stage = e.target.getStage();
    const screenPointer = stage?.getPointerPosition();

    if ("touches" in e.evt && e.evt.touches.length === 2 && pinchStart.current) {
      const t1 = e.evt.touches[0];
      const t2 = e.evt.touches[1];
      const distance = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const scale = distance / pinchStart.current.distance;
      const newZoom = clampZoom(pinchStart.current.zoom * scale);
      setZoom(newZoom);
      return;
    }

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
    if (pointer) {
      emitCursorMove({ x: pointer.x, y: pointer.y });
    }

    if (currentTool === "select" && marqueeStart.current && pointer) {
      const mx = marqueeStart.current.x;
      const my = marqueeStart.current.y;
      setMarqueeRect({
        x: Math.min(mx, pointer.x),
        y: Math.min(my, pointer.y),
        width: Math.abs(pointer.x - mx),
        height: Math.abs(pointer.y - my),
      });
      return;
    }

    if (!isDrawing.current) return;
    if (!pointer) return;
    const targetId = draftShapeId.current;
    if (!targetId) return;

    if (lastDrawPoint.current) {
      const dx = pointer.x - lastDrawPoint.current.x;
      const dy = pointer.y - lastDrawPoint.current.y;
      if (Math.hypot(dx, dy) < MIN_DRAW_DELTA) return;
    }
    lastDrawPoint.current = pointer;

    if (currentTool === "laser" && laserDraftId.current === targetId) {
      setLaserStrokes((prev) => {
        const updated = prev.map((stroke) =>
          stroke.id === targetId
            ? {
                ...stroke,
                points: [...stroke.points, pointer.x, pointer.y],
              }
            : stroke
        );
        const current = updated.find((s) => s.id === targetId);
        if (current && emitLaserStroke) {
          emitLaserStroke({
            id: current.id,
            points: current.points,
            color: current.color,
            strokeWidth: current.strokeWidth,
          });
        }
        return updated;
      });
      return;
    }

    let emitted: BoardShape | null = null;
    setShapes((prev) => {
      const next = prev.map((shape) => {
        if (shape.id !== targetId) return shape;

        if (shape.type === "line") {
          if (shape.tool === "line" || shape.tool === "arrow") {
            const updated = {
              ...shape,
              points: [shape.points[0] ?? pointer.x, shape.points[1] ?? pointer.y, pointer.x, pointer.y],
            };
            emitted = updated;
            return updated;
          }
          const updated = {
            ...shape,
            points: [...shape.points, pointer.x, pointer.y],
          };
          emitted = updated;
          return updated;
        }

        if (shape.type === "rectangle") {
          const updated = {
            ...shape,
            width: pointer.x - shape.x,
            height: pointer.y - shape.y,
          };
          emitted = updated;
          return updated;
        }

        if (shape.type === "circle") {
          const dx = pointer.x - shape.x;
          const dy = pointer.y - shape.y;
          const updated = {
            ...shape,
            radius: Math.sqrt(dx * dx + dy * dy),
          };
          emitted = updated;
          return updated;
        }

        if (shape.type === "ellipse") {
          const dx = Math.abs(pointer.x - shape.x);
          const dy = Math.abs(pointer.y - shape.y);
          const updated = {
            ...shape,
            radiusX: dx,
            radiusY: dy,
          };
          emitted = updated;
          return updated;
        }

        return shape;
      });
      return next;
    });
    if (emitted && emitShapeDraftRef.current) {
      emitShapeDraftRef.current(emitted);
    }
  };

  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();

    onCanvasInteractionRef.current?.();

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

  const intersects = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  const handlePointerUp = () => {
    pinchStart.current = null;
    touchIds.current.clear();

    const currentTool = useToolStore.getState().selected;
    if (isPanning.current) {
      isPanning.current = false;
      return;
    }

    if (currentTool === "select" && marqueeStart.current) {
      const rect = marqueeRect;
      marqueeStart.current = null;
      setMarqueeRect(null);
      if (rect && (rect.width > 5 || rect.height > 5)) {
        onMarqueeSelect?.(rect);
      }
      return;
    }

    if (!isDrawing.current) return;

    isDrawing.current = false;
    drawingRef.current = false;
    const laserId = laserDraftId.current;
    const draftId = draftShapeId.current;
    draftShapeId.current = null;
    laserDraftId.current = null;
    lastDrawPoint.current = null;

    // Sync remote shapes that arrived during drawing
    onDrawingEndRef.current?.();

    if (currentTool === "laser" && laserId) {
      const timer = window.setTimeout(() => {
        setLaserStrokes((prev) => prev.filter((stroke) => stroke.id !== laserId));
        laserTimers.current.delete(laserId);
      }, LASER_TTL_MS);
      laserTimers.current.set(laserId, timer);
      return;
    }

    // Eraser: remove shapes intersected by the eraser stroke
    if (currentTool === "eraser" && draftId) {
      updateShapesLocally((prev) => {
        const eraserShape = prev.find((s) => s.id === draftId);
        if (!eraserShape || eraserShape.type !== "line") return prev.filter((s) => s.id !== draftId);
        const eraserBounds = getAABB(eraserShape);
        if (!eraserBounds) return prev.filter((s) => s.id !== draftId);
        return prev.filter((s) => {
          if (s.id === draftId) return false;
          const bounds = getAABB(s);
          return bounds ? !intersects(eraserBounds, bounds) : true;
        });
      });
      return;
    }

    // Discard single-point lines (dots from click without drag)
    updateShapesLocally((prev) =>
      prev.filter((s) => {
        if (s.type !== "line") return true;
        if (s.points.length >= 4) return true;
        return false;
      })
    );
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
    const snappedX = snapToGrid ? snap(x) : x;
    const snappedY = snapToGrid ? snap(y) : y;
    updateShapesLocally((prev) =>
      prev.map((shape) => {
        if (shape.id !== shapeId) return shape;

        if (shape.type === "line") {
          if (shape.points.length < 2) return shape;

          const startX = shape.points[0];
          const startY = shape.points[1];
          const dx = snappedX - startX;
          const dy = snappedY - startY;

          return {
            ...shape,
            points: shape.points.map((point, index) => point + (index % 2 === 0 ? dx : dy)),
          };
        }

        if (shape.type === "rectangle") {
          return {
            ...shape,
            x: snappedX,
            y: snappedY,
          };
        }

        return {
          ...shape,
          x: snappedX,
          y: snappedY,
        };
      })
    );
  };

  return {
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
  };
};
