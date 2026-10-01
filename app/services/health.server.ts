import type { PrismaClient } from "@prisma/client";
import { TtlCache } from "./cache.server";
import {
  findAmbiguousAliases,
  findDuplicates,
  findMissing,
  type AmbiguousAliasGroup,
  type DuplicateGroup,
} from "../domain/identifiers/collisions";

export interface VariantRef {
  variantId: string;
  productId: string;
  handle: string;
  title: string;
  variantTitle: string;
}

export interface IdentifierHealth {
  indexedVariants: number;
  indexedProducts: number;
  counts: {
    duplicates: number;
    ambiguousAliases: number;
    missingSku: number;
    missingBarcode: number;
  };
  duplicates: Array<DuplicateGroup & { variants: VariantRef[] }>;
  ambiguousAliases: AmbiguousAliasGroup[];
  missingSku: VariantRef[];
  missingBarcode: VariantRef[];
}

const TABLE_LIMIT = 25;

// The audit scans every identifier row, so overview and health pages share a short-lived copy.
const healthCache = new TtlCache<IdentifierHealth>(60_000, 200);

export async function getIdentifierHealthCached(db: PrismaClient, shopId: string): Promise<IdentifierHealth> {
  const hit = healthCache.get(shopId);
  if (hit) return hit;
  const fresh = await getIdentifierHealth(db, shopId);
  healthCache.set(shopId, fresh);
  return fresh;
}

export function invalidateHealth(shopId: string): void {
  healthCache.deleteWhere((k) => k === shopId);
}

/** Product-data audit shown on the Identifier health screen. */
export async function getIdentifierHealth(db: PrismaClient, shopId: string): Promise<IdentifierHealth> {
  const [variants, entries] = await Promise.all([
    db.catalogVariant.findMany({
      where: { shopId },
      select: {
        id: true,
        productId: true,
        handle: true,
        productTitle: true,
        variantTitle: true,
        sku: true,
        barcode: true,
      },
    }),
    db.identifierEntry.findMany({
      where: { shopId },
      select: { type: true, variantId: true, original: true, spaced: true, compact: true, variant: { select: { productId: true } } },
    }),
  ]);

  const byId = new Map(variants.map((v) => [v.id, v]));
  const ref = (id: string): VariantRef => {
    const v = byId.get(id);
    return {
      variantId: id,
      productId: v?.productId ?? "",
      handle: v?.handle ?? "",
      title: v?.productTitle ?? "",
      variantTitle: v?.variantTitle ?? "",
    };
  };

  const rows = entries.map((e) => ({
    type: e.type,
    variantId: e.variantId,
    productId: e.variant.productId,
    original: e.original,
    spaced: e.spaced,
    compact: e.compact,
  }));

  const duplicates = findDuplicates(rows);
  const ambiguous = findAmbiguousAliases(rows);
  const missing = findMissing(variants.map((v) => ({ variantId: v.id, productId: v.productId, sku: v.sku, barcode: v.barcode })));

  return {
    indexedVariants: variants.length,
    indexedProducts: new Set(variants.map((v) => v.productId)).size,
    counts: {
      duplicates: duplicates.length,
      ambiguousAliases: ambiguous.length,
      missingSku: missing.missingSku.length,
      missingBarcode: missing.missingBarcode.length,
    },
    duplicates: duplicates.slice(0, TABLE_LIMIT).map((d) => ({ ...d, variants: d.variantIds.map(ref) })),
    ambiguousAliases: ambiguous.slice(0, TABLE_LIMIT),
    missingSku: missing.missingSku.slice(0, TABLE_LIMIT).map(ref),
    missingBarcode: missing.missingBarcode.slice(0, TABLE_LIMIT).map(ref),
  };
}
