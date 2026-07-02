import { bench, describe } from "vitest";
import { LRUCache } from "@/utils/lru-cache.js";

describe("LRU Cache Performance Benchmarks", () => {
  bench("set 1000 items (capacity 100)", () => {
    const cache = new LRUCache<number, number>(100);
    for (let i = 0; i < 1000; i++) {
      cache.set(i, i);
    }
  });

  bench("get hit ratio 80% (capacity 100, 1000 ops)", () => {
    const cache = new LRUCache<number, number>(100);
    for (let i = 0; i < 100; i++) {
      cache.set(i, i);
    }
    for (let i = 0; i < 1000; i++) {
      cache.get(i % 125); // 80% hit rate (100/125)
    }
  });

  bench("get miss ratio 100% (capacity 100, 1000 ops)", () => {
    const cache = new LRUCache<number, number>(100);
    for (let i = 0; i < 100; i++) {
      cache.set(i, i);
    }
    for (let i = 0; i < 1000; i++) {
      cache.get(i + 1000); // always miss
    }
  });

  bench("mixed set/delete (capacity 100, 1000 ops)", () => {
    const cache = new LRUCache<number, number>(100);
    for (let i = 0; i < 1000; i++) {
      cache.set(i, i);
      if (i % 3 === 0) {
        cache.delete(i - 2);
      }
    }
  });

  bench("sequential access pattern (capacity 50, 5000 ops)", () => {
    const cache = new LRUCache<number, number>(50);
    for (let i = 0; i < 5000; i++) {
      cache.set(i, i);
      cache.get(i - 1);
      cache.get(i - 2);
    }
  });
});
