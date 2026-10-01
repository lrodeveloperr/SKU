import type { PrismaClient, Shop } from "@prisma/client";
import { adminQuery, errorMessage, type AdminClient } from "./admin.server";
import { invalidateShop } from "./cache.server";
import { insertProducts } from "./catalog-store.server";
import {
  modelConfig,
  productFromGql,
  type ProductRecord,
} from "../domain/catalog/records";
import {
  PRODUCT_IDS_QUERY,
  BULK_OPERATION_QUERY,
  bulkProductsQuery,
  collectBulkProducts,
  productQuery,
  readLines,
  START_BULK_MUTATION,
} from "../domain/catalog/queries";

const IMPORT_TX_TIMEOUT_MS = 10 * 60_000;

function isBulkAccessDenied(err: unknown): boolean {
  const message = errorMessage(err);
  return message.includes("403") || message.toLowerCase().includes("forbidden");
}

async function fetchProductForImport(admin: AdminClient, shop: Shop, productId: string): Promise<ProductRecord | null> {
  const query = productQuery(modelConfig(shop));
  let product: any = null;
  const variants: any[] = [];
  let after: string | null = null;

  for (;;) {
    const data: any = await adminQuery(admin, query, { id: productId, after });
    if (!data.product) return null;
    product = data.product;
    const page: { nodes?: any[]; pageInfo?: { hasNextPage: boolean; endCursor: string } } = data.product.variants ?? {};
    variants.push(...(page.nodes ?? []));
    if (!page.pageInfo?.hasNextPage) break;
    after = page.pageInfo.endCursor;
  }
  return productFromGql(product, variants);
}

async function runPagedImport(db: PrismaClient, admin: AdminClient, shop: Shop, job: { id: string; startedAt: Date }) {
  const products: ProductRecord[] = [];
  let after: string | null = null;

  for (;;) {
    const data: any = await adminQuery(admin, PRODUCT_IDS_QUERY, { after });
    for (const node of data.products.nodes as Array<{ id: string }>) {
      const product = await fetchProductForImport(admin, shop, node.id);
      if (product) products.push(product);
    }
    if (!data.products.pageInfo.hasNextPage) break;
    after = data.products.pageInfo.endCursor;
  }

  const stats = await replaceCatalog(db, shop.id, products, job.startedAt);
  const now = new Date();
  await db.$transaction([
    db.syncJob.update({ where: { id: job.id }, data: { status: "DONE", finishedAt: now, stats } }),
    db.shop.update({
      where: { id: shop.id },
      data: { syncState: "READY", syncError: null, lastSyncedAt: now },
    }),
  ]);
  invalidateShop(shop.domain);
  return { jobId: job.id };
}

/** Starts the bulk export that seeds the index. Completion arrives via `bulk_operations/finish`. */
export async function startCatalogImport(
  db: PrismaClient,
  admin: AdminClient,
  shop: Shop,
): Promise<{ jobId: string } | { error: string }> {
  const job = await db.syncJob.create({
    data: { shopId: shop.id, type: "INITIAL_IMPORT", status: "RUNNING" },
  });
  try {
    const data = await adminQuery(admin, START_BULK_MUTATION, {
      query: bulkProductsQuery(modelConfig(shop)),
    });
    const result = data.bulkOperationRunQuery;
    if (result.userErrors?.length || !result.bulkOperation) {
      throw new Error(result.userErrors?.map((e: { message: string }) => e.message).join("; ") || "No bulk operation returned");
    }
    await db.syncJob.update({ where: { id: job.id }, data: { bulkOperationId: result.bulkOperation.id } });
    await db.shop.update({ where: { id: shop.id }, data: { syncState: "IMPORTING", syncError: null } });
    return { jobId: job.id };
  } catch (err) {
    if (isBulkAccessDenied(err)) {
      try {
        return await runPagedImport(db, admin, shop, job);
      } catch (fallbackErr) {
        await failImport(db, shop.id, job.id, fallbackErr);
        return { error: errorMessage(fallbackErr) };
      }
    }
    await failImport(db, shop.id, job.id, err);
    return { error: errorMessage(err) };
  }
}

