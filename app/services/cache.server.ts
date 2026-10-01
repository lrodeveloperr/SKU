/**
 * Tiny in-process TTL caches for the hot lookup path. Only shop configuration
 * and recent lookups are cached; each shop has a version that sync work bumps
 * so cached lookups never outlive an index change.
 */
interface Entry<V> {
  value: V;
  expires: number;
}

class TtlCache<V> {
  private map = new Map<string, Entry<V>>();
  constructor(
    private ttlMs: number,
    private maxEntries: number,
  ) {}

  get(key: string, now = Date.now()): V | undefined {
    const hit = this.map.get(key);
    if (!hit) return undefined;
    if (hit.expires <= now) {
      this.map.delete(key);
      return undefined;
    }
    return hit.value;
  }

  set(key: string, value: V, now = Date.now()): void {
    if (this.map.size >= this.maxEntries) {
      // Maps iterate in insertion order, so this evicts the oldest entry.
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
    this.map.set(key, { value, expires: now + this.ttlMs });
  }

  deleteWhere(predicate: (key: string) => boolean): void {
    for (const key of this.map.keys()) if (predicate(key)) this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }
}

export const shopConfigCache = new TtlCache<unknown>(30_000, 1_000);
export const lookupCache = new TtlCache<unknown>(30_000, 20_000);

const versions = new Map<string, number>();
export const shopVersion = (domain: string) => versions.get(domain) ?? 0;

/** Drops cached config and lookups for a shop; call after any index or settings change. */
export function invalidateShop(domain: string): void {
  versions.set(domain, shopVersion(domain) + 1);
  shopConfigCache.deleteWhere((k) => k === domain);
  lookupCache.deleteWhere((k) => k.startsWith(`${domain}\u0000`));
}

export { TtlCache };
