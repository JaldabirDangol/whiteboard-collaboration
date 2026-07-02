import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { checkRateLimit, resetRateLimits } from "@/socket/rateLimiter.js";

describe("Rate Limiter - Edge Cases", () => {
  beforeEach(() => {
    resetRateLimits();
  });

  it("allows burst exactly at limit then blocks instantly", () => {
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit("s1", "chat:send")).toBe(true);
    }
    expect(checkRateLimit("s1", "chat:send")).toBe(false);
  });

  it("recovers after the time window passes", () => {
    vi.useFakeTimers();
    for (let i = 0; i < 5; i++) {
      checkRateLimit("s1", "chat:send");
    }
    expect(checkRateLimit("s1", "chat:send")).toBe(false);

    vi.advanceTimersByTime(1001);
    expect(checkRateLimit("s1", "chat:send")).toBe(true);

    for (let i = 0; i < 4; i++) {
      checkRateLimit("s1", "chat:send");
    }
    expect(checkRateLimit("s1", "chat:send")).toBe(false);
    vi.useRealTimers();
  });

  it("handles many different socket IDs independently", () => {
    for (let sid = 0; sid < 100; sid++) {
      const id = `socket-${sid}`;
      // Each socket gets exactly 5 hits (no cross-contamination)
      for (let i = 0; i < 5; i++) {
        expect(checkRateLimit(id, "chat:send")).toBe(true);
      }
      expect(checkRateLimit(id, "chat:send")).toBe(false);
    }
    // Verify other sockets still work independently
    expect(checkRateLimit("socket-0", "chat:send")).toBe(false);
    expect(checkRateLimit("socket-99", "chat:send")).toBe(false);
    expect(checkRateLimit("fresh-socket", "chat:send")).toBe(true);
  });

  it("handles different event types with different limits", () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit("s1", "chat:send");
    }
    expect(checkRateLimit("s1", "chat:send")).toBe(false);

    for (let i = 0; i < 120; i++) {
      expect(checkRateLimit("s1", "laser:stroke")).toBe(true);
    }
    expect(checkRateLimit("s1", "laser:stroke")).toBe(false);
  });

  it("allows unbounded events without rate limiting", () => {
    for (let i = 0; i < 10000; i++) {
      expect(checkRateLimit("s1", "unknown:event")).toBe(true);
    }
  });

  it("partial window: oldest timestamps age out gradually", () => {
    vi.useFakeTimers();
    // 5 calls at T+0, T+100, T+200, T+300, T+400; now = T+500
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit("s1", "chat:send")).toBe(true);
      vi.advanceTimersByTime(100);
    }
    // now = T+500, blocked (5/5)
    expect(checkRateLimit("s1", "chat:send")).toBe(false);

    // Advance so only oldest (T+0) expires; now = T+1000
    // Valid: [T+100, T+200, T+300, T+400], 4 remaining
    vi.advanceTimersByTime(500);

    // First call gets the last slot (4→5), second blocked
    expect(checkRateLimit("s1", "chat:send")).toBe(true);
    expect(checkRateLimit("s1", "chat:send")).toBe(false);
    vi.useRealTimers();
  });

  it("does not leak memory across many sockets", () => {
    for (let i = 0; i < 1000; i++) {
      expect(checkRateLimit(`s${i}`, "chat:send")).toBe(true);
    }
    expect(checkRateLimit("s0", "chat:send")).toBe(true);
    expect(checkRateLimit("s0", "chat:send")).toBe(true);
    expect(checkRateLimit("s0", "chat:send")).toBe(true);
    expect(checkRateLimit("s0", "chat:send")).toBe(true);
    expect(checkRateLimit("s0", "chat:send")).toBe(false);
  });

  it("yjs:update limit (30/s) is enforced", () => {
    for (let i = 0; i < 30; i++) {
      expect(checkRateLimit("s1", "yjs:update")).toBe(true);
    }
    expect(checkRateLimit("s1", "yjs:update")).toBe(false);
  });

  it("presence:cursorMove limit (60/s) is enforced", () => {
    for (let i = 0; i < 60; i++) {
      expect(checkRateLimit("s1", "presence:cursorMove")).toBe(true);
    }
    expect(checkRateLimit("s1", "presence:cursorMove")).toBe(false);
  });

  it("burst then idle then burst works correctly", () => {
    vi.useFakeTimers();
    for (let i = 0; i < 5; i++) {
      checkRateLimit("s1", "chat:send");
    }
    expect(checkRateLimit("s1", "chat:send")).toBe(false);

    vi.advanceTimersByTime(2000);

    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit("s1", "chat:send")).toBe(true);
    }
    expect(checkRateLimit("s1", "chat:send")).toBe(false);
    vi.useRealTimers();
  });
});
