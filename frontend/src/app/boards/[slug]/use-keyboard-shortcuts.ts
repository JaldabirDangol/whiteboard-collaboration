"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import type { BoardShape, CircleShape, EllipseShape, ImageShape, RectShape, TextShape } from "./board-types";
import { newShapeId } from "./board-shape-utils";

type UseKeyboardShortcutsProps = {
  canEditBoardRef: React.RefObject<boolean>;
  editingTextIdRef: React.RefObject<string | null>;
  selectedShapeIdsRef: React.RefObject<Set<string>>;
  setSelectedShapeIds: (ids: Set<string>) => void;
  shapesRef: React.RefObject<BoardShape[]>;
  updateShapesLocally: (fn: (prev: BoardShape[]) => BoardShape[]) => void;
  clipboardRef: React.RefObject<BoardShape[]>;
  requestHistoryEventRef: React.RefObject<((type: "undo" | "redo") => void) | null>;
};

const offsetShape = (s: BoardShape, dx: number, dy: number): BoardShape => {
  if (s.type === "line") return { ...s, id: newShapeId(), points: s.points.map((v, i) => v + (i % 2 === 0 ? dx : dy)) };
  return { ...s, id: newShapeId(), x: (s as RectShape | CircleShape | EllipseShape | TextShape | ImageShape).x + dx, y: (s as RectShape | CircleShape | EllipseShape | TextShape | ImageShape).y + dy };
};

const getBox = (s: BoardShape) => {
  if (s.type === "rectangle" || s.type === "image") return { x: (s as RectShape).x, y: (s as RectShape).y, w: (s as RectShape).width, h: (s as RectShape).height };
  if (s.type === "circle") return { x: (s as CircleShape).x - (s as CircleShape).radius, y: (s as CircleShape).y - (s as CircleShape).radius, w: (s as CircleShape).radius * 2, h: (s as CircleShape).radius * 2 };
  if (s.type === "ellipse") return { x: (s as EllipseShape).x - (s as EllipseShape).radiusX, y: (s as EllipseShape).y - (s as EllipseShape).radiusY, w: (s as EllipseShape).radiusX * 2, h: (s as EllipseShape).radiusY * 2 };
  if (s.type === "text") return { x: (s as TextShape).x, y: (s as TextShape).y, w: (s as TextShape).text.length * (s as TextShape).fontSize * 0.6 + 10, h: (s as TextShape).fontSize + 10 };
  return null;
};

export function useKeyboardShortcuts({
  canEditBoardRef,
  editingTextIdRef,
  selectedShapeIdsRef,
  setSelectedShapeIds,
  shapesRef,
  updateShapesLocally,
  clipboardRef,
  requestHistoryEventRef,
}: UseKeyboardShortcutsProps) {

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

      if ((e.ctrlKey || e.metaKey) && e.key === "d" && ids.size > 0) {
        e.preventDefault();
        const shapesArr = shapesRef.current;
        const newShapes = shapesArr.filter((s) => ids.has(s.id)).map((s) => offsetShape(s, 20, 20));
        updateShapesLocally((prev) => [...prev, ...newShapes]);
        const newIds = new Set(newShapes.map((s) => s.id));
        setSelectedShapeIds(newIds);
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "c" && ids.size > 0) {
        e.preventDefault();
        clipboardRef.current = shapesRef.current.filter((s) => ids.has(s.id));
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "v" && clipboardRef.current.length > 0) {
        e.preventDefault();
        const pasted = clipboardRef.current.map((s) => offsetShape(s, 30, 30));
        updateShapesLocally((prev) => [...prev, ...pasted]);
        const newIds = new Set(pasted.map((s) => s.id));
        setSelectedShapeIds(newIds);
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "]" && ids.size > 0) {
        e.preventDefault();
        updateShapesLocally((prev) => {
          const moved = prev.filter((s) => ids.has(s.id));
          const rest = prev.filter((s) => !ids.has(s.id));
          return [...rest, ...moved];
        });
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "[" && ids.size > 0) {
        e.preventDefault();
        updateShapesLocally((prev) => {
          const moved = prev.filter((s) => ids.has(s.id));
          const rest = prev.filter((s) => !ids.has(s.id));
          return [...moved, ...rest];
        });
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault();
        const allIds = new Set(shapesRef.current.map((s) => s.id));
        setSelectedShapeIds(allIds);
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && ids.size > 1) {
        const shapesArr = shapesRef.current.filter((s) => ids.has(s.id));
        const nonLine = shapesArr.filter((s) => s.type !== "line");
        if (nonLine.length < 2) return;

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
}
