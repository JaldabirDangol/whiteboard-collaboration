import { describe, it, expect, vi } from "vitest";
import { LRUCache } from "@/utils/lru-cache.js";

describe("LRUCache", () => {
  it("set and get a value", () => {
    const cache = new LRUCache<string, number>(3);
    cache.set("a", 1);
    expect(cache.get("a")).toBe(1);
  });

  it("returns undefined for missing key", () => {
    const cache = new LRUCache<string, number>(3);
    expect(cache.get("nonexistent")).toBeUndefined();
  });

  it("evicts least recently used when over capacity", () => {
    const evicted: Array<{ key: string; value: number }> = [];
    const cache = new LRUCache<string, number>(2, (key, value) => {
      evicted.push({ key, value });
    });

    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3); // should evict "a"

    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe(2);
    expect(cache.get("c")).toBe(3);
    expect(evicted).toHaveLength(1);
    expect(evicted[0]!.key).toBe("a");
    expect(evicted[0]!.value).toBe(1);
  });

  it("get promotes key to most recently used", () => {
    const evicted: string[] = [];
    const cache = new LRUCache<string, number>(2, (key) => { evicted.push(key); });

    cache.set("a", 1);
    cache.set("b", 2);
    cache.get("a");           // promotes a to head
    cache.set("c", 3);        // should evict "b" (not "a")

    expect(cache.get("a")).toBe(1);
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("c")).toBe(3);
    expect(evicted).toEqual(["b"]);
  });

  it("set updates existing value and moves to head", () => {
    const evicted: string[] = [];
    const cache = new LRUCache<string, number>(2, (key) => { evicted.push(key); });

    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("a", 10);       // update, moves to head
    cache.set("c", 3);        // should evict "b"

    expect(cache.get("a")).toBe(10);
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("c")).toBe(3);
    expect(evicted).toEqual(["b"]);
  });

  it("delete removes key and does not trigger eviction", () => {
    const evicted: string[] = [];
    const cache = new LRUCache<string, number>(2, (key) => { evicted.push(key); });

    cache.set("a", 1);
    cache.set("b", 2);
    cache.delete("a");

    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe(2);
    expect(evicted).toEqual([]);
  });

  it("has returns correct status", () => {
    const cache = new LRUCache<string, number>(3);
    cache.set("a", 1);
    expect(cache.has("a")).toBe(true);
    expect(cache.has("b")).toBe(false);
  });

  it("keys returns all keys", () => {
    const cache = new LRUCache<string, number>(3);
    cache.set("a", 1);
    cache.set("b", 2);
    expect(cache.keys()).toEqual(["a", "b"]);
  });

  it("size returns correct count", () => {
    const cache = new LRUCache<string, number>(3);
    expect(cache.size).toBe(0);
    cache.set("a", 1);
    expect(cache.size).toBe(1);
    cache.set("b", 2);
    expect(cache.size).toBe(2);
    cache.set("c", 3);
    expect(cache.size).toBe(3);
    cache.set("d", 4); // evicts a
    expect(cache.size).toBe(3);
  });

  it("works with object values", () => {
    const cache = new LRUCache<string, { id: number }>(2);
    cache.set("x", { id: 1 });
    cache.set("y", { id: 2 });
    expect(cache.get("x")).toEqual({ id: 1 });
  });
});
