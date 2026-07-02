import type * as Y from "yjs";
import type { BoardShape } from "./board-types";

export const LOCAL_ORIGIN = "local";
export const REMOTE_ORIGIN = "remote";
export const SHAPES_KEY = "shapes";
export const SHAPE_KEY_PREFIX = "shape:";
export const isShapeKey = (key: string) => key.startsWith(SHAPE_KEY_PREFIX);
export const shapeKeyForId = (id: string) => `${SHAPE_KEY_PREFIX}${id}`;
export const idFromShapeKey = (key: string) => key.slice(SHAPE_KEY_PREFIX.length);

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
  const fill = typeof shape.fill === "string" && shape.fill.trim() ? shape.fill : undefined;
  const rawTool = shape.tool;
  const tool: "pen" | "eraser" | "line" | "arrow" = typeof rawTool === "string" && ["pen", "eraser", "line", "arrow"].includes(rawTool) ? rawTool as "pen" | "eraser" | "line" | "arrow" : "pen";
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
      fill,
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
      fill,
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
      fill,
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

export const readShapesFromYBoard = (yBoard: Y.Map<string>): BoardShape[] => {
  const shapes: BoardShape[] = [];
  for (const [key, value] of yBoard.entries()) {
    if (isShapeKey(key) && typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (parsed && typeof parsed === "object") {
          const normalized = normalizeShapesForClient([parsed]);
          shapes.push(...normalized);
        }
      } catch {
        continue;
      }
    }
  }
  return shapes;
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

export function serializeShapesToSvg(shapes: BoardShape[], title?: string): string {
  if (shapes.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 400" width="500" height="400"><rect width="100%" height="100%" fill="white"/></svg>`;
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  const expandBounds = (x: number, y: number, w: number, h: number) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);
  };

  shapes.forEach((s) => {
    switch (s.type) {
      case "rectangle": expandBounds(s.x, s.y, s.width, s.height); break;
      case "circle": expandBounds(s.x - s.radius, s.y - s.radius, s.radius * 2, s.radius * 2); break;
      case "ellipse": expandBounds(s.x - s.radiusX, s.y - s.radiusY, s.radiusX * 2, s.radiusY * 2); break;
      case "text": expandBounds(s.x, s.y, s.text.length * (s.fontSize || 16) * 0.6, (s.fontSize || 16) * 1.4); break;
      case "line": {
        for (let i = 0; i < s.points.length; i += 2) {
          expandBounds(s.points[i], s.points[i + 1], 1, 1);
        }
        break;
      }
      case "image": expandBounds(s.x, s.y, s.width, s.height); break;
    }
  });

  const pad = 40;
  const w = Math.max(maxX - minX + pad * 2, 200);
  const h = Math.max(maxY - minY + pad * 2, 200);
  const ox = -minX + pad;
  const oy = -minY + pad;

  const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const elements: string[] = [];

  shapes.forEach((s) => {
    const fill = s.fill && s.fill !== "transparent" ? s.fill : "none";
    const stroke = s.type !== "image" ? `stroke="${s.color}" stroke-width="${s.strokeWidth}"` : "";

    switch (s.type) {
      case "rectangle":
        elements.push(`<rect x="${s.x + ox}" y="${s.y + oy}" width="${s.width}" height="${s.height}" fill="${fill}" ${stroke}/>`);
        break;
      case "circle":
        elements.push(`<circle cx="${s.x + ox}" cy="${s.y + oy}" r="${s.radius}" fill="${fill}" ${stroke}/>`);
        break;
      case "ellipse":
        elements.push(`<ellipse cx="${s.x + ox}" cy="${s.y + oy}" rx="${s.radiusX}" ry="${s.radiusY}" fill="${fill}" ${stroke}/>`);
        break;
      case "line": {
        const pts = s.points.map((p, i) => (i % 2 === 0 ? p + ox : p + oy)).join(",");
        elements.push(`<polyline points="${pts}" fill="none" ${stroke}/>`);
        break;
      }
      case "text":
        elements.push(`<text x="${s.x + ox}" y="${s.y + oy + (s.fontSize || 16)}" font-family="${s.fontFamily || "Arial"}" font-size="${s.fontSize || 16}" fill="${s.color}">${esc(s.text)}</text>`);
        break;
      case "image":
        elements.push(`<image x="${s.x + ox}" y="${s.y + oy}" width="${s.width}" height="${s.height}" href="${esc(s.url)}"/>`);
        break;
    }
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  ${title ? `<title>${esc(title)}</title>` : ""}
  <rect width="100%" height="100%" fill="white"/>
  ${elements.join("\n  ")}
</svg>`;
}

export const newShapeId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
};
