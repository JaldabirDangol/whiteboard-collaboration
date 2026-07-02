import { bench, describe } from "vitest";
import { Quadtree } from "@/lib/quadtree";

type TestShape = { id: string; type: string; x: number; y: number; w: number; h: number };
const getAABB = (s: TestShape) => ({ x: s.x, y: s.y, w: s.w, h: s.h });

describe("Quadtree Performance Benchmarks", () => {
  const sizes = [100, 1000, 5000, 10000];

  for (const count of sizes) {
    const shapes: TestShape[] = [];
    for (let i = 0; i < count; i++) {
      shapes.push({ id: `s${i}`, type: "rect", x: (i * 7) % 2000, y: (i * 13) % 2000, w: 30 + (i % 20), h: 30 + (i % 20) });
    }

    bench(`insert ${count} shapes`, () => {
      const qt = new Quadtree<TestShape>({ x: -500, y: -500, w: 3000, h: 3000 });
      for (const s of shapes) {
        qt.insert(s, getAABB(s));
      }
    });

    bench(`query small area on ${count} shapes`, () => {
      const qt = new Quadtree<TestShape>({ x: -500, y: -500, w: 3000, h: 3000 });
      for (const s of shapes) {
        qt.insert(s, getAABB(s));
      }
      qt.query({ x: 0, y: 0, w: 100, h: 100 });
    });

    bench(`query full area on ${count} shapes`, () => {
      const qt = new Quadtree<TestShape>({ x: -500, y: -500, w: 3000, h: 3000 });
      for (const s of shapes) {
        qt.insert(s, getAABB(s));
      }
      qt.query({ x: -500, y: -500, w: 3000, h: 3000 });
    });

    bench(`rebuild ${count} shapes`, () => {
      const qt = new Quadtree<TestShape>({ x: -500, y: -500, w: 3000, h: 3000 });
      qt.rebuild(shapes, getAABB);
    });
  }

  bench("clear then re-insert 5000 shapes", () => {
    const qt = new Quadtree<TestShape>({ x: -500, y: -500, w: 3000, h: 3000 });
    const shapes: TestShape[] = [];
    for (let i = 0; i < 5000; i++) {
      shapes.push({ id: `s${i}`, type: "rect", x: i * 2, y: i * 2, w: 20, h: 20 });
    }
    for (const s of shapes) {
      qt.insert(s, getAABB(s));
    }
    qt.clear();
    for (const s of shapes) {
      qt.insert(s, getAABB(s));
    }
  });
});
