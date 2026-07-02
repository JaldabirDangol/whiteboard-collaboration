import { describe, it, expect } from "vitest";
import { Quadtree } from "@/lib/quadtree";

type TestShape = { id: string; type: string; x: number; y: number; w: number; h: number };
const getAABB = (s: TestShape) => ({ x: s.x, y: s.y, w: s.w, h: s.h });

describe("Quadtree - Edge Cases & Stress", () => {
  it("handles 10,000 shapes without crashing", () => {
    const qt = new Quadtree<TestShape>({ x: -50000, y: -50000, w: 100000, h: 100000 });
    const shapes: TestShape[] = [];
    for (let i = 0; i < 10000; i++) {
      shapes.push({ id: `s${i}`, type: "rect", x: i * 5, y: i * 5, w: 20, h: 20 });
    }
    for (const s of shapes) {
      qt.insert(s, getAABB(s));
    }
    const all = qt.query({ x: -50000, y: -50000, w: 100000, h: 100000 });
    expect(all).toHaveLength(10000);
  });

  it("handles shapes at extreme coordinates", () => {
    const qt = new Quadtree<TestShape>({ x: -1e9, y: -1e9, w: 2e9, h: 2e9 });
    const shape = { id: "far", type: "rect", x: 5e8, y: -5e8, w: 100, h: 100 };
    qt.insert(shape, getAABB(shape));
    expect(qt.query({ x: 5e8 - 10, y: -5e8 - 10, w: 200, h: 200 })).toHaveLength(1);
    expect(qt.query({ x: -5e8, y: 5e8, w: 10, h: 10 })).toHaveLength(0);
  });

  it("handles many overlapping shapes at same position", () => {
    const qt = new Quadtree<TestShape>({ x: 0, y: 0, w: 1000, h: 1000 });
    for (let i = 0; i < 500; i++) {
      qt.insert({ id: `s${i}`, type: "rect", x: 100, y: 100, w: 50, h: 50 }, { x: 100, y: 100, w: 50, h: 50 });
    }
    const found = qt.query({ x: 90, y: 90, w: 70, h: 70 });
    expect(found).toHaveLength(500);
  });

  it("returns empty for query completely outside bounds", () => {
    const qt = new Quadtree<TestShape>({ x: 0, y: 0, w: 100, h: 100 });
    qt.insert({ id: "s1", type: "rect", x: 10, y: 10, w: 10, h: 10 }, getAABB({ id: "s1", type: "rect", x: 10, y: 10, w: 10, h: 10 }));
    expect(qt.query({ x: 200, y: 200, w: 10, h: 10 })).toEqual([]);
    expect(qt.query({ x: -100, y: -100, w: 10, h: 10 })).toEqual([]);
  });

  it("query matches exact boundary edge", () => {
    const qt = new Quadtree<TestShape>({ x: 0, y: 0, w: 100, h: 100 });
    const shape = { id: "s1", type: "rect", x: 50, y: 50, w: 10, h: 10 };
    qt.insert(shape, getAABB(shape));
    // Query overlapping shape's interior
    expect(qt.query({ x: 55, y: 55, w: 1, h: 1 })).toEqual([shape]);
    // Query touching right edge (no overlap with strict AABB)
    expect(qt.query({ x: 60, y: 50, w: 1, h: 10 })).toEqual([]);
    // Query just past right edge
    expect(qt.query({ x: 61, y: 50, w: 1, h: 10 })).toEqual([]);
  });

  it("maintains all shapes through multiple rebuild cycles", () => {
    const qt = new Quadtree<TestShape>({ x: 0, y: 0, w: 500, h: 500 });
    const shapes1 = Array.from({ length: 100 }, (_, i) => ({
      id: `s${i}`, type: "rect", x: i * 5, y: i * 5, w: 10, h: 10,
    }));
    qt.rebuild(shapes1, getAABB);
    expect(qt.query({ x: 0, y: 0, w: 500, h: 500 })).toHaveLength(100);

    const shapes2 = Array.from({ length: 200 }, (_, i) => ({
      id: `s${i + 100}`, type: "circle", x: i * 2, y: i * 2, w: 8, h: 8,
    }));
    qt.rebuild(shapes2, getAABB);
    const all2 = qt.query({ x: 0, y: 0, w: 500, h: 500 });
    expect(all2).toHaveLength(200);
    expect(all2.some(s => s.id === "s100")).toBe(true);
    expect(all2.some(s => s.id === "s299")).toBe(true);

    const shapes3 = Array.from({ length: 50 }, (_, i) => ({
      id: `s${i + 300}`, type: "line", x: i * 10, y: i * 10, w: 5, h: 5,
    }));
    qt.rebuild(shapes3, getAABB);
    expect(qt.query({ x: 0, y: 0, w: 500, h: 500 })).toHaveLength(50);
  });

  it("insert and query with zero-dimension shapes", () => {
    const qt = new Quadtree<TestShape>({ x: 0, y: 0, w: 100, h: 100 });
    const point = { id: "point", type: "rect", x: 50, y: 50, w: 0, h: 0 };
    qt.insert(point, getAABB(point));
    // Query must fully overlap the point location
    const found = qt.query({ x: 49, y: 49, w: 2, h: 2 });
    expect(found).toHaveLength(1);
  });
});
