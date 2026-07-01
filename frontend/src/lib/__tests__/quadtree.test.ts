import { describe, it, expect } from "vitest";
import { Quadtree } from "@/lib/quadtree";

type TestShape = { id: string; type: string; x: number; y: number; w: number; h: number };

const getAABB = (s: TestShape) => ({ x: s.x, y: s.y, w: s.w, h: s.h });

describe("Quadtree", () => {
  it("returns empty array for empty tree", () => {
    const qt = new Quadtree<TestShape>({ x: 0, y: 0, w: 100, h: 100 });
    expect(qt.query({ x: 0, y: 0, w: 10, h: 10 })).toEqual([]);
  });

  it("finds a single inserted shape", () => {
    const qt = new Quadtree<TestShape>({ x: 0, y: 0, w: 100, h: 100 });
    const shape = { id: "1", type: "rect", x: 10, y: 10, w: 20, h: 20 };
    qt.insert(shape, getAABB(shape));
    expect(qt.query({ x: 5, y: 5, w: 30, h: 30 })).toEqual([shape]);
  });

  it("excludes shapes outside the query rect", () => {
    const qt = new Quadtree<TestShape>({ x: 0, y: 0, w: 100, h: 100 });
    const shape = { id: "1", type: "rect", x: 10, y: 10, w: 20, h: 20 };
    qt.insert(shape, getAABB(shape));
    expect(qt.query({ x: 50, y: 50, w: 10, h: 10 })).toEqual([]);
  });

  it("inserts many shapes and queries correctly", () => {
    const qt = new Quadtree<TestShape>({ x: 0, y: 0, w: 100, h: 100 });
    const shapes: TestShape[] = [];
    for (let i = 0; i < 20; i++) {
      const s = { id: `${i}`, type: "rect", x: i * 5, y: i * 5, w: 4, h: 4 };
      shapes.push(s);
      qt.insert(s, getAABB(s));
    }
    const found = qt.query({ x: 0, y: 0, w: 30, h: 30 });
    expect(found.length).toBeGreaterThan(0);
    expect(found.length).toBeLessThan(shapes.length);
    for (const s of found) {
      const aabb = getAABB(s);
      expect(aabb.x < 30 && aabb.y < 30).toBe(true);
    }
  });

  it("clear removes all shapes", () => {
    const qt = new Quadtree<TestShape>({ x: 0, y: 0, w: 100, h: 100 });
    qt.insert({ id: "1", type: "rect", x: 10, y: 10, w: 5, h: 5 }, { x: 10, y: 10, w: 5, h: 5 });
    qt.clear();
    expect(qt.query({ x: 0, y: 0, w: 100, h: 100 })).toEqual([]);
  });

  it("rebuild replaces all shapes", () => {
    const qt = new Quadtree<TestShape>({ x: 0, y: 0, w: 100, h: 100 });
    qt.insert({ id: "1", type: "rect", x: 10, y: 10, w: 5, h: 5 }, { x: 10, y: 10, w: 5, h: 5 });
    const newShapes = [{ id: "2", type: "circle", x: 50, y: 50, w: 10, h: 10 }];
    qt.rebuild(newShapes, getAABB);
    const found = qt.query({ x: 40, y: 40, w: 30, h: 30 });
    expect(found).toHaveLength(1);
    expect(found[0]!.id).toBe("2");
  });

  it("intersects partial overlap at boundary", () => {
    const qt = new Quadtree<TestShape>({ x: 0, y: 0, w: 100, h: 100 });
    const shape = { id: "1", type: "rect", x: 10, y: 10, w: 20, h: 20 };
    qt.insert(shape, getAABB(shape));
    expect(qt.query({ x: 5, y: 5, w: 10, h: 10 })).toEqual([shape]);
    expect(qt.query({ x: 30, y: 30, w: 5, h: 5 })).toEqual([]);
    expect(qt.query({ x: 29, y: 29, w: 5, h: 5 })).toEqual([shape]);
  });

  it("subdivides automatically past capacity", () => {
    const qt = new Quadtree<TestShape>({ x: 0, y: 0, w: 1000, h: 1000 }, 2);
    for (let i = 0; i < 10; i++) {
      const s = { id: `${i}`, type: "rect", x: i * 50 + 1, y: i * 50 + 1, w: 10, h: 10 };
      qt.insert(s, getAABB(s));
    }
    const all = qt.query({ x: 0, y: 0, w: 1000, h: 1000 });
    expect(all).toHaveLength(10);
  });
});
