import type { Prisma, PrismaClient } from "@prisma/client";
import { isIndexable, toEntryRows, toVariantRows, type ProductRecord } from "../domain/catalog/records";

type Tx = Prisma.TransactionClient | PrismaClient;

const CHUNK = 2000;

function* chunks<T>(items: T[], size = CHUNK): Generator<T[]> {
  for (let i = 0; i < items.length; i += size) yield items.slice(i, i + size);
}

/** Inserts variants and identifier rows for the given products. Non-indexable products are skipped. */
export async function insertProducts(
  tx: Tx,
  shopId: string,
  products: ProductRecord[],
  syncedAt: Date,
): Promise<{ variants: number; entries: number }> {
  const variants = [];
  const entries = [];
  for (const product of products) {
    if (!isIndexable(product)) continue;
    variants.push(...toVariantRows(product).map((v) => ({ ...v, shopId, syncedAt })));
    entries.push(...toEntryRows(product).map((e) => ({ ...e, shopId })));
  }
  for (const part of chunks(variants)) await tx.catalogVariant.createMany({ data: part });
  for (const part of chunks(entries)) await tx.identifierEntry.createMany({ data: part });
  return { variants: variants.length, entries: entries.length };
}

/** Removes every variant (and, by cascade, identifier row) of one product. */
export async function deleteProductRows(tx: Tx, shopId: string, productId: string): Promise<void> {
  await tx.catalogVariant.deleteMany({ where: { shopId, productId } });
}

/**
 * Replaces one product's rows atomically. Returns false when the stored copy
 * is already newer, so reordered or replayed deliveries cannot roll data back.
 */
export async function replaceProduct(
  db: PrismaClient,
  shopId: string,
  product: ProductRecord,
): Promise<boolean> {
  return db.$transaction(async (tx) => {
    const existing = await tx.catalogVariant.findFirst({
      where: { shopId, productId: product.id },
      select: { productUpdatedAt: true },
    });
    if (existing && existing.productUpdatedAt > product.updatedAt) return false;
    await deleteProductRows(tx, shopId, product.id);
    await insertProducts(tx, shopId, [product], new Date());
    return true;
  });
}
