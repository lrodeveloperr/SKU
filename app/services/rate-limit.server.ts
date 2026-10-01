import { createHmac } from "node:crypto";

/**
 * Fixed-window limiter per shop and client. The client IP is only ever held as
 * a keyed hash that rotates daily, so raw addresses are never stored.
 */
export class RateLimiter {
  private windows = new Map<string, { start: number; count: number }>();

  constructor(
    private limit: number,
    private windowMs: number,
    private maxKeys = 50_000,
  ) {}

  allow(key: string, now = Date.now()): boolean {
    const w = this.windows.get(key);
    if (!w || now - w.start >= this.windowMs) {
      if (this.windows.size >= this.maxKeys) this.prune(now);
      this.windows.set(key, { start: now, count: 1 });
      return true;
    }
    w.count += 1;
    return w.count <= this.limit;
  }

  private prune(now: number) {
    for (const [k, w] of this.windows) if (now - w.start >= this.windowMs) this.windows.delete(k);
    if (this.windows.size >= this.maxKeys) this.windows.clear();
  }
}

export function hashClient(ip: string | null, secret: string, now = new Date()): string {
  const day = now.toISOString().slice(0, 10);
  return createHmac("sha256", `${secret}:${day}`).update(ip ?? "unknown").digest("hex").slice(0, 16);
}

/** 60 lookups per minute per client per shop. */
export const lookupLimiter = new RateLimiter(60, 60_000);
