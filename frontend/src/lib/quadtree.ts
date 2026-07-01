type Rect = { x: number; y: number; w: number; h: number };

const intersects = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

const contains = (parent: Rect, child: Rect): boolean =>
  child.x >= parent.x &&
  child.y >= parent.y &&
  child.x + child.w <= parent.x + parent.w &&
  child.y + child.h <= parent.y + parent.h;

export class Quadtree<T extends { id: string }> {
  private capacity: number;
  private bounds: Rect;
  private items: { shape: T; aabb: Rect }[];
  private children: [Quadtree<T>, Quadtree<T>, Quadtree<T>, Quadtree<T>] | null;

  constructor(bounds: Rect, capacity = 4) {
    this.bounds = bounds;
    this.capacity = capacity;
    this.items = [];
    this.children = null;
  }

  insert(shape: T, aabb: Rect): void {
    if (this.children) {
      for (const child of this.children) {
        if (contains(child.bounds, aabb)) {
          child.insert(shape, aabb);
          return;
        }
      }
    }

    this.items.push({ shape, aabb });

    if (this.items.length > this.capacity && !this.children) {
      this.subdivide();
    }
  }

  query(rect: Rect): T[] {
    const result: T[] = [];

    if (!intersects(this.bounds, rect)) return result;

    if (this.children) {
      for (const child of this.children) {
        const found = child.query(rect);
        for (const s of found) result.push(s);
      }
    }

    for (const { shape, aabb } of this.items) {
      if (intersects(aabb, rect)) {
        result.push(shape);
      }
    }

    return result;
  }

  clear(): void {
    this.items = [];
    this.children = null;
  }

  rebuild(shapes: T[], getAABB: (shape: T) => Rect | null): void {
    this.clear();
    for (const shape of shapes) {
      const aabb = getAABB(shape);
      if (aabb) this.insert(shape, aabb);
    }
  }

  private subdivide(): void {
    const { x, y, w, h } = this.bounds;
    const hw = w / 2;
    const hh = h / 2;
    this.children = [
      new Quadtree<T>({ x, y, w: hw, h: hh }, this.capacity),
      new Quadtree<T>({ x: x + hw, y, w: hw, h: hh }, this.capacity),
      new Quadtree<T>({ x, y: y + hh, w: hw, h: hh }, this.capacity),
      new Quadtree<T>({ x: x + hw, y: y + hh, w: hw, h: hh }, this.capacity),
    ];

    const items = this.items;
    this.items = [];
    for (const item of items) {
      for (const child of this.children) {
        if (contains(child.bounds, item.aabb)) {
          child.insert(item.shape, item.aabb);
          break;
        }
      }
    }
  }
}
