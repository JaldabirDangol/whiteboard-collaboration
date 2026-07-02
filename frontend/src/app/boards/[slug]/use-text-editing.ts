"use client";

import { useEffect, useRef, useState } from "react";
import type { BoardShape, TextShape } from "./board-types";

export function useTextEditing(
  boardWrapRef: React.RefObject<HTMLDivElement | null>,
  shapes: BoardShape[],
  updateShapesLocally: (fn: (prev: BoardShape[]) => BoardShape[]) => void,
  shapesRef: React.RefObject<BoardShape[]>,
  zoomRef: React.RefObject<number>,
  viewportRef: React.RefObject<{ x: number; y: number }>,
) {
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const editingTextIdRef = useRef<string | null>(null);
  editingTextIdRef.current = editingTextId;

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
    el.style.left = `${shape.x * zoomRef.current + viewportRef.current.x}px`;
    el.style.top = `${shape.y * zoomRef.current + viewportRef.current.y}px`;
    el.style.fontSize = `${shape.fontSize * zoomRef.current}px`;
    el.style.fontFamily = shape.fontFamily || "Arial";
    el.style.color = shape.color;
    el.style.background = "rgba(255,255,255,0.9)";
    el.style.border = "2px dashed #6366f1";
    el.style.outline = "none";
    el.style.resize = "none";
    el.style.overflow = "hidden";
    el.style.minWidth = "120px";
    el.style.minHeight = `${shape.fontSize * zoomRef.current + 12}px`;
    el.style.whiteSpace = "pre-wrap";
    el.style.zIndex = "30";
    el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
    el.style.lineHeight = "1.3";
    el.style.padding = "4px";
    el.style.margin = "0";
    el.style.borderRadius = "4px";

    container.appendChild(el);
    textareaRef.current = el;

    requestAnimationFrame(() => {
      el.focus();
      el.select();
    });

    el.addEventListener("pointerdown", (e) => e.stopPropagation());

    let cancelled = false;

    el.addEventListener("blur", () => {
      if (cancelled) return;
      finishTextEditing(el.value);
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

  useEffect(() => {
    if (!editingTextId || !textareaRef.current) return;
    const shape = shapes.find((s) => s.id === editingTextId);
    if (!shape || shape.type !== "text") return;

    const el = textareaRef.current;
    el.style.left = `${shape.x * zoomRef.current + viewportRef.current.x}px`;
    el.style.top = `${shape.y * zoomRef.current + viewportRef.current.y}px`;
    el.style.fontSize = `${shape.fontSize * zoomRef.current}px`;
    el.style.minHeight = `${shape.fontSize * zoomRef.current + 12}px`;
  }, [editingTextId, shapes]);

  useEffect(() => {
    if (editingTextId) return;
    const el = textareaRef.current;
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
      textareaRef.current = null;
    }
  }, [editingTextId]);

  return {
    editingTextId,
    setEditingTextId,
    textareaRef,
    editingTextIdRef,
    spawnTextarea,
    cleanupTextarea,
    finishTextEditing,
    cancelTextEditing,
  };
}
