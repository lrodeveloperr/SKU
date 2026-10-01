import type { PrismaClient, Shop } from "@prisma/client";
import type { AdminClient } from "./admin.server";
import { startCatalogImport } from "./catalog-import.server";
import { requireShop } from "./session.server";
import { sessionStorage } from "../shopify.server";

function isForbiddenImportError(error?: string | null): boolean {
  if (!error) return false;
  const normalized = error.toLowerCase();
  return normalized.includes("403") || normalized.includes("forbidden");
}

function offlineSessionId(domain: string): string {
  return `offline_${domain}`;
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
): Promise<Awaited<ReturnType<typeof startCatalogImport>>> {
  const firstAttempt = await startCatalogImport(db, admin, shop);
  if (!("error" in firstAttempt) || !isForbiddenImportError(firstAttempt.error)) {
    return firstAttempt;
  }

  try {
    await sessionStorage.deleteSession(offlineSessionId(shop.domain));
    const refreshed = await requireShop(request);
    return await startCatalogImport(db, refreshed.admin, refreshed.shop);
  } catch {
    return firstAttempt;
  }
}
