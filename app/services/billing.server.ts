import type { PrismaClient, Shop } from "@prisma/client";
import { BILLING_REFRESH_MS, subscriptionPlan, type ActiveSubscription } from "../domain/billing";
import { adminQuery, type AdminClient } from "./admin.server";
import { invalidateShop } from "./cache.server";

export const SHOP_ID_QUERY = `#graphql
  query BillingShopIdentity { shop { id myshopifyDomain } }
`;

export const ACTIVE_SUBSCRIPTION_QUERY = `#graphql
  query ExactSearchGuardSubscription($appId: ID!, $shopId: ID!) {
    activeSubscription(appId: $appId, shopId: $shopId) {
      shop { id myshopifyDomain }
      billingPeriod
      cancelAtEndOfCycle
      trialEndsAt
      currentBillingCycle { endTime }
      items { handle price { __typename active currency ... on FlatRatePrice { amount } } }
      pendingUpdate { items { handle price { __typename active currency ... on FlatRatePrice { amount } } } }
    }
  }
`;

export interface PartnerBillingConfig {
  organizationId: string;
  appId: string;
  accessToken: string;
}

export function billingConfig(): PartnerBillingConfig | null {
  const organizationId = process.env.SHOPIFY_PARTNER_ORGANIZATION_ID;
  const appId = process.env.SHOPIFY_PARTNER_APP_ID;
  const accessToken = process.env.SHOPIFY_PARTNER_ACCESS_TOKEN;
  if (!organizationId || !/^\d+$/.test(organizationId) || !appId || !/^gid:\/\/shopify\/App\/\d+$/.test(appId) || !accessToken) return null;
  return { organizationId, appId, accessToken };
}

export async function readSubscription(config: PartnerBillingConfig, shopId: string, domain: string, fetchImpl: typeof fetch = fetch) {
  const response = await fetchImpl(`https://partners.shopify.com/${config.organizationId}/api/2026-07/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": config.accessToken },
    body: JSON.stringify({ query: ACTIVE_SUBSCRIPTION_QUERY, variables: { appId: config.appId, shopId } }),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error("Subscription verification unavailable");
  const body = await response.json() as { errors?: unknown; data?: { activeSubscription?: ActiveSubscription | null } };
  if ((body.errors && (!Array.isArray(body.errors) || body.errors.length > 0)) || !body.data || !("activeSubscription" in body.data)) throw new Error("Subscription verification unavailable");
  const subscription = body.data.activeSubscription ?? null;
  if (subscription && (subscription.shop.id !== shopId || subscription.shop.myshopifyDomain !== domain)) {
    throw new Error("Subscription identity mismatch");
  }
  return subscription;
}

const inFlight = new Map<string, Promise<Shop>>();
const retryAfter = new Map<string, number>();
let partnerQueue: Promise<unknown> = Promise.resolve();
let nextPartnerCall = 0;

// Partner API allows four requests per second. Serialize starts across shops and coalesce each shop.
function partnerRequest<T>(run: () => Promise<T>): Promise<T> {
  const task = partnerQueue.then(async () => {
    const delay = Math.max(0, nextPartnerCall - Date.now());
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    nextPartnerCall = Date.now() + 300;
    return run();
  });
  partnerQueue = task.catch(() => undefined);
  return task;
}

export async function refreshBilling(
  db: PrismaClient, shop: Shop, admin?: AdminClient,
  options: { force?: boolean; config?: PartnerBillingConfig | null; fetchImpl?: typeof fetch; now?: Date } = {},
): Promise<Shop> {
  const now = options.now ?? new Date();
  if (!options.force && shop.billingVerifiedAt && now.getTime() - shop.billingVerifiedAt.getTime() < BILLING_REFRESH_MS) return shop;
  if (!options.force && (retryAfter.get(shop.id) ?? 0) > now.getTime()) return shop;
  const pending = inFlight.get(shop.id);
  if (pending) return pending;
  const task = (async () => {
    try {
      const config = options.config === undefined ? billingConfig() : options.config;
      if (!config) throw new Error("Billing configuration missing");
      let shopId = shop.shopifyShopId;
      if (!shopId) {
        if (!admin) throw new Error("Shop identity unavailable");
        const data = await adminQuery<{ shop: { id: string; myshopifyDomain: string } }>(admin, SHOP_ID_QUERY);
        if (data.shop.myshopifyDomain !== shop.domain || !/^gid:\/\/shopify\/Shop\/\d+$/.test(data.shop.id)) throw new Error("Shop identity mismatch");
        shopId = data.shop.id;
      }
      const contract = await partnerRequest(() => readSubscription(config, shopId!, shop.domain, options.fetchImpl));
      const selected = contract ? subscriptionPlan(contract.items) : null;
      const pendingPlan = contract?.pendingUpdate ? subscriptionPlan(contract.pendingUpdate.items, true).plan?.key ?? null : null;
      const saved = await db.shop.update({ where: { id: shop.id }, data: {
        shopifyShopId: shopId,
        plan: selected?.plan?.key ?? "development",
        billingStatus: selected ? "ACTIVE" : "UNSELECTED",
        billingVerifiedAt: now,
        billingPeriodEnd: contract?.currentBillingCycle?.endTime ? new Date(contract.currentBillingCycle.endTime) :
          contract?.trialEndsAt ? new Date(contract.trialEndsAt) : null,
        billingCancelAtPeriodEnd: contract?.cancelAtEndOfCycle ?? false,
        billingPendingPlan: pendingPlan,
        billingPrice: selected?.item.price.amount ?? null,
        billingCurrency: selected?.item.price.currency ?? null,
        billingError: null,
      } });
      retryAfter.delete(shop.id);
      invalidateShop(shop.domain);
      return saved;
    } catch {
      retryAfter.set(shop.id, now.getTime() + 30_000);
      // Retain only a previously verified entitlement, bounded by BILLING_GRACE_MS.
      return db.shop.update({ where: { id: shop.id }, data: { billingError: "verification_unavailable" } });
    }
  })();
  inFlight.set(shop.id, task);
  try { return await task; } finally { inFlight.delete(shop.id); }
}
