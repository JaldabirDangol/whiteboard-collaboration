"use client";

import { useToolStore, ToolType } from "@/store/useToolStore";
import { ComponentType, SVGProps } from "react";
import { Circle, Eraser, LassoSelect, Pen, RectangleEllipsis } from "lucide-react";

type Tool = {
  tool: ToolType;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const tools: Tool[] = [
  {
    tool: "select",
    icon: LassoSelect,
  },
  {
    tool: "pen",
    icon: Pen, 
  },
  {
    tool: "eraser",
    icon: Eraser,
  },
  {
    tool: "rectangle",
    icon: RectangleEllipsis,
  },
  {
    tool: "circle",
    icon: Circle,
  },
];

export default function Header() {
  const { selected, setTool } = useToolStore();

  return (
    <div className="sticky top-4 px-6 max-w-300 mx-auto container p-2 z-50 flex gap-2 bg-white shadow-sm border-gray-400 rounded-2xl">
      {tools.map((t) => {
        const Icon = t.icon;

        return (
          <button
            key={t.tool}
            onClick={() => setTool(t.tool)}
            className={`px-3 py-1 rounded flex items-center gap-2 ${
              selected === t.tool ? "bg-black text-white" : "bg-gray-200"
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{t.tool}</span>
          </button>
        );
      })}
    </div>
  );
}