"use client";

import { Minus, Plus } from "lucide-react";

type Props = {
  zoom: number;
  setZoom: (zoom: number) => void;
  clampZoom: (zoom: number) => number;
  stageSize: { width: number; height: number };
  shapes: { id: string; type: string }[];
  setViewport: (vp: { x: number; y: number }) => void;
};

export default function BoardZoomControls({ zoom, setZoom, clampZoom, stageSize, shapes, setViewport }: Props) {
  const handleFitToScreen = () => {
    if (shapes.length === 0) {
      setZoom(1);
      setViewport({ x: 0, y: 0 });
      return;
    }
    const padding = 60;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const s of shapes) {
      const sx = (s as { x?: number }).x ?? 0;
      const sy = (s as { y?: number }).y ?? 0;
      const sw = (s as { width?: number }).width ?? (s as { radius?: number }).radius ?? 100;
      const sh = (s as { height?: number }).height ?? (s as { radius?: number }).radius ?? 100;
      if (sx < minX) minX = sx;
      if (sy < minY) minY = sy;
      if (sx + sw > maxX) maxX = sx + sw;
      if (sy + sh > maxY) maxY = sy + sh;
    }
    const boundsW = maxX - minX + padding * 2;
    const boundsH = maxY - minY + padding * 2;
    const fitZoom = Math.min(stageSize.width / Math.max(1, boundsW), stageSize.height / Math.max(1, boundsH), 2);
    setZoom(clampZoom(fitZoom));
    setViewport({
      x: (stageSize.width - boundsW * fitZoom) / 2 - minX * fitZoom + padding * fitZoom,
      y: (stageSize.height - boundsH * fitZoom) / 2 - minY * fitZoom + padding * fitZoom,
    });
  };

  return (
    <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 rounded-2xl border border-slate-200/60 bg-white/90 px-3 py-2 shadow-xl shadow-slate-200/30 backdrop-blur-md">
      <button
        type="button"
        aria-label="Fit to screen"
        onClick={handleFitToScreen}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
        title="Fit to screen"
      >
        Fit
      </button>
      <div className="h-5 w-px bg-slate-200" />
      <button
        type="button"
        aria-label="Zoom out"
        onClick={() => setZoom(clampZoom(zoom - 0.1))}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
      >
        <Minus className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => setZoom(1)}
        className="flex h-8 w-14 items-center justify-center rounded-lg text-xs font-bold text-accent transition hover:bg-accent/10"
        title="Reset zoom to 100%"
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        type="button"
        aria-label="Zoom in"
        onClick={() => setZoom(clampZoom(zoom + 0.1))}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
