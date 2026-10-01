import { cleanIdentifierValue, normalizeIdentifier, type IdentifierType } from "../identifiers/normalize";

export interface VariantRecord {
  id: string;
  legacyId: string;
  title: string;
  sku: string | null;
  barcode: string | null;
  model: string | null;
  inStock: boolean;
}

export interface ProductRecord {
  id: string;
  handle: string;
  title: string;
  status: string;
  /** Visible on the Online Store. */
  published: boolean;
  updatedAt: Date;
  variants: VariantRecord[];
}

export interface VariantRow {
  id: string;
  legacyId: string;
  productId: string;
  handle: string;
  productTitle: string;
  variantTitle: string;
  sku: string | null;
  barcode: string | null;
  published: boolean;
  inStock: boolean;
  productUpdatedAt: Date;
}

export interface EntryRow {
  type: IdentifierType;
  variantId: string;
  original: string;
  folded: string;
  spaced: string;
  compact: string;
}

/** Only active products are indexed; archived and draft products are never searchable. */
export function isIndexable(product: ProductRecord): boolean {
  return product.status === "ACTIVE";
}

export function toVariantRows(product: ProductRecord): VariantRow[] {
  return product.variants.map((v) => ({
    id: v.id,
    legacyId: v.legacyId,
    productId: product.id,
    handle: product.handle,
    productTitle: product.title,
    variantTitle: v.title,
    sku: cleanIdentifierValue(v.sku),
    barcode: cleanIdentifierValue(v.barcode),
    published: product.published,
    inStock: v.inStock,
    productUpdatedAt: product.updatedAt,
  }));
}

export function toEntryRows(product: ProductRecord): EntryRow[] {
  const rows: EntryRow[] = [];
  for (const v of product.variants) {
    const values: Array<[IdentifierType, string | null]> = [
      ["SKU", cleanIdentifierValue(v.sku)],
      ["BARCODE", cleanIdentifierValue(v.barcode)],
      ["MODEL", cleanIdentifierValue(v.model)],
    ];
    for (const [type, value] of values) {
      if (value === null) continue;
      const n = normalizeIdentifier(value);
      if (n.spaced.length === 0) continue;
      rows.push({ type, variantId: v.id, ...n });
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// GraphQL shapes
// ---------------------------------------------------------------------------

export interface GqlVariant {
  id: string;
  legacyResourceId: string | number;
  title: string;
  sku?: string | null;
  barcode?: string | null;
  availableForSale?: boolean | null;
  inventoryQuantity?: number | null;
  inventoryPolicy?: string | null;
  variantModel?: { value: string } | null;
}

export interface GqlProduct {
  id: string;
  handle: string;
  title: string;
  status: string;
  onlineStoreUrl?: string | null;
  updatedAt: string;
  productModel?: { value: string } | null;
  variants?: { nodes?: GqlVariant[] } | null;
}

export function variantFromGql(v: GqlVariant, productModel: string | null): VariantRecord {
  const inStock = v.availableForSale ?? ((v.inventoryQuantity ?? 0) > 0 || v.inventoryPolicy === "CONTINUE");
  return {
    id: v.id,
    legacyId: String(v.legacyResourceId),
    title: v.title,
    sku: v.sku ?? null,
    barcode: v.barcode ?? null,
    model: v.variantModel?.value ?? productModel,
    inStock,
  };
}

export function productFromGql(p: GqlProduct, variants: GqlVariant[]): ProductRecord {
  const productModel = p.productModel?.value ?? null;
  return {
    id: p.id,
    handle: p.handle,
    title: p.title,
    status: p.status,
    published: Boolean(p.onlineStoreUrl),
    updatedAt: new Date(p.updatedAt),
    variants: variants.map((v) => variantFromGql(v, productModel)),
  };
}

export function modelConfig(shop: {
  modelMetafieldNamespace: string | null;
  modelMetafieldKey: string | null;
}): { namespace: string; key: string } | null {
  return shop.modelMetafieldNamespace && shop.modelMetafieldKey
    ? { namespace: shop.modelMetafieldNamespace, key: shop.modelMetafieldKey }
    : null;
}
