import { create } from "zustand";

export type ToolType = "select" | "pen" | "eraser" | "line" | "rectangle" | "circle" | "ellipse" | "text" | "laser" | "arrow";

type ToolState = {
  selected: ToolType;
  color: string;
  strokeWidth: number;
  fill?: string;
  fontSize: number;
  fontFamily: string;
  setStrokeWidth: (strokeWidth: number) => void;
  setColor: (color: string) => void;
  setFill: (fill: string | undefined) => void;
  setFontSize: (fontSize: number) => void;
  setFontFamily: (fontFamily: string) => void;
  setTool: (tool: ToolType) => void;
};

export const useToolStore = create<ToolState>((set) => ({
  selected: "pen",
  color: "#000000",
  strokeWidth: 2,
  fontSize: 16,
  fontFamily: "Arial",
  setColor: (color) => set({ color }),
  setTool: (selected) => set({ selected }),
  setStrokeWidth: (strokeWidth) => set({ strokeWidth }),
  setFill: (fill) => set({ fill }),
  setFontSize: (fontSize) => set({ fontSize }),
  setFontFamily: (fontFamily) => set({ fontFamily }),
}));