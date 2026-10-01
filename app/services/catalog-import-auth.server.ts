import type { PrismaClient, Shop } from "@prisma/client";
import type { AdminClient } from "./admin.server";
import { startCatalogImport } from "./catalog-import.server";
import { requireShop } from "./session.server";
import { sessionStorage, unauthenticated } from "../shopify.server";

function isForbiddenImportError(error?: string | null): boolean {
  if (!error) return false;
  const normalized = error.toLowerCase();
  return normalized.includes("403") || normalized.includes("forbidden");
}

function offlineSessionId(domain: string): string {
  return `offline_${domain}`;
}

type OfflineAdminLoader = (domain: string) => Promise<AdminClient>;

async function defaultOfflineAdmin(domain: string): Promise<AdminClient> {
  const { admin } = await unauthenticated.admin(domain);
  return admin;
}

async function catalogAdmin(domain: string, fallback: AdminClient, loadOfflineAdmin: OfflineAdminLoader): Promise<AdminClient> {
  try {
    return await loadOfflineAdmin(domain);
  } catch {
    return fallback;
  }
}

async function persistForbiddenHint(db: PrismaClient, shopId: string, error: string) {
  const hint = `${error}. Product read access is still forbidden after refreshing the Shopify session. Reauthorize Exact Search Guard so Shopify grants read_products.`;
  await db.shop.update({
    where: { id: shopId },
    data: { syncState: "FAILED", syncError: hint.slice(0, 500) },
  });
  return { error: hint };
}

/**
 * Shopify can keep an offline session after an app-version scope change. Refresh
 * it once before surfacing a product-read 403 to the merchant.
 */
export async function startCatalogImportWithSessionRefresh(
  db: PrismaClient,
  request: Request,
  admin: AdminClient,
  shop: Shop,
  loadOfflineAdmin: OfflineAdminLoader = defaultOfflineAdmin,
): Promise<Awaited<ReturnType<typeof startCatalogImport>>> {
  const firstAdmin = await catalogAdmin(shop.domain, admin, loadOfflineAdmin);
  const firstAttempt = await startCatalogImport(db, firstAdmin, shop);
  if (!("error" in firstAttempt) || !isForbiddenImportError(firstAttempt.error)) {
    return firstAttempt;
  }

  try {
    await sessionStorage.deleteSession(offlineSessionId(shop.domain));
    const refreshed = await requireShop(request);
    const refreshedAdmin = await catalogAdmin(refreshed.shop.domain, refreshed.admin, loadOfflineAdmin);
    const secondAttempt = await startCatalogImport(db, refreshedAdmin, refreshed.shop);
    if ("error" in secondAttempt && isForbiddenImportError(secondAttempt.error)) {
      return persistForbiddenHint(db, refreshed.shop.id, secondAttempt.error);
    }
    return secondAttempt;
  } catch {
    return firstAttempt;
  }
}