async function failImport(db: PrismaClient, shopId: string, jobId: string, err: unknown) {
  const message = errorMessage(err).slice(0, 500);
  await db.syncJob.update({
    where: { id: jobId },
    data: { status: "FAILED", error: message, finishedAt: new Date() },
  });
  // An index that is already serving stays READY; only a first import is marked failed.
  const shop = await db.shop.findUnique({ where: { id: shopId } });
  if (shop && shop.lastSyncedAt === null) {
    await db.shop.update({ where: { id: shopId }, data: { syncState: "FAILED", syncError: message } });
  } else if (shop) {
    await db.shop.update({ where: { id: shopId }, data: { syncError: message } });
  }
}

/**
 * Replaces the shop's index with a completed snapshot in one transaction.
 * Products that webhooks touched after the snapshot started are left alone,
 * so a stale export cannot overwrite fresher data.
 */
export async function replaceCatalog(
  db: PrismaClient,
  shopId: string,
  products: ProductRecord[],
  snapshotStartedAt: Date,
): Promise<{ variants: number; entries: number }> {
  return db.$transaction(
    async (tx) => {
      const fresh = await tx.catalogVariant.findMany({
        where: { shopId, syncedAt: { gte: snapshotStartedAt } },
        select: { productId: true },
        distinct: ["productId"],
      });
      const keep = new Set(fresh.map((v) => v.productId));
      await tx.catalogVariant.deleteMany({ where: { shopId, syncedAt: { lt: snapshotStartedAt } } });
      return insertProducts(
        tx,
        shopId,
        products.filter((p) => !keep.has(p.id)),
        new Date(),
      );
    },
    { timeout: IMPORT_TX_TIMEOUT_MS, maxWait: 30_000 },
  );
}

/** Handles `bulk_operations/finish`. Idempotent: a finished job is never processed twice. */
export async function completeBulkImport(
  db: PrismaClient,
  admin: AdminClient,
  bulkOperationId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<"ignored" | "pending" | "done" | "failed"> {
  const job = await db.syncJob.findFirst({ where: { bulkOperationId, type: "INITIAL_IMPORT" } });
  if (!job || job.status !== "RUNNING") return "ignored";

  const shop = await db.shop.findUnique({ where: { id: job.shopId } });
  if (!shop) return "ignored";

  try {
    const data = await adminQuery(admin, BULK_OPERATION_QUERY, { id: bulkOperationId });
    const op = data.node;
    if (op && (op.status === "CREATED" || op.status === "RUNNING")) return "pending";
    if (!op || op.status !== "COMPLETED") {
      throw new Error(`Bulk operation ${op?.status ?? "missing"}${op?.errorCode ? ` (${op.errorCode})` : ""}`);
    }

    let products: ProductRecord[] = [];
    // A null url means the export was empty (no active products).
    if (op.url) {
      const res = await fetchImpl(op.url);
      if (!res.ok || !res.body) throw new Error(`Bulk result download failed: ${res.status}`);
      const grouped = await collectBulkProducts(readLines(res.body));
      products = grouped.map((g) => productFromGql(g.product, g.variants));
    }

    const stats = await replaceCatalog(db, shop.id, products, job.startedAt);
    const now = new Date();
    await db.$transaction([
      db.syncJob.update({
        where: { id: job.id },
        data: { status: "DONE", finishedAt: now, stats },
      }),
      db.shop.update({
        where: { id: shop.id },
        data: { syncState: "READY", syncError: null, lastSyncedAt: now },
      }),
    ]);
    invalidateShop(shop.domain);
    return "done";
  } catch (err) {
    await failImport(db, shop.id, job.id, err);
    return "failed";
  }
}
