"use client";
import { LayoutGrid, Star, Users, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export type BoardFilter = "all" | "starred" | "shared" | "recent";

const menuItems: { icon: typeof LayoutGrid; label: string; filter: BoardFilter; count?: string }[] = [
  { icon: LayoutGrid, label: "All Boards", filter: "all" },
  { icon: Star, label: "Starred", filter: "starred" },
  { icon: Users, label: "Shared with me", filter: "shared" },
  { icon: Clock, label: "Recent", filter: "recent" },
];

interface BoardSidebarProps {
  activeFilter: BoardFilter;
  onFilterChange: (filter: BoardFilter) => void;
}

export const BoardSidebar = ({ activeFilter, onFilterChange }: BoardSidebarProps) => {
  return (
    <div className="w-64 border-r border-slate-200 bg-white flex flex-col">
      <div className="flex items-center gap-2.5 px-5 pt-6 pb-5">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
          <span className="text-white font-bold text-sm">W</span>
        </div>
        <span className="font-bold text-slate-800 text-lg">WhiteboardX</span>
      </div>

      <nav className="flex-1 px-3 space-y-0.5">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeFilter === item.filter;
          return (
            <button
              key={item.filter}
              onClick={() => onFilterChange(item.filter)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-indigo-50 text-indigo-700 shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              )}
            >
              <Icon className={cn("h-4 w-4", isActive ? "text-indigo-600" : "text-slate-400")} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-slate-100">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
            <span className="text-white font-bold text-xs">W</span>
          </div>
          <div className="text-xs text-slate-400">
            <p className="text-slate-500 font-medium">WhiteboardX</p>
            <p>v1.0.0</p>
          </div>
        </div>
      </div>
    </div>
  );
};
