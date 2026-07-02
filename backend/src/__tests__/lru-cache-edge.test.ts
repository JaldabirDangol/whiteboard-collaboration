import { describe, it, expect, vi } from "vitest";
import { LRUCache } from "@/utils/lru-cache.js";

describe("LRUCache - Edge Cases", () => {
  it("handles capacity of 1", () => {
    const cache = new LRUCache<string, number>(1);
    cache.set("a", 1);
    expect(cache.get("a")).toBe(1);
    cache.set("b", 2);
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe(2);
  });

  it("handles capacity of 0 (no-op)", () => {
    const cache = new LRUCache<string, number>(0);
    cache.set("a", 1);
    expect(cache.get("a")).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it("handles delete on non-existent key", () => {
    const cache = new LRUCache<string, number>(3);
    expect(() => cache.delete("nonexistent")).not.toThrow();
    expect(cache.size).toBe(0);
  });

  it("handles get on empty cache", () => {
    const cache = new LRUCache<string, number>(3);
    expect(cache.get("anything")).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it("handles many sequential insertions", () => {
    const cache = new LRUCache<number, number>(50);
    for (let i = 0; i < 1000; i++) {
      cache.set(i, i * 2);
    }
    expect(cache.size).toBe(50);
    expect(cache.get(0)).toBeUndefined(); // evicted
    expect(cache.get(999)).toBe(1998);    // most recent
  });

  it("eviction callback fires correctly", () => {
    const evicted: Array<{ key: string; value: number }> = [];
    const cache = new LRUCache<string, number>(3, (key, value) => {
      evicted.push({ key, value });
    });

    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);
    expect(evicted).toHaveLength(0);

    cache.set("d", 4); // evicts "a"
    expect(evicted).toHaveLength(1);
    expect(evicted[0]).toEqual({ key: "a", value: 1 });

    cache.set("e", 5); // evicts "b"
    expect(evicted).toHaveLength(2);
    expect(evicted[1]).toEqual({ key: "b", value: 2 });
  });

  it("re-inserting an existing key promotes without eviction", () => {
    const evicted: string[] = [];
    const cache = new LRUCache<string, number>(2, (key) => { evicted.push(key); });

    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("a", 10); // re-insert, promotes to head
    expect(evicted).toHaveLength(0);
    expect(cache.size).toBe(2);
    expect(cache.get("a")).toBe(10);

    cache.set("c", 3);  // should evict "b", not "a"
    expect(evicted).toEqual(["b"]);
    expect(cache.get("a")).toBe(10);
    expect(cache.get("c")).toBe(3);
  });

  it("clear removes all entries", () => {
    const cache = new LRUCache<string, number>(5);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);
    expect(cache.size).toBe(3);
    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.get("a")).toBeUndefined();
    expect(cache.keys()).toEqual([]);
  });

  it("clear removes all entries", () => {
    const cache = new LRUCache<string, number>(5);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);
    expect(cache.size).toBe(3);
    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.get("a")).toBeUndefined();
    expect(cache.keys()).toEqual([]);
  });

  it("keys returns in Map insertion order", () => {
    const cache = new LRUCache<string, number>(5);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);
    expect(cache.keys()).toEqual(["a", "b", "c"]);
    // LRU order is maintained via linked list, keys() returns Map insertion order
  });

  it("handles has correctly after eviction", () => {
    const cache = new LRUCache<string, number>(2);
    cache.set("a", 1);
    cache.set("b", 2);
    expect(cache.has("a")).toBe(true);
    expect(cache.has("b")).toBe(true);

    cache.set("c", 3); // evicts "a"
    expect(cache.has("a")).toBe(false);
    expect(cache.has("b")).toBe(true);
    expect(cache.has("c")).toBe(true);
  });

  it("handles concurrent-like rapid access pattern", () => {
    const cache = new LRUCache<number, number>(10);
    for (let round = 0; round < 100; round++) {
      for (let i = 0; i < 20; i++) {
        cache.set(i, i);
        cache.get(i - 5); // access older keys
      }
    }
    // Should stabilize at capacity
    expect(cache.size).toBe(10);
  });
});
