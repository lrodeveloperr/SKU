import { describe, expect, it } from "vitest";
import { BILLING_GRACE_MS, canServeCatalog, hasVerifiedPlan, pricingPlansUrl, subscriptionPlan } from "../../app/domain/billing";
import { findPlan } from "../../app/domain/plans";

const now = new Date("2026-10-15T20:00:00Z");
const active = { plan: "starter", billingStatus: "ACTIVE", billingVerifiedAt: now, billingCancelAtPeriodEnd: false, billingPeriodEnd: null };
const item = (handle: string, amount = "0.00") => ({ handle, price: { __typename: "FlatRatePrice", active: true, currency: "USD", amount } });

describe("Shopify App Pricing entitlements", () => {
  it("requires a verified contract even for the free plan", () => {
    expect(hasVerifiedPlan({ ...active, plan: "development", billingStatus: "UNSELECTED" }, +now)).toBe(false);
    expect(hasVerifiedPlan({ ...active, billingVerifiedAt: null }, +now)).toBe(false);
    expect(hasVerifiedPlan({ ...active, plan: "unknown" }, +now)).toBe(false);
  });

  it.each([["development", 100], ["starter", 5000], ["growth", 50000], ["large-catalog", 250000]])("enforces the %s catalog allowance", (plan, max) => {
    const shop = { ...active, plan: String(plan) };
    expect(canServeCatalog(shop, Number(max), +now)).toBe(true);
    expect(canServeCatalog(shop, Number(max) + 1, +now)).toBe(false);
  });

  it("bounds outage access and scheduled cancellation", () => {
    expect(hasVerifiedPlan(active, +now + BILLING_GRACE_MS - 1)).toBe(true);
    expect(hasVerifiedPlan(active, +now + BILLING_GRACE_MS)).toBe(false);
    expect(hasVerifiedPlan({ ...active, billingCancelAtPeriodEnd: true, billingPeriodEnd: new Date(+now + 1) }, +now)).toBe(true);
    expect(hasVerifiedPlan({ ...active, billingCancelAtPeriodEnd: true, billingPeriodEnd: now }, +now)).toBe(false);
  });

  it("recognizes the large-catalog handle and prior local alias", () => {
    expect(findPlan("large")?.key).toBe("large-catalog");
    expect(subscriptionPlan([item("large-catalog")]).plan?.maxVariants).toBe(250000);
  });

  it("recognizes a no-charge development-store contract by handle, not amount", () => {
    expect(subscriptionPlan([item("growth", "0.00")]).plan?.key).toBe("growth");
    expect(() => subscriptionPlan([item("unrecognized", "39.00")])).toThrow();
    expect(() => subscriptionPlan([item("starter"), item("growth")])).toThrow();
  });

  it("builds only the authenticated shop's Shopify pricing URL", () => {
    expect(pricingPlansUrl("demo-store.myshopify.com", "exact-search-guard")).toBe("https://admin.shopify.com/store/demo-store/charges/exact-search-guard/pricing_plans");
    expect(() => pricingPlansUrl("evil.example", "exact-search-guard")).toThrow();
    expect(() => pricingPlansUrl("demo.myshopify.com", "../other")).toThrow();
  });
});
