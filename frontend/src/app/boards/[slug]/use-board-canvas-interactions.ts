import type { KonvaEventObject } from "konva/lib/Node";
import { useEffect, useRef, useState } from "react";
import type { ToolType } from "@/store/useToolStore";
import { useToolStore } from "@/store/useToolStore";
import type { BoardShape, LaserStroke, RectShape } from "./board-types";
import { newShapeId } from "./board-shape-utils";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;
const LASER_TTL_MS = 1000;
const LASER_COLOR = "#f23523";
const MIN_DRAW_DELTA = 0.5;

type UseBoardCanvasInteractionsArgs = {
  selectedTool: ToolType;
  color: string;
  strokeWidth: number;
  setShapes: React.Dispatch<React.SetStateAction<BoardShape[]>>;
  updateShapesLocally: (updater: (prev: BoardShape[]) => BoardShape[]) => void;
  emitCursorMove: (position: { x: number; y: number }) => void;
  setLaserStrokes: React.Dispatch<React.SetStateAction<LaserStroke[]>>;
  onTextCreated?: (shapeId: string, shapeData: { x: number; y: number; fontSize: number; fontFamily: string; color: string }) => void;
};

export const useBoardCanvasInteractions = ({
  selectedTool,
  color,
  strokeWidth,
  setShapes,
  updateShapesLocally,
  emitCursorMove,
  setLaserStrokes,
  onTextCreated,
}: UseBoardCanvasInteractionsArgs) => {
  const [zoom, setZoom] = useState(1);
  const [viewport, setViewport] = useState({ x: 0, y: 0 });

  const isDrawing = useRef(false);
  const isPanning = useRef(false);
  const isSpacePressed = useRef(false);
  const selectedToolRef = useRef(selectedTool);
  const colorRef = useRef(color);
  const strokeWidthRef = useRef(strokeWidth);
  const panStart = useRef({ x: 0, y: 0 });
  const viewportStart = useRef({ x: 0, y: 0 });
  const draftShapeId = useRef<string | null>(null);
  const laserDraftId = useRef<string | null>(null);
  const laserTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const lastDrawPoint = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    selectedToolRef.current = selectedTool;
  }, [selectedTool]);

  useEffect(() => {
    colorRef.current = color;
  }, [color]);

  useEffect(() => {
    strokeWidthRef.current = strokeWidth;
  }, [strokeWidth]);

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

    if ((isSpacePressed.current || isMiddleMouse) && screenPointer) {
      isPanning.current = true;
      isDrawing.current = false;
      panStart.current = { x: screenPointer.x, y: screenPointer.y };
      viewportStart.current = { ...viewport };
      return;
    }

    if (currentTool === "select") return;

    const pointer = getWorldPointer(e);
    if (!pointer) return;

    if (currentTool === "text") {
      const id = newShapeId();
      const fontSize = 16;

      setShapes((prev) => [
        ...prev,
        {
          id,
          type: "text",
          x: pointer.x,
          y: pointer.y,
          text: "",
          fontSize,
          fontFamily: "Arial",
          color: colorRef.current,
          strokeWidth: 1,
        },
      ]);

      onTextCreated?.(id, {
        x: pointer.x,
        y: pointer.y,
        fontSize,
        fontFamily: "Arial",
        color: colorRef.current,
      });
      return;
    }

    isDrawing.current = true;
    const id = newShapeId();
    draftShapeId.current = id;
    lastDrawPoint.current = pointer;

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

      if (currentTool === "line") {
        return [
          ...prev,
          {
            id,
            type: "line",
            tool: "line",
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
      setLaserStrokes((prev) =>
        prev.map((stroke) =>
          stroke.id === targetId
            ? {
                ...stroke,
                points: [...stroke.points, pointer.x, pointer.y],
              }
            : stroke
        )
      );
      return;
    }

    setShapes((prev) => {
      const next = prev.map((shape) => {
        if (shape.id !== targetId) return shape;

        if (shape.type === "line") {
          // For straight line tool, only use end points
          if (shape.tool === "line") {
            return {
              ...shape,
              points: [lastDrawPoint.current?.x ?? pointer.x, lastDrawPoint.current?.y ?? pointer.y, pointer.x, pointer.y],
            };
          }
          // For pen, keep adding points
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

        if (shape.type === "circle") {
          const dx = pointer.x - shape.x;
          const dy = pointer.y - shape.y;
          return {
            ...shape,
            radius: Math.sqrt(dx * dx + dy * dy),
          };
        }

        if (shape.type === "ellipse") {
          const dx = Math.abs(pointer.x - shape.x);
          const dy = Math.abs(pointer.y - shape.y);
          return {
            ...shape,
            radiusX: dx,
            radiusY: dy,
          };
        }

        return shape;
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
    const currentTool = useToolStore.getState().selected;
    if (isPanning.current) {
      isPanning.current = false;
      return;
    }

    if (!isDrawing.current) return;

    isDrawing.current = false;
    const laserId = laserDraftId.current;
    draftShapeId.current = null;
    laserDraftId.current = null;
    lastDrawPoint.current = null;

    if (currentTool === "laser" && laserId) {
      const timer = window.setTimeout(() => {
        setLaserStrokes((prev) => prev.filter((stroke) => stroke.id !== laserId));
        laserTimers.current.delete(laserId);
      }, LASER_TTL_MS);
      laserTimers.current.set(laserId, timer as unknown as NodeJS.Timeout);
      return;
    }

    updateShapesLocally((prev) => prev);
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
  };
};
