import { describe, expect, it } from "vitest";
import { findAmbiguousAliases, findDuplicates, findMissing, type IdentifierRow } from "../../app/domain/identifiers/collisions";
import { normalizeIdentifier } from "../../app/domain/identifiers/normalize";

const row = (value: string, variantId: string, type: IdentifierRow["type"] = "SKU"): IdentifierRow => {
  const n = normalizeIdentifier(value);
  return { type, variantId, productId: `p-${variantId}`, original: value, spaced: n.spaced, compact: n.compact };
};

describe("collisions", () => {
  it("finds values shared by several variants, including across casing", () => {
    const d = findDuplicates([row("AB-1", "v1"), row("ab-1", "v2"), row("OK-1", "v3")]);
    expect(d).toHaveLength(1);
    expect(d[0]?.variantIds.sort()).toEqual(["v1", "v2"]);
  });

  it("does not flag one variant holding the same value as SKU and barcode", () => {
    expect(findDuplicates([row("123456", "v1", "SKU"), row("123456", "v1", "BARCODE")])).toEqual([]);
  });

  it("finds compact aliases that merge different identifiers", () => {
    const a = findAmbiguousAliases([row("AB-123", "v1"), row("AB.123", "v2"), row("ZZ-9999", "v3")]);
    expect(a).toHaveLength(1);
    expect(a[0]?.values).toEqual(["ab-123", "ab.123"]);
  });

  it("ignores identical identifiers when judging alias ambiguity (that is a duplicate, not an alias clash)", () => {
    expect(findAmbiguousAliases([row("AB-1234", "v1"), row("AB-1234", "v2")])).toEqual([]);
  });

  it("lists variants missing SKU or barcode", () => {
    const m = findMissing([
      { variantId: "v1", productId: "p", sku: "a", barcode: null },
      { variantId: "v2", productId: "p", sku: null, barcode: "1" },
    ]);
    expect(m).toEqual({ missingSku: ["v2"], missingBarcode: ["v1"] });
  });
});
