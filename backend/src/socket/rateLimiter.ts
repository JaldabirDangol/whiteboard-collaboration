type RateLimitEntry = {
  timestamps: number[];
};

type RateLimitConfig = {
  windowMs: number;
  maxRequests: number;
};

const defaults: Record<string, RateLimitConfig> = {
  "yjs:update": { windowMs: 1000, maxRequests: 30 },
  "laser:stroke": { windowMs: 1000, maxRequests: 120 },
  "presence:cursorMove": { windowMs: 1000, maxRequests: 60 },
  "chat:send": { windowMs: 1000, maxRequests: 5 },
  "chat:delete": { windowMs: 1000, maxRequests: 5 },
  "comment:add": { windowMs: 1000, maxRequests: 5 },
  "comment:delete": { windowMs: 1000, maxRequests: 5 },
  "board:undo": { windowMs: 1000, maxRequests: 5 },
  "board:redo": { windowMs: 1000, maxRequests: 5 },
};

const entries = new Map<string, RateLimitEntry>();

const key = (socketId: string, event: string) => `${socketId}:${event}`;

export const checkRateLimit = (socketId: string, event: string): boolean => {
  const config = defaults[event];
  if (!config) return true;

  const now = Date.now();
  const k = key(socketId, event);
  let entry = entries.get(k);

  if (!entry) {
    entry = { timestamps: [] };
    entries.set(k, entry);
  }

  // Purge timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => now - t < config.windowMs);

  if (entry.timestamps.length >= config.maxRequests) {
    return false;
  }

  entry.timestamps.push(now);
  return true;
};

// Cleanup stale entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [k, entry] of entries) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < 5000);
    if (entry.timestamps.length === 0) {
      entries.delete(k);
    }
  }
}, 30_000);
