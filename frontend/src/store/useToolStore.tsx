import { create } from "zustand";

export type ToolType = "select" | "pen" | "eraser" | "rectangle" | "circle";

type ToolState = {
  selected: ToolType;
  color?: string;
  strokeWidth?:number;
  setStrokeWidth?:(strokeWidth:number)=>void;
  setColor: (color: string) => void;
  setTool: (tool: ToolType) => void;
  
};

export const useToolStore = create<ToolState>((set) => ({
  selected: "select",
  color: "#000000",
  strokeWidth:2,
  setColor: (color) => set({ color }),
  setTool: (selected) => set({ selected }),
  setStrokeWidth:(strokeWidth)=>set({ strokeWidth }),
}));