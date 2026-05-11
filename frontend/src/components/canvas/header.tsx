"use client";

import { useToolStore, ToolType } from "@/store/useToolStore";
import { ComponentType, SVGProps } from "react";
import { Circle, Eraser, LassoSelect, Minus, Pen, Plus, RectangleEllipsis } from "lucide-react";

type Tool = {
  tool: ToolType;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

type HeaderProps = {
  layout?: "horizontal" | "vertical";
  disabled?: boolean;
};

const STROKE_MIN = 1;
const STROKE_MAX = 148;
const STROKE_PRESETS = [1, 2, 6, 16, 28, 148];

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
      <div className={`pointer-events-auto mt-3 flex h-[calc(100%-1.5rem)] w-16 flex-col items-center rounded-3xl py-3 shadow-sm ${
        disabled ? "opacity-70" : ""
      }`}>
        <div className="flex flex-col items-center gap-2.5">
          {tools.map((t) => {
            const Icon = t.icon;

            return (
              <button
                key={t.tool}
                type="button"
                disabled={disabled}
                onClick={() => setTool(t.tool)}
                title={t.tool}
                className={`grid h-11 w-11 place-items-center rounded-2xl transition ${
                  disabled
                    ? "cursor-not-allowed bg-slate-100 text-slate-400"
                    :
                  selected === t.tool
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>

        <div className="my-3 h-px w-9 bg-slate-200" />

        <input
          aria-label="Stroke color"
          type="color"
          disabled={disabled}
          value={color}
          onChange={(event) => setColor(event.target.value)}
          className="h-9 w-9 cursor-pointer rounded-xl border border-slate-300 bg-transparent p-1"
        />

        <input
          aria-label="Stroke width"
          type="range"
          disabled={disabled}
          min={STROKE_MIN}
          max={STROKE_MAX}
          step={1}
          value={strokeWidth}
          onChange={(event) => setStroke(Number(event.target.value))}
          className="mt-4 h-28 w-1.5 appearance-auto accent-indigo-600 [writing-mode:bt-lr]"
        />

        <div className="mt-1 flex items-center gap-0.5">
          <button
            type="button"
            aria-label="Decrease stroke width"
            disabled={disabled}
            onClick={decreaseStroke}
            className="grid h-5 w-5 place-items-center rounded-md text-slate-500 transition hover:bg-slate-100"
          >
            <Minus className="h-3 w-3" />
          </button>
          <span className="text-[11px] font-medium text-slate-500">{strokeWidth}px</span>
          <button
            type="button"
            aria-label="Increase stroke width"
            disabled={disabled}
            onClick={increaseStroke}
            className="grid h-5 w-5 place-items-center rounded-md text-slate-500 transition hover:bg-slate-100"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>

        <div className="mt-2 flex flex-col items-center gap-1">
          {STROKE_PRESETS.slice(0, 4).map((preset) => (
            <button
              key={preset}
              type="button"
              disabled={disabled}
              onClick={() => setStroke(preset)}
              title={`${preset}px`}
              className={`grid h-5 w-5 place-items-center rounded-full transition ${
                disabled
                  ? "cursor-not-allowed bg-slate-100 text-slate-300"
                  :
                strokeWidth === preset ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500 hover:bg-slate-300"
              }`}
            >
              <span className="rounded-full bg-current" style={{ width: Math.max(2, preset), height: Math.max(2, preset) }} />
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`pointer-events-auto mx-2 mt-2 rounded-2xl border border-slate-200/90 bg-white/95 p-2 shadow-sm backdrop-blur-sm md:mx-4 md:mt-3 ${
      disabled ? "opacity-70" : ""
    }`}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          {tools.map((t) => {
            const Icon = t.icon;

            return (
              <button
                key={t.tool}
                type="button"
                disabled={disabled}
                onClick={() => setTool(t.tool)}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium capitalize transition md:px-3 md:text-sm ${
                  disabled
                    ? "cursor-not-allowed bg-slate-100 text-slate-400"
                    :
                  selected === t.tool
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{t.tool}</span>
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
          <button
            type="button"
            aria-label="Decrease stroke width"
            disabled={disabled}
            onClick={decreaseStroke}
            className="grid h-7 w-7 place-items-center rounded-md text-slate-600 transition hover:bg-slate-200"
          >
            <Minus className="h-4 w-4" />
          </button>
          <input
            aria-label="Stroke color"
            type="color"
            disabled={disabled}
            value={color}
            onChange={(event) => setColor(event.target.value)}
            className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent p-0"
          />
          <input
            aria-label="Stroke width"
            type="range"
            disabled={disabled}
            min={STROKE_MIN}
            max={STROKE_MAX}
            step={1}
            value={strokeWidth}
            onChange={(event) => setStroke(Number(event.target.value))}
            className="w-20 accent-slate-900 md:w-28"
          />
          <input
            aria-label="Stroke width in pixels"
            type="number"
            disabled={disabled}
            min={STROKE_MIN}
            max={STROKE_MAX}
            value={strokeWidth}
            onChange={(event) => setStroke(Number(event.target.value))}
            className="h-7 w-12 rounded-md border border-slate-200 bg-white px-1 text-center text-xs text-slate-700"
          />
          <button
            type="button"
            aria-label="Increase stroke width"
            disabled={disabled}
            onClick={increaseStroke}
            className="grid h-7 w-7 place-items-center rounded-md text-slate-600 transition hover:bg-slate-200"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="flex w-full items-center gap-1 pt-1 md:w-auto md:pt-0">
          {STROKE_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              disabled={disabled}
              onClick={() => setStroke(preset)}
              className={`grid h-6 w-6 place-items-center rounded-md transition ${
                disabled
                  ? "cursor-not-allowed text-slate-300"
                  :
                strokeWidth === preset ? "bg-indigo-100 text-indigo-700" : "text-slate-500 hover:bg-slate-100"
              }`}
              title={`${preset}px`}
            >
              <span className="rounded-full bg-current" style={{ width: Math.max(2, preset), height: Math.max(2, preset) }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}