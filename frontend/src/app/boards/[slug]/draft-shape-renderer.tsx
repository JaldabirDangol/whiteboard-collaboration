"use client";

import React from "react";
import { Circle, Ellipse, Line, Rect } from "react-konva";

type DraftShape = {
  id: string;
  type: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  radius?: number;
  radiusX?: number;
  radiusY?: number;
  points?: number[];
  color?: string;
  strokeWidth?: number;
};

type Props = {
  shape: DraftShape;
};

export default function DraftShapeRenderer({ shape }: Props) {
  const baseProps = {
    key: shape.id,
    stroke: shape.color || "#94a3b8",
    strokeWidth: shape.strokeWidth || 2,
    dash: [6, 4],
    opacity: 0.4,
    listening: false,
  };

  switch (shape.type) {
    case "line":
      return <Line {...baseProps} points={shape.points || []} tension={0.5} lineCap="round" lineJoin="round" />;
    case "rectangle":
      return <Rect {...baseProps} x={shape.x ?? 0} y={shape.y ?? 0} width={shape.width ?? 0} height={shape.height ?? 0} />;
    case "circle":
      return <Circle {...baseProps} x={shape.x ?? 0} y={shape.y ?? 0} radius={shape.radius ?? 0} />;
    case "ellipse":
      return <Ellipse {...baseProps} x={shape.x ?? 0} y={shape.y ?? 0} radiusX={shape.radiusX ?? 0} radiusY={shape.radiusY ?? 0} />;
    default:
      return null;
  }
}
