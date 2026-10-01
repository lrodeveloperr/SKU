import { describe, expect, it } from "vitest";
import { MAX_CHOOSER_MATCHES, productPath, resolveIdentifier } from "../../app/domain/identifiers/lookup";
import { MemoryStore, type Row } from "../helpers";

const opts = { excludeOutOfStock: false };
const sku = (value: string, variantId: string, extra: Partial<Row> = {}): Row => ({ type: "SKU", value, variantId, ...extra });

describe("resolveIdentifier", () => {
  it("returns a unique exact match at the strictest stage", async () => {
    const store = new MemoryStore([sku("AB-123", "v1")]);
    const r = await resolveIdentifier(store, "AB-123", opts);
    expect(r).toMatchObject({ status: "match", stage: "original" });
  });

  it("an exact match outranks a normalized match for a different variant", async () => {
    const store = new MemoryStore([sku("AB-123", "v1"), sku("ab123", "v2")]);
    const r = await resolveIdentifier(store, "AB-123", opts);
    expect(r.status).toBe("match");
    if (r.status === "match") expect(r.matches[0].variantId).toBe("v1");
  });

  it("matches case-insensitively and ignores surrounding whitespace", async () => {
    const store = new MemoryStore([sku("AB-123", "v1")]);
    expect((await resolveIdentifier(store, "ab-123", opts)).status).toBe("match");
    expect((await resolveIdentifier(store, "  AB-123  ", opts)).status).toBe("match");
  });

  it("resolves a compact alias only when it is unique", async () => {
    const store = new MemoryStore([sku("AB-123", "v1")]);
    const r = await resolveIdentifier(store, "ab 123", opts);
    // "ab 123" is not a spaced match for "ab-123", so it falls to compact.
    expect(r).toMatchObject({ status: "match", stage: "compact" });
  });

  it("never merges materially different identifiers through the compact alias", async () => {
    const store = new MemoryStore([sku("AB-123", "v1"), sku("AB.123", "v2")]);
    const r = await resolveIdentifier(store, "AB 123", opts);
    expect(r).toEqual({ status: "none", reason: "ambiguous_alias" });
  });

  it("returns multiple for a duplicated identifier and never picks one", async () => {
    const store = new MemoryStore([sku("DUP-1", "v1"), sku("DUP-1", "v2")]);
    const r = await resolveIdentifier(store, "DUP-1", opts);
    expect(r.status).toBe("multiple");
    if (r.status === "multiple") expect(r.matches.map((m) => m.variantId).sort()).toEqual(["v1", "v2"]);
  });

  it("collapses SKU and barcode hits on the same variant into one match", async () => {
    const store = new MemoryStore([sku("12345678", "v1"), { type: "BARCODE", value: "12345678", variantId: "v1" }]);
    const r = await resolveIdentifier(store, "12345678", opts);
    expect(r.status).toBe("match");
    if (r.status === "match") expect(r.matches[0].types.sort()).toEqual(["BARCODE", "SKU"]);
  });

  it("returns none for unknown identifiers and for empty input", async () => {
    const store = new MemoryStore([sku("AB-123", "v1")]);
    expect(await resolveIdentifier(store, "ZZ-999", opts)).toEqual({ status: "none", reason: "not_found" });
    expect(await resolveIdentifier(store, "   ", opts)).toEqual({ status: "none", reason: "not_found" });
  });

  it("skips the compact stage for very short aliases", async () => {
    const store = new MemoryStore([sku("A-1", "v1")]);
    expect((await resolveIdentifier(store, "A 1", opts)).status).toBe("none");
    expect(store.calls.some(([s]) => s === "compact")).toBe(false);
  });

  it("does not repeat identical queries across stages", async () => {
    const store = new MemoryStore([]);
    await resolveIdentifier(store, "abc123", opts);
    // original, folded and spaced all share a key here; only distinct keys are queried.
    expect(store.calls.length).toBeLessThanOrEqual(4);
  });

  it("excludes out-of-stock variants before judging uniqueness", async () => {
    const store = new MemoryStore([sku("DUP-1", "v1", { inStock: false }), sku("DUP-1", "v2")]);
    expect((await resolveIdentifier(store, "DUP-1", { excludeOutOfStock: true })).status).toBe("match");
    expect((await resolveIdentifier(store, "DUP-1", { excludeOutOfStock: false })).status).toBe("multiple");
  });

  it("caps the chooser and reports truncation", async () => {
    const rows = Array.from({ length: MAX_CHOOSER_MATCHES + 5 }, (_, i) => sku("BULK-1", `v${i}`));
    const r = await resolveIdentifier(new MemoryStore(rows), "BULK-1", opts);
    expect(r.status).toBe("multiple");
    if (r.status === "multiple") {
      expect(r.matches).toHaveLength(MAX_CHOOSER_MATCHES);
      expect(r.truncated).toBe(true);
    }
  });
});

describe("productPath", () => {
  it("builds a handle and variant URL and encodes unsafe characters", () => {
    expect(productPath("example-handle", "123456789")).toBe("/products/example-handle?variant=123456789");
    expect(productPath("a b/c", "1")).toBe("/products/a%20b%2Fc?variant=1");
  });
});
