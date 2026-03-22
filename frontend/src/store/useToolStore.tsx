import { create } from "zustand";

export type ToolType = "select" | "pen" | "eraser" | "rectangle" | "circle";

type ToolState = {
  tool: ToolType;
  setTool: (tool: ToolType) => void;
};

export const useToolStore = create<ToolState>((set) => ({
  tool: "select",
  setTool: (tool) => set({ tool }),
}));