export type BoardShapeBase = {
  id: string;
  color: string;
  strokeWidth: number;
  fill?: string; // Optional fill color for closed shapes
};

export type LineShape = BoardShapeBase & {
  type: "line";
  tool: "pen" | "eraser" | "line";
  points: number[];
};

export type RectShape = BoardShapeBase & {
  type: "rectangle";
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CircleShape = BoardShapeBase & {
  type: "circle";
  x: number;
  y: number;
  radius: number;
};

export type EllipseShape = BoardShapeBase & {
  type: "ellipse";
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
};

export type TextShape = BoardShapeBase & {
  type: "text";
  x: number;
  y: number;
  text: string;
  fontSize: number;
  fontFamily?: string;
};

export type ImageShape = BoardShapeBase & {
  type: "image";
  x: number;
  y: number;
  width: number;
  height: number;
  url: string;
};

export type BoardShape = LineShape | RectShape | CircleShape | EllipseShape | TextShape | ImageShape;

export type LaserStroke = {
  id: string;
  points: number[];
  color: string;
  strokeWidth: number;
  createdAt: number;
};

export type RemoteCursor = {
  userId: string;
  x: number;
  y: number;
  updatedAt: number;
};
