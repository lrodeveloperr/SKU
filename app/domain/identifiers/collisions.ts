import { MIN_COMPACT_LENGTH, type IdentifierType } from "./normalize";

export interface IdentifierRow {
  type: IdentifierType;
  variantId: string;
  productId: string;
  original: string;
  spaced: string;
  compact: string;
}

export interface DuplicateGroup {
  /** Normalized value shared by several variants. */
  value: string;
  types: IdentifierType[];
  variantIds: string[];
  productIds: string[];
}

export interface AmbiguousAliasGroup {
  compact: string;
  /** Materially different identifiers that collapse to the same compact form. */
  values: string[];
  variantIds: string[];
}

export interface VariantIdentifiers {
  variantId: string;
  productId: string;
  sku: string | null;
  barcode: string | null;
}

export interface MissingIdentifiers {
  missingSku: string[];
  missingBarcode: string[];
}

/** Values that resolve to more than one variant, so lookups show a chooser. */
export function findDuplicates(rows: Iterable<IdentifierRow>): DuplicateGroup[] {
  const groups = new Map<string, { types: Set<IdentifierType>; variants: Set<string>; products: Set<string> }>();
  for (const r of rows) {
    const g = groups.get(r.spaced) ?? { types: new Set(), variants: new Set(), products: new Set() };
    g.types.add(r.type);
    g.variants.add(r.variantId);
    g.products.add(r.productId);
    groups.set(r.spaced, g);
  }
  const out: DuplicateGroup[] = [];
  for (const [value, g] of groups) {
    if (g.variants.size > 1) {
      out.push({
        value,
        types: [...g.types],
        variantIds: [...g.variants],
        productIds: [...g.products],
      });
    }
  }
  return out.sort((a, b) => b.variantIds.length - a.variantIds.length || a.value.localeCompare(b.value));
}

/** Compact aliases that would merge different identifiers, so they never auto-resolve. */
export function findAmbiguousAliases(rows: Iterable<IdentifierRow>): AmbiguousAliasGroup[] {
  const groups = new Map<string, { values: Set<string>; variants: Set<string> }>();
  for (const r of rows) {
    if (r.compact.length < MIN_COMPACT_LENGTH) continue;
    const g = groups.get(r.compact) ?? { values: new Set(), variants: new Set() };
    g.values.add(r.spaced);
    g.variants.add(r.variantId);
    groups.set(r.compact, g);
  }
  const out: AmbiguousAliasGroup[] = [];
  for (const [compact, g] of groups) {
    if (g.values.size > 1) {
      out.push({ compact, values: [...g.values].sort(), variantIds: [...g.variants] });
    }
  }
  return out.sort((a, b) => b.variantIds.length - a.variantIds.length || a.compact.localeCompare(b.compact));
}

export function findMissing(variants: Iterable<VariantIdentifiers>): MissingIdentifiers {
  const missingSku: string[] = [];
  const missingBarcode: string[] = [];
  for (const v of variants) {
    if (!v.sku) missingSku.push(v.variantId);
    if (!v.barcode) missingBarcode.push(v.variantId);
  }
  return { missingSku, missingBarcode };
}
