export type BoardShapeBase = {
  id: string;
  color: string;
  strokeWidth: number;
};

export type LineShape = BoardShapeBase & {
  type: "line";
  tool: "pen" | "eraser";
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

export type BoardShape = LineShape | RectShape | CircleShape;

export type RemoteCursor = {
  userId: string;
  x: number;
  y: number;
  updatedAt: number;
};
