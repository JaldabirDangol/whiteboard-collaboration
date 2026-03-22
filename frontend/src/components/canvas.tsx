"use client";

import { useRef, useEffect, useState } from "react";

type Point = { x: number; y: number };

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  const [isDrawing, setIsDrawing] = useState(false);

  // camera (like Excalidraw)
  const camera = useRef({ x: 0, y: 0, scale: 1 });

  const lastPoint = useRef<Point | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      redraw();
    };

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineCap = "round";
    ctx.lineWidth = 2;
    ctxRef.current = ctx;

    resize();
    window.addEventListener("resize", resize);

    return () => window.removeEventListener("resize", resize);
  }, []);

  const getWorldPoint = (e: React.MouseEvent): Point => {
    const rect = canvasRef.current!.getBoundingClientRect();

    return {
      x: (e.clientX - rect.left - camera.current.x) / camera.current.scale,
      y: (e.clientY - rect.top - camera.current.y) / camera.current.scale,
    };
  };

  const startDrawing = (e: React.MouseEvent) => {
    setIsDrawing(true);
    lastPoint.current = getWorldPoint(e);
  };

  const draw = (e: React.MouseEvent) => {
    if (!isDrawing) return;

    const ctx = ctxRef.current;
    if (!ctx || !lastPoint.current) return;

    const point = getWorldPoint(e);

    ctx.beginPath();
    ctx.moveTo(
      lastPoint.current.x * camera.current.scale + camera.current.x,
      lastPoint.current.y * camera.current.scale + camera.current.y
    );

    ctx.lineTo(
      point.x * camera.current.scale + camera.current.x,
      point.y * camera.current.scale + camera.current.y
    );

    ctx.stroke();

    lastPoint.current = point;
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    lastPoint.current = null;
  };

  // simple pan (middle mouse / alt drag can be added later)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();

    const zoomFactor = 0.001;
    camera.current.scale -= e.deltaY * zoomFactor;

    camera.current.scale = Math.min(Math.max(camera.current.scale, 0.2), 3);

    redraw();
  };

  const redraw = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // future: redraw stored shapes here
  };

  return (
    <canvas
      ref={canvasRef}
      style={{ display: "block", background: "#fff", cursor: isDrawing ? "crosshair" : "default" }}
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={stopDrawing}
      onMouseLeave={stopDrawing}
      onWheel={handleWheel}
    />
  );
}