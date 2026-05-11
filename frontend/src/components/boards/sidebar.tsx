"use client";
import { LayoutGrid, Star, Users, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  { icon: LayoutGrid, label: "All Boards", active: true },
  { icon: Star, label: "Starred" },
  { icon: Users, label: "Shared with me" },
  { icon: Clock, label: "Recent" },
];

export const BoardSidebar = () => {
  return (
    <div className="w-64 border-r border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-6 px-2">
        <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center">
          <span className="text-white font-bold text-sm">W</span>
        </div>
        <span className="font-bold text-slate-800">WhiteboardX</span>
      </div>

      <nav className="space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.label}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
              item.active
                ? "bg-indigo-50 text-indigo-700"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
};