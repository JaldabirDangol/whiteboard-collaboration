import type { BoardShape } from "./board-types";

export const LOCAL_ORIGIN = "local";
export const REMOTE_ORIGIN = "remote";
export const SHAPES_KEY = "shapes";

const toFiniteNumber = (value: unknown, fallback: number) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const toNumberPoints = (value: unknown): number[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((point) => toFiniteNumber(point, Number.NaN))
    .filter((point) => Number.isFinite(point));
};

const coerceShape = (raw: unknown, index: number): BoardShape | null => {
  if (!raw || typeof raw !== "object") return null;

  const shape = raw as Record<string, unknown>;
  const typeRaw = typeof shape.type === "string" ? shape.type.toLowerCase() : "";
  const color = typeof shape.color === "string" && shape.color.trim() ? shape.color : "#000000";
  const strokeWidth = Math.max(1, toFiniteNumber(shape.strokeWidth, 2));
  const tool = shape.tool === "eraser" ? "eraser" : "pen";
  const id =
    typeof shape.id === "string" && shape.id.trim()
      ? shape.id.trim()
      : `legacy-${typeRaw || "shape"}-${index}`;

  if (typeRaw === "line" || typeRaw === "draw" || Array.isArray(shape.points)) {
    const points = toNumberPoints(shape.points);
    if (points.length >= 2) {
      return {
        id,
        type: "line",
        tool,
        points,
        color,
        strokeWidth,
      };
    }
    return null;
  }

  if (typeRaw === "image" || typeof shape.url === "string" || typeof shape.src === "string") {
    const url = typeof shape.url === "string" ? shape.url : typeof shape.src === "string" ? shape.src : "";
    if (!url) return null;
    return {
      id,
      type: "image",
      x: toFiniteNumber(shape.x, 0),
      y: toFiniteNumber(shape.y, 0),
      width: Math.max(1, toFiniteNumber(shape.width, 320)),
      height: Math.max(1, toFiniteNumber(shape.height, 200)),
      url,
      color,
      strokeWidth,
    };
  }

  if (typeRaw === "rectangle" || typeRaw === "rect" || (shape.width !== undefined && shape.height !== undefined)) {
    return {
      id,
      type: "rectangle",
      x: toFiniteNumber(shape.x, 0),
      y: toFiniteNumber(shape.y, 0),
      width: toFiniteNumber(shape.width, 0),
      height: toFiniteNumber(shape.height, 0),
      color,
      strokeWidth,
    };
  }

  if (typeRaw === "circle" || shape.radius !== undefined) {
    const radius = Math.abs(toFiniteNumber(shape.radius, 0));
    return {
      id,
      type: "circle",
      x: toFiniteNumber(shape.x, 0),
      y: toFiniteNumber(shape.y, 0),
      radius,
      color,
      strokeWidth,
    };
  }

  if (typeRaw === "ellipse" || shape.radiusX !== undefined) {
    return {
      id,
      type: "ellipse",
      x: toFiniteNumber(shape.x, 0),
      y: toFiniteNumber(shape.y, 0),
      radiusX: Math.abs(toFiniteNumber(shape.radiusX, 50)),
      radiusY: Math.abs(toFiniteNumber(shape.radiusY, 30)),
      color,
      strokeWidth,
    };
  }

  if (typeRaw === "text" || typeof shape.text === "string") {
    const text = typeof shape.text === "string" ? shape.text : "";
    return {
      id,
      type: "text",
      x: toFiniteNumber(shape.x, 0),
      y: toFiniteNumber(shape.y, 0),
      text,
      fontSize: Math.max(8, toFiniteNumber(shape.fontSize, 16)),
      fontFamily: typeof shape.fontFamily === "string" ? shape.fontFamily : "Arial",
      color,
      strokeWidth,
    };
  }

  return null;
};

export const parseShapes = (raw: string | undefined): unknown[] => {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const normalizeShapesForClient = (rawShapes: unknown[]): BoardShape[] => {
  if (rawShapes.length === 0) return [];

  const seen = new Map<string, number>();

  return rawShapes.flatMap((rawShape, index) => {
    const shape = coerceShape(rawShape, index);
    if (!shape) return [];

    const originalId = typeof shape.id === "string" ? shape.id.trim() : "";
    const baseId = originalId || `legacy-${shape.type}-${index}`;
    const count = seen.get(baseId) ?? 0;
    seen.set(baseId, count + 1);

    if (count === 0) {
      return [{
        ...shape,
        id: baseId,
      }];
    }

    return [{
      ...shape,
      id: `${baseId}__dup_${count}`,
    }];
  });
};

export const toUint8 = (value: unknown): Uint8Array => {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (Array.isArray(value)) return new Uint8Array(value);
  if (value && typeof value === "object") {
    const arrLike = value as { data?: number[] };
    if (Array.isArray(arrLike.data)) {
      return new Uint8Array(arrLike.data);
    }
  }
  return new Uint8Array();
};

export const newShapeId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
};
