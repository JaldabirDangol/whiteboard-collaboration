import { prisma } from "@/lib/prisma.js";

type ShapeData = Record<string, unknown>;

function shapeToSvg(s: ShapeData, padding: number): string | null {
  const type = String(s.type ?? "").toLowerCase();
  const x = (s.x as number) ?? 0;
  const y = (s.y as number) ?? 0;
  const color = (s.color as string) ?? "#6366f1";
  const strokeWidth = (s.strokeWidth as number) ?? 2;
  const fill = (s.fill as string) ?? "transparent";

  if (type === "rectangle") {
    const w = (s.width as number) ?? 60;
    const h = (s.height as number) ?? 40;
    return `<rect x="${x + padding}" y="${y + padding}" width="${w}" height="${h}" fill="${fill}" stroke="${color}" stroke-width="${strokeWidth}" rx="3" />`;
  }
  if (type === "circle") {
    const r = (s.radius as number) ?? 25;
    return `<circle cx="${x + padding}" cy="${y + padding}" r="${r}" fill="${fill}" stroke="${color}" stroke-width="${strokeWidth}" />`;
  }
  if (type === "ellipse") {
    const rx = (s.radiusX as number) ?? 30;
    const ry = (s.radiusY as number) ?? 20;
    return `<ellipse cx="${x + padding}" cy="${y + padding}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${color}" stroke-width="${strokeWidth}" />`;
  }
  if (type === "line") {
    const pts = s.points as number[] | undefined;
    if (pts && pts.length >= 4) {
      const pairs: string[] = [];
      for (let i = 0; i < pts.length; i += 2) {
        pairs.push(`${pts[i] + padding},${pts[i + 1] + padding}`);
      }
      return `<polyline points="${pairs.join(" ")}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" />`;
    }
  }
  if (type === "text") {
    const text = String(s.text ?? "");
    const fontSize = (s.fontSize as number) ?? 16;
    return `<text x="${x + padding}" y="${y + padding + fontSize}" font-size="${fontSize}" fill="${color}" font-family="Arial">${escapeXml(text.slice(0, 20))}</text>`;
  }
  if (type === "image") {
    const w = (s.width as number) ?? 40;
    const h = (s.height as number) ?? 40;
    return `<rect x="${x + padding}" y="${y + padding}" width="${w}" height="${h}" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1" rx="2" />`;
  }
  return null;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function generateThumbnailSvg(shapes: ShapeData[], width = 400, height = 250): string {
  const padding = 20;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (const s of shapes) {
    const type = String(s.type ?? "").toLowerCase();
    let sx = 0, sy = 0, sw = 0, sh = 0;
    if (type === "rectangle" || type === "image") {
      sx = (s.x as number) ?? 0;
      sy = (s.y as number) ?? 0;
      sw = (s.width as number) ?? 60;
      sh = (s.height as number) ?? 40;
    } else if (type === "circle") {
      sx = ((s.x as number) ?? 0) - ((s.radius as number) ?? 25);
      sy = ((s.y as number) ?? 0) - ((s.radius as number) ?? 25);
      sw = ((s.radius as number) ?? 25) * 2;
      sh = ((s.radius as number) ?? 25) * 2;
    } else if (type === "ellipse") {
      sx = ((s.x as number) ?? 0) - ((s.radiusX as number) ?? 30);
      sy = ((s.y as number) ?? 0) - ((s.radiusY as number) ?? 20);
      sw = ((s.radiusX as number) ?? 30) * 2;
      sh = ((s.radiusY as number) ?? 20) * 2;
    } else if (type === "line") {
      const pts = s.points as number[] | undefined;
      if (pts && pts.length >= 2) {
        sx = pts[0];
        sy = pts[1];
        for (let i = 2; i < pts.length; i += 2) {
          const px = pts[i];
          const py = pts[i + 1];
          if (px < sx) sx = px;
          if (py < sy) sy = py;
          if (px > sx + sw) sw = px - sx;
          if (py > sy + sh) sh = py - sy;
        }
      }
    } else if (type === "text") {
      sx = (s.x as number) ?? 0;
      sy = (s.y as number) ?? 0;
      sw = ((s.text as string)?.length ?? 5) * ((s.fontSize as number) ?? 16) * 0.6;
      sh = (s.fontSize as number) ?? 16;
    }
    if (sx < minX) minX = sx;
    if (sy < minY) minY = sy;
    if (sx + sw > maxX) maxX = sx + sw;
    if (sy + sh > maxY) maxY = sy + sh;
  }

  const shapesW = maxX - minX || width;
  const shapesH = maxY - minY || height;
  const scale = Math.min((width - padding * 2) / shapesW, (height - padding * 2) / shapesH, 3);
  const offsetX = (width - shapesW * scale) / 2 - minX * scale + padding;
  const offsetY = (height - shapesH * scale) / 2 - minY * scale + padding;

  const elements: string[] = [];
  elements.push(`<rect width="${width}" height="${height}" fill="#f8fafc" />`);
  elements.push(`<g transform="translate(${offsetX},${offsetY}) scale(${scale})">`);

  for (const s of shapes.slice(0, 50)) {
    const el = shapeToSvg(s, 0);
    if (el) elements.push(el);
  }

  elements.push("</g>");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${elements.join("")}</svg>`;
}

export async function updateBoardThumbnail(boardId: string, shapes: ShapeData[]) {
  try {
    const svg = generateThumbnailSvg(shapes);
    const base64 = Buffer.from(svg, "utf-8").toString("base64");
    const dataUrl = `data:image/svg+xml;base64,${base64}`;
    await prisma.board.update({
      where: { id: boardId },
      data: { thumbnailUrl: dataUrl },
    });
  } catch {
    // Silently fail — thumbnail is non-critical
  }
}
