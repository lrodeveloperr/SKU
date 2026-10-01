import type { OutOfStockMode, PrismaClient, Shop, ShopMode } from "@prisma/client";
import { invalidateShop } from "./cache.server";

export async function ensureShop(db: PrismaClient, domain: string): Promise<Shop> {
  return db.shop.upsert({ where: { domain }, create: { domain }, update: {} });
}

export function getShopByDomain(db: PrismaClient, domain: string): Promise<Shop | null> {
  return db.shop.findUnique({ where: { domain } });
}

export interface ShopSettingsInput {
  mode?: ShopMode;
  enabled?: boolean;
  outOfStockMode?: OutOfStockMode;
  locale?: "en" | "es";
  /** Pass `null` to clear the configured model-number metafield. */
  modelMetafield?: { namespace: string; key: string } | null;
}

export interface SettingsResult {
  shop: Shop;
  /** The model metafield changed, so the index must be rebuilt. */
  needsReimport: boolean;
}

const METAFIELD_PART = /^[A-Za-z0-9_-]{2,64}$/;

export async function updateShopSettings(
  db: PrismaClient,
  shopId: string,
  input: ShopSettingsInput,
): Promise<SettingsResult> {
  const current = await db.shop.findUniqueOrThrow({ where: { id: shopId } });
  const data: Record<string, unknown> = {};
  if (input.mode) data.mode = input.mode;
  if (input.enabled !== undefined) data.enabled = input.enabled;
  if (input.outOfStockMode) data.outOfStockMode = input.outOfStockMode;
  if (input.locale) data.locale = input.locale;

  let needsReimport = false;
  if (input.modelMetafield !== undefined) {
    const next = input.modelMetafield;
    if (next && !(METAFIELD_PART.test(next.namespace) && METAFIELD_PART.test(next.key))) {
      throw new Error("Invalid metafield namespace or key");
    }
    const ns = next?.namespace ?? null;
    const key = next?.key ?? null;
    if (ns !== current.modelMetafieldNamespace || key !== current.modelMetafieldKey) {
      data.modelMetafieldNamespace = ns;
      data.modelMetafieldKey = key;
      needsReimport = true;
    }
  }

  const shop = await db.shop.update({ where: { id: shopId }, data });
  invalidateShop(shop.domain);
  return { shop, needsReimport };
}

export async function setEmbedActive(db: PrismaClient, shopId: string, active: boolean) {
  return db.shop.update({ where: { id: shopId }, data: { embedActive: active } });
}
