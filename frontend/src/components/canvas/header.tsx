"use client";

import { useToolStore, ToolType } from "@/store/useToolStore";
import { ComponentType, SVGProps } from "react";
import { Circle, Eraser, LassoSelect, Minus, Pen, Plus, RectangleEllipsis, Type, Zap, Palette, Undo, Redo } from "lucide-react";

type Tool = {
  tool: ToolType;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
};

type HeaderProps = {
  layout?: "horizontal" | "vertical";
  disabled?: boolean;
};

const STROKE_MIN = 1;
const STROKE_MAX = 148;
const STROKE_PRESETS = [2, 4, 8, 16, 32];

const tools: Tool[] = [
  { tool: "select", icon: LassoSelect, label: "Select" },
  { tool: "pen", icon: Pen, label: "Pen" },
  { tool: "eraser", icon: Eraser, label: "Eraser" },
  { tool: "laser", icon: Zap, label: "Laser" },
  { tool: "rectangle", icon: RectangleEllipsis, label: "Rectangle" },
  { tool: "circle", icon: Circle, label: "Circle" },
  { tool: "text", icon: Type, label: "Text" },
];

const ColorPresets = [
  "#000000", "#ef4444", "#f97316", "#eab308", 
  "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"
];

export default function Header({ layout = "horizontal", disabled = false }: HeaderProps) {
  const { selected, color, strokeWidth, setTool, setColor, setStrokeWidth } = useToolStore();
  
  const setStroke = (next: number) => {
    const value = Number.isFinite(next) ? next : STROKE_MIN;
    setStrokeWidth(Math.max(STROKE_MIN, Math.min(STROKE_MAX, Math.round(value))));
  };

  const decreaseStroke = () => setStroke(strokeWidth - 1);
  const increaseStroke = () => setStroke(strokeWidth + 1);

  if (layout === "vertical") {
    return (
      <div className={`pointer-events-auto mt-3 flex h-[calc(100%-1.5rem)] w-18 flex-col items-center rounded-[1.5rem] border border-slate-200/60 bg-gradient-to-b from-white via-white/95 to-slate-50/90 py-4 shadow-xl shadow-slate-200/40 backdrop-blur-md ${
        disabled ? "opacity-60" : ""
      }`}>
        <div className="flex flex-col items-center gap-2">
          {tools.map((t) => {
            const Icon = t.icon;
            const isSelected = selected === t.tool;
            return (
              <button
                key={t.tool}
                type="button"
                disabled={disabled}
                onClick={() => setTool(t.tool)}
                title={t.label}
                className={`group relative flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-200 ${
                  disabled
                    ? "cursor-not-allowed bg-slate-100/50 text-slate-400"
                    : isSelected
                      ? "bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/30 ring-2 ring-indigo-400/50"
                      : "bg-white/80 text-slate-600 hover:bg-slate-100 hover:scale-105"
                }`}
              >
                <Icon className={`h-5 w-5 transition-transform ${isSelected ? '' : 'group-hover:scale-110'}`} />
              </button>
            );
          })}
        </div>

        <div className="my-4 h-px w-10 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

        <div className="flex flex-col items-center gap-3">
          <div className="relative group">
            <input
              aria-label="Stroke color"
              type="color"
              disabled={disabled}
              value={color}
              onChange={(event) => setColor(event.target.value)}
              className="h-10 w-10 cursor-pointer rounded-2xl border-2 border-slate-200 bg-white p-1 shadow-md transition-all hover:scale-110 hover:border-indigo-300 hover:shadow-lg"
            />
            <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: color }} />
          </div>
          
          <div className="flex flex-col items-center gap-1 mt-2">
            <input
              aria-label="Stroke width"
              type="range"
              disabled={disabled}
              min={STROKE_MIN}
              max={STROKE_MAX}
              step={1}
              value={strokeWidth}
              onChange={(event) => setStroke(Number(event.target.value))}
              className="h-24 w-1.5 cursor-pointer appearance-none rounded-full bg-slate-200 accent-indigo-500 [writing-mode:bt-lr]"
            />
          </div>

          <div className="mt-2 flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
            <button
              type="button"
              aria-label="Decrease stroke width"
              disabled={disabled}
              onClick={decreaseStroke}
              className="flex h-6 w-6 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="min-w-[2rem] text-center text-xs font-bold text-slate-700">{strokeWidth}</span>
            <button
              type="button"
              aria-label="Increase stroke width"
              disabled={disabled}
              onClick={increaseStroke}
              className="flex h-6 w-6 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          <div className="flex flex-col items-center gap-1.5 mt-2">
            {STROKE_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                disabled={disabled}
                onClick={() => setStroke(preset)}
                title={`${preset}px`}
                className={`flex items-center justify-center rounded-full transition-all hover:scale-125 ${
                  disabled
                    ? "cursor-not-allowed opacity-50"
                    : strokeWidth === preset 
                      ? "bg-indigo-500 text-white shadow-md" 
                      : "bg-slate-200 text-slate-600"
                }`}
                style={{ width: Math.max(16, preset + 4), height: Math.max(16, preset + 4) }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`pointer-events-auto mx-2 mt-2 rounded-[1.25rem] border border-slate-200/50 bg-gradient-to-br from-white via-white to-slate-50/80 px-4 py-2.5 shadow-xl shadow-slate-200/30 backdrop-blur-md md:mx-4 md:mt-3 ${
      disabled ? "opacity-70" : ""
    }`}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 p-1.5 shadow-inner">
          <button
            type="button"
            aria-label="Undo"
            disabled={disabled}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-white hover:text-slate-700 hover:shadow-sm"
          >
            <Undo className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Redo"
            disabled={disabled}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-white hover:text-slate-700 hover:shadow-sm"
          >
            <Redo className="h-4 w-4" />
          </button>
        </div>

        <div className="h-8 w-px bg-gradient-to-b from-transparent via-slate-300 to-transparent" />

        <div className="flex items-center gap-1 rounded-2xl bg-gradient-to-br from-indigo-50 to-white p-1.5 shadow-sm ring-1 ring-indigo-100">
          {tools.map((t) => {
            const Icon = t.icon;
            const isSelected = selected === t.tool;
            return (
              <button
                key={t.tool}
                type="button"
                disabled={disabled}
                onClick={() => setTool(t.tool)}
                className={`group relative flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium capitalize transition-all duration-200 ${
                  disabled
                    ? "cursor-not-allowed bg-slate-100 text-slate-400"
                    : isSelected
                      ? "bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-500/30"
                      : "text-slate-600 hover:bg-white hover:text-slate-800 hover:shadow-sm"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden lg:inline">{t.label}</span>
              </button>
            );
          })}
        </div>

        <div className="h-8 w-px bg-gradient-to-b from-transparent via-slate-300 to-transparent" />

        <div className="flex items-center gap-2 rounded-2xl bg-white p-1.5 shadow-md ring-1 ring-slate-100">
          <div className="flex items-center gap-1.5 px-1">
            {ColorPresets.map((preset) => (
              <button
                key={preset}
                type="button"
                disabled={disabled}
                onClick={() => setColor(preset)}
                className={`relative h-7 w-7 rounded-full transition-all hover:scale-110 hover:shadow-md ${
                  color === preset ? "ring-2 ring-offset-2 ring-indigo-500" : ""
                }`}
                style={{ backgroundColor: preset }}
              >
                {color === preset && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <div className="h-1.5 w-1.5 rounded-full bg-white shadow-sm" />
                  </span>
                )}
              </button>
            ))}
          </div>
          
          <div className="h-6 w-px bg-slate-200" />
          
          <div className="relative">
            <input
              aria-label="Custom color"
              type="color"
              disabled={disabled}
              value={color}
              onChange={(event) => setColor(event.target.value)}
              className="h-8 w-8 cursor-pointer rounded-xl border-2 border-slate-200 bg-transparent p-0.5 transition-all hover:border-indigo-300 hover:scale-105"
            />
          </div>
        </div>

        <div className="h-8 w-px bg-gradient-to-b from-transparent via-slate-300 to-transparent" />

        <div className="flex items-center gap-2 rounded-2xl bg-gradient-to-br from-slate-50 to-white px-3 py-2 shadow-inner ring-1 ring-slate-100">
          <button
            type="button"
            aria-label="Decrease stroke"
            disabled={disabled || strokeWidth <= STROKE_MIN}
            onClick={decreaseStroke}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 disabled:opacity-40"
          >
            <Minus className="h-4 w-4" />
          </button>
          
          <div className="flex items-center gap-1">
            <input
              aria-label="Stroke width"
              type="range"
              disabled={disabled}
              min={STROKE_MIN}
              max={STROKE_MAX}
              step={1}
              value={strokeWidth}
              onChange={(event) => setStroke(Number(event.target.value))}
              className="w-20 cursor-pointer accent-slate-700 md:w-28"
            />
            <input
              aria-label="Stroke value"
              type="number"
              disabled={disabled}
              min={STROKE_MIN}
              max={STROKE_MAX}
              value={strokeWidth}
              onChange={(event) => setStroke(Number(event.target.value))}
              className="h-8 w-14 rounded-lg border border-slate-200 bg-white px-2 text-center text-sm font-bold text-slate-700 shadow-inner focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
          
          <button
            type="button"
            aria-label="Increase stroke"
            disabled={disabled || strokeWidth >= STROKE_MAX}
            onClick={increaseStroke}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-1 rounded-2xl bg-slate-100 p-1">
          {STROKE_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              disabled={disabled}
              onClick={() => setStroke(preset)}
              className={`flex items-center justify-center rounded-lg transition-all hover:scale-110 ${
                disabled
                  ? "cursor-not-allowed opacity-50"
                  : strokeWidth === preset 
                    ? "bg-indigo-500 text-white shadow-md" 
                    : "bg-white text-slate-600 hover:shadow-sm"
              }`}
              style={{ width: Math.max(20, preset + 8), height: Math.max(20, preset + 8) }}
              title={`${preset}px`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}