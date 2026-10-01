import { beforeEach, describe, expect, it, vi } from "vitest";
import { lookupForShop, resolveForShop } from "../../app/services/lookup.server";
import { lookupCache, shopConfigCache, invalidateShop } from "../../app/services/cache.server";
import { RateLimiter, hashClient } from "../../app/services/rate-limit.server";
import { MemoryStore } from "../helpers";

const shop = { enabled: true, mode: "LIVE", syncState: "READY", outOfStockMode: "SHOW" } as const;
const store = () => new MemoryStore([{ type: "SKU", value: "AB-123", variantId: "v1", handle: "widget" }]);

describe("resolveForShop", () => {
  it("returns a versioned match with a variant URL", async () => {
    const { response, handle } = await resolveForShop(store(), shop, { query: "ab-123", preview: false });
    expect(response).toMatchObject({
      v: 1,
      status: "match",
      matches: [{ url: "/products/widget?variant=1", identifierTypes: ["SKU"] }],
    });
    expect(handle).toBe("widget");
  });

  it("fails open when disabled, not ready, ineligible or in test mode without preview", async () => {
    const q = { query: "AB-123", preview: false };
    expect((await resolveForShop(store(), { ...shop, enabled: false }, q)).response.reason).toBe("disabled");
    expect((await resolveForShop(store(), { ...shop, syncState: "IMPORTING" }, q)).response.reason).toBe("not_ready");
    expect((await resolveForShop(store(), { ...shop, mode: "TEST" }, q)).response.reason).toBe("test_mode");
    expect((await resolveForShop(store(), shop, { query: "find me a red shirt please", preview: false })).response.reason).toBe("ineligible");
  });

  it("test mode resolves when the request opts into preview", async () => {
    const r = await resolveForShop(store(), { ...shop, mode: "TEST" }, { query: "AB-123", preview: true });
    expect(r.response.status).toBe("match");
  });

  it("flags sold-out matches when warning and hides them when excluding", async () => {
    const oos = new MemoryStore([{ type: "SKU", value: "AB-123", variantId: "v1", inStock: false }]);
    const warn = await resolveForShop(oos, { ...shop, outOfStockMode: "WARN" }, { query: "AB-123", preview: false });
    expect(warn.response.warnOutOfStock).toBe(true);
    const excl = await resolveForShop(oos, { ...shop, outOfStockMode: "EXCLUDE" }, { query: "AB-123", preview: false });
    expect(excl.response.status).toBe("none");
  });

  it("only logs searches that reached the engine", async () => {
    expect((await resolveForShop(store(), { ...shop, enabled: false }, { query: "AB-123", preview: false })).log).toBe(false);
    expect((await resolveForShop(store(), shop, { query: "ZZ-9", preview: false })).log).toBe(true);
  });
});

function fakeDb(findMany: () => Promise<unknown[]>) {
  const events: any[] = [];
  return {
    events,
    db: {
      identifierEntry: { findMany },
      searchEvent: { create: async ({ data }: any) => void events.push(data) },
    } as never,
  };
}

const row = {
  type: "SKU", variantId: "v1", spaced: "ab-123",
  variant: { legacyId: "1", productId: "p1", handle: "widget", productTitle: "Widget", variantTitle: "Default", inStock: true },
};
const shopRow = { id: "s1", domain: "t.myshopify.com", enabled: true, mode: "LIVE", syncState: "READY", outOfStockMode: "SHOW" } as never;

describe("lookupForShop", () => {
  beforeEach(() => {
    lookupCache.clear();
    shopConfigCache.clear();
  });

  it("times out to a fail-open response and records the timeout", async () => {
    const { db, events } = fakeDb(() => new Promise(() => {})); // never resolves
    const r = await lookupForShop(db, shopRow, { query: "AB-123", preview: false }, { timeoutMs: 10 });
    expect(r).toEqual({ v: 1, status: "none", reason: "timeout" });
    await new Promise((r) => setTimeout(r, 0));
    expect(events[0]).toMatchObject({ outcome: "TIMEOUT" });
  });

  it("turns backend errors into native-search fallbacks", async () => {
    const { db, events } = fakeDb(async () => { throw new Error("db down"); });
    const r = await lookupForShop(db, shopRow, { query: "AB-123", preview: false });
    expect(r).toEqual({ v: 1, status: "none", reason: "error" });
    await new Promise((r) => setTimeout(r, 0));
    expect(events[0]).toMatchObject({ outcome: "ERROR" });
  });

  it("caches outcomes, still counts every hit, and drops the cache on invalidation", async () => {
    const findMany = vi.fn(async () => [row]);
    const { db, events } = fakeDb(findMany);
    const req = { query: "AB-123", preview: false };

    expect((await lookupForShop(db, shopRow, req)).status).toBe("match");
    const callsAfterFirst = findMany.mock.calls.length;
    expect((await lookupForShop(db, shopRow, req)).status).toBe("match");
    expect(findMany.mock.calls.length).toBe(callsAfterFirst); // served from cache
    await new Promise((r) => setTimeout(r, 0));
    expect(events.filter((e) => e.outcome === "MATCH")).toHaveLength(2);

    invalidateShop("t.myshopify.com");
    await lookupForShop(db, shopRow, req);
    expect(findMany.mock.calls.length).toBeGreaterThan(callsAfterFirst);
  });

  it("stores the query only when it looks like an identifier", async () => {
    const { db, events } = fakeDb(async () => []);
    await lookupForShop(db, shopRow, { query: "shoes", preview: false });
    await lookupForShop(db, shopRow, { query: "ZZ-999", preview: false });
    await new Promise((r) => setTimeout(r, 0));
    expect(events.map((e) => e.query)).toEqual([null, "ZZ-999"]);
  });
});

describe("rate limiting", () => {
  it("allows up to the limit per window, then resets", () => {
    const l = new RateLimiter(2, 1000);
    expect([l.allow("k", 0), l.allow("k", 1), l.allow("k", 2)]).toEqual([true, true, false]);
    expect(l.allow("k", 1001)).toBe(true);
    expect(l.allow("other", 2)).toBe(true);
  });

  it("hashes client IPs without exposing them and rotates daily", () => {
    const a = hashClient("203.0.113.9", "s", new Date("2026-10-01T00:00:00Z"));
    expect(a).not.toContain("203");
    expect(a).toBe(hashClient("203.0.113.9", "s", new Date("2026-10-01T23:00:00Z")));
    expect(a).not.toBe(hashClient("203.0.113.9", "s", new Date("2026-10-02T00:00:00Z")));
  });
});
