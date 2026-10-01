import { Prisma, type PrismaClient, type Shop } from "@prisma/client";
import { adminQuery, type AdminClient } from "./admin.server";
import { invalidateShop } from "./cache.server";
import { deleteProductRows, replaceProduct } from "./catalog-store.server";
import { startCatalogImport } from "./catalog-import.server";
import {
  modelConfig,
  productFromGql,
  type GqlProduct,
  type GqlVariant,
  type ProductRecord,
} from "../domain/catalog/records";
import { PRODUCT_IDS_QUERY, productQuery } from "../domain/catalog/queries";

/** Above this many stale products a full re-import is cheaper than per-product fetches. */
const RECONCILE_REIMPORT_THRESHOLD = 2000;

// ---------------------------------------------------------------------------
// Webhook idempotency
// ---------------------------------------------------------------------------

/**
 * Claims a webhook delivery. Returns false for a duplicate that is running or
 * done; a previously failed delivery can be claimed again so Shopify's retry works.
 */
export async function claimWebhook(
  db: PrismaClient,
  shopId: string,
  webhookId: string,
  topic: string,
): Promise<boolean> {
  const key = `webhook:${webhookId}`;
  try {
    await db.syncJob.create({
      data: { shopId, type: "WEBHOOK", topic, idempotencyKey: key },
    });
    return true;
  } catch (err) {
    if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== "P2002") throw err;
    const reclaimed = await db.syncJob.updateMany({
      where: { idempotencyKey: key, status: "FAILED" },
      data: { status: "RUNNING", error: null, finishedAt: null },
    });
    return reclaimed.count === 1;
  }
}

export async function finishWebhook(db: PrismaClient, webhookId: string, error?: unknown) {
  await db.syncJob.updateMany({
    where: { idempotencyKey: `webhook:${webhookId}` },
    data: error
      ? { status: "FAILED", error: String(error instanceof Error ? error.message : error).slice(0, 500), finishedAt: new Date() }
      : { status: "DONE", finishedAt: new Date() },
  });
}

// ---------------------------------------------------------------------------
// Single-product sync
// ---------------------------------------------------------------------------

/** Fetches one product with all of its variants. Null when the product no longer exists. */
export async function fetchProduct(
  admin: AdminClient,
  shop: Shop,
  productId: string,
): Promise<ProductRecord | null> {
  const query = productQuery(modelConfig(shop));
  let product: GqlProduct | null = null;
  const variants: GqlVariant[] = [];
  let after: string | null = null;

  for (;;) {
    const data: any = await adminQuery(admin, query, { id: productId, after });
    if (!data.product) return null;
    product = data.product as GqlProduct;
    const page = (data.product.variants ?? {}) as { nodes?: GqlVariant[]; pageInfo?: { hasNextPage: boolean; endCursor: string } };
    variants.push(...(page.nodes ?? []));
    if (!page.pageInfo?.hasNextPage) break;
    after = page.pageInfo.endCursor;
  }
  return productFromGql(product, variants);
}

/** Re-reads one product from Shopify and makes the index match it. */
export async function syncProduct(
  db: PrismaClient,
  admin: AdminClient,
  shop: Shop,
  productId: string,
): Promise<void> {
  const product = await fetchProduct(admin, shop, productId);
  // Gone, or no longer active: nothing of it may stay searchable.
  if (!product || product.status !== "ACTIVE") {
    await db.$transaction((tx) => deleteProductRows(tx, shop.id, productId));
  } else {
    await replaceProduct(db, shop.id, product);
  }
  invalidateShop(shop.domain);
}

export async function removeProduct(db: PrismaClient, shop: Shop, productId: string): Promise<void> {
  await db.$transaction((tx) => deleteProductRows(tx, shop.id, productId));
  invalidateShop(shop.domain);
}

export interface ProductWebhookPayload {
  admin_graphql_api_id?: string;
  id?: number | string;
}

export function productGid(payload: ProductWebhookPayload): string | null {
  if (payload.admin_graphql_api_id) return payload.admin_graphql_api_id;
  if (payload.id !== undefined) return `gid://shopify/Product/${payload.id}`;
  return null;
}

export async function applyProductWebhook(
  db: PrismaClient,
  admin: AdminClient | undefined,
  shop: Shop,
  topic: string,
  payload: ProductWebhookPayload,
): Promise<void> {
  const id = productGid(payload);
  if (!id) throw new Error("Product webhook without an id");
  if (topic === "PRODUCTS_DELETE") {
    await removeProduct(db, shop, id);
    return;
  }
  if (!admin) throw new Error("No offline session available to fetch the product");
  await syncProduct(db, admin, shop, id);
}

// ---------------------------------------------------------------------------
// Reconciliation
// ---------------------------------------------------------------------------

export interface ReconcileStats {
  scanned: number;
  stale: number;
  orphaned: number;
  reimported: boolean;
}

export function diffCatalog(
  remote: Map<string, Date>,
  local: Map<string, Date>,
): { stale: string[]; orphaned: string[] } {
  const stale: string[] = [];
  for (const [id, updatedAt] of remote) {
    const have = local.get(id);
    if (!have || have < updatedAt) stale.push(id);
  }
  const orphaned = [...local.keys()].filter((id) => !remote.has(id));
  return { stale, orphaned };
}

/** Repairs missed webhooks by comparing Shopify's product update watermarks with the index. */
export async function reconcileShop(
  db: PrismaClient,
  admin: AdminClient,
  shop: Shop,
): Promise<ReconcileStats> {
  const job = await db.syncJob.create({ data: { shopId: shop.id, type: "RECONCILE" } });
  try {
    const remote = new Map<string, Date>();
    let after: string | null = null;
    for (;;) {
      const data: any = await adminQuery(admin, PRODUCT_IDS_QUERY, { after });
      for (const node of data.products.nodes as Array<{ id: string; updatedAt: string }>) {
        remote.set(node.id, new Date(node.updatedAt));
      }
      if (!data.products.pageInfo.hasNextPage) break;
      after = data.products.pageInfo.endCursor;
    }

    const rows = await db.catalogVariant.groupBy({
      by: ["productId"],
      where: { shopId: shop.id },
      _max: { productUpdatedAt: true },
    });
    const local = new Map(rows.map((r) => [r.productId, r._max.productUpdatedAt as Date]));
    const { stale, orphaned } = diffCatalog(remote, local);

    const stats: ReconcileStats = {
      scanned: remote.size,
      stale: stale.length,
      orphaned: orphaned.length,
      reimported: false,
    };

    if (stale.length > RECONCILE_REIMPORT_THRESHOLD) {
      await startCatalogImport(db, admin, shop);
      stats.reimported = true;
    } else {
      for (const id of stale) await syncProduct(db, admin, shop, id);
      for (const id of orphaned) await removeProduct(db, shop, id);
    }

    const now = new Date();
    await db.$transaction([
      db.syncJob.update({ where: { id: job.id }, data: { status: "DONE", finishedAt: now, stats: stats as unknown as Prisma.InputJsonValue } }),
      db.shop.update({ where: { id: shop.id }, data: { lastReconciledAt: now } }),
    ]);
    return stats;
  } catch (err) {
    await db.syncJob.update({
      where: { id: job.id },
      data: { status: "FAILED", error: String(err instanceof Error ? err.message : err).slice(0, 500), finishedAt: new Date() },
    });
    throw err;
  }
}
