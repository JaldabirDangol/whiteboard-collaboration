import type { KonvaEventObject } from "konva/lib/Node";
import { useEffect, useRef, useState } from "react";
import type { ToolType } from "@/store/useToolStore";
import type { BoardShape, RectShape } from "./board-types";
import { newShapeId, normalizeShapesForClient } from "./board-shape-utils";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;

type UseBoardCanvasInteractionsArgs = {
  selectedTool: ToolType;
  color: string;
  strokeWidth: number;
  setShapes: React.Dispatch<React.SetStateAction<BoardShape[]>>;
  persistShapes: (nextShapes: BoardShape[]) => void;
  updateShapesLocally: (updater: (prev: BoardShape[]) => BoardShape[]) => void;
  emitCursorMove: (position: { x: number; y: number }) => void;
};

export const useBoardCanvasInteractions = ({
  selectedTool,
  color,
  strokeWidth,
  setShapes,
  persistShapes,
  updateShapesLocally,
  emitCursorMove,
}: UseBoardCanvasInteractionsArgs) => {
  const [zoom, setZoom] = useState(1);
  const [viewport, setViewport] = useState({ x: 0, y: 0 });

  const isDrawing = useRef(false);
  const isPanning = useRef(false);
  const isSpacePressed = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const viewportStart = useRef({ x: 0, y: 0 });
  const draftShapeId = useRef<string | null>(null);

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
        return normalizeShapesForClient([
          ...prev,
          {
            id,
            type: "line",
            tool: selectedTool,
            points: [pointer.x, pointer.y],
            color,
            strokeWidth,
          },
        ]);
      }

      if (selectedTool === "rectangle") {
        return normalizeShapesForClient([
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
        ]);
      }

      if (selectedTool === "circle") {
        return normalizeShapesForClient([
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
        ]);
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
    if (pointer) {
      emitCursorMove({ x: pointer.x, y: pointer.y });
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

      return normalizeShapesForClient(next);
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
