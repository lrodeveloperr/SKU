import { findPlan } from "./plans";

export const BILLING_GRACE_MS = 24 * 60 * 60_000;
export const BILLING_REFRESH_MS = 60_000;

export interface BillingState {
  plan: string;
  billingStatus: string;
  billingVerifiedAt: Date | null;
  billingCancelAtPeriodEnd: boolean;
  billingPeriodEnd: Date | null;
}

export function hasVerifiedPlan(shop: BillingState, now = Date.now()): boolean {
  return shop.billingStatus === "ACTIVE" && findPlan(shop.plan) !== null &&
    shop.billingVerifiedAt !== null && now - shop.billingVerifiedAt.getTime() < BILLING_GRACE_MS &&
    (!shop.billingCancelAtPeriodEnd || (shop.billingPeriodEnd !== null && shop.billingPeriodEnd.getTime() > now));
}

export function canServeCatalog(shop: BillingState, variants: number, now = Date.now()): boolean {
  const plan = findPlan(shop.plan);
  return hasVerifiedPlan(shop, now) && plan !== null && variants <= plan.maxVariants;
}

export function pricingPlansUrl(domain: string, appHandle: string): string {
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(domain) || !/^[a-z0-9][a-z0-9-]*$/.test(appHandle)) {
    throw new Error("Invalid Shopify pricing destination");
  }
  return `https://admin.shopify.com/store/${domain.slice(0, -14)}/charges/${appHandle}/pricing_plans`;
}

export interface SubscriptionItem {
  handle: string | null;
  price: { __typename: string; active: boolean; currency: string; amount?: string };
}

export interface ActiveSubscription {
  shop: { id: string; myshopifyDomain: string };
  billingPeriod: string;
  cancelAtEndOfCycle: boolean;
  trialEndsAt: string | null;
  currentBillingCycle: { endTime: string } | null;
  items: SubscriptionItem[];
  pendingUpdate: { items: SubscriptionItem[] } | null;
}

export function subscriptionPlan(items: SubscriptionItem[], includeScheduledPrices = false) {
  const plans = items.filter((item) => (includeScheduledPrices || item.price.active !== false) && item.price.__typename === "FlatRatePrice")
    .map((item) => ({ item, plan: findPlan(item.handle) })).filter((entry) => entry.plan !== null);
  if (plans.length !== 1) throw new Error("Unrecognized subscription plan");
  return plans[0]!;
}
