import type { Stage as KonvaStage } from "konva/lib/Stage";
import type { BoardShape } from "./board-types";
import { serializeShapesToSvg } from "./board-shape-utils";
import { toast } from "sonner";

export const downloadBlob = (blob: Blob, filename: string) => {
  if (typeof window === "undefined") return;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const handleExportJson = (shapes: BoardShape[], boardId: string, boardTitle?: string) => {
  const payload = {
    boardId,
    exportedAt: new Date().toISOString(),
    shapes,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  downloadBlob(blob, `${boardTitle || "board"}-shapes.json`);
  toast.success("Board exported as JSON");
};

export const handleExportImage = (stageRef: React.RefObject<KonvaStage | null>, boardTitle?: string) => {
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
  anchor.download = `${boardTitle || "board"}.png`;
  anchor.click();
  toast.success("Board exported as PNG");
};

export const handleExportSvgFn = (shapes: BoardShape[], boardTitle?: string) => {
  const svgContent = serializeShapesToSvg(shapes, boardTitle || "Whiteboard");
  const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
  downloadBlob(blob, `${boardTitle || "board"}.svg`);
  toast.success("Board exported as SVG");
};
