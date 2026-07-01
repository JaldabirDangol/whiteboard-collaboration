import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { checkRateLimit } from "@/socket/rateLimiter.js";

describe("Rate Limiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests under the limit", () => {
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit("socket1", "chat:send")).toBe(true);
    }
  });

  it("blocks requests over the limit", () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit("socket1", "chat:send");
    }
    expect(checkRateLimit("socket1", "chat:send")).toBe(false);
  });

  it("allows different socket IDs independently", () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit("socketA", "chat:send");
    }
    expect(checkRateLimit("socketB", "chat:send")).toBe(true);
  });

  it("allows different events independently", () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit("socket1", "chat:send");
    }
    expect(checkRateLimit("socket1", "chat:delete")).toBe(true);
    expect(checkRateLimit("socket1", "chat:send")).toBe(false);
  });

  it("sliding window: allows requests after window passes", () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit("socket1", "chat:send");
    }
    expect(checkRateLimit("socket1", "chat:send")).toBe(false);

    vi.advanceTimersByTime(1001);
    expect(checkRateLimit("socket1", "chat:send")).toBe(true);
  });

  it("allows unknown events without rate limiting", () => {
    for (let i = 0; i < 100; i++) {
      expect(checkRateLimit("socket1", "unknown:event")).toBe(true);
    }
  });

  it("resets after enough time for all timestamps to expire", () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit("socket1", "chat:send");
    }
    expect(checkRateLimit("socket1", "chat:send")).toBe(false);

    vi.advanceTimersByTime(2000);
    expect(checkRateLimit("socket1", "chat:send")).toBe(true);
  });

  it("applies correct limits per event type", () => {
    // laser:stroke has limit 120
    for (let i = 0; i < 120; i++) {
      expect(checkRateLimit("socket1", "laser:stroke")).toBe(true);
    }
    expect(checkRateLimit("socket1", "laser:stroke")).toBe(false);
  });
});
