import { describe, expect, it, vi } from "vitest";
import { readSubscription, refreshBilling } from "../../app/services/billing.server";

const config = { organizationId: "5223843", appId: "gid://shopify/App/430251048961", accessToken: "test-token" };
const id = "gid://shopify/Shop/123";
const domain = "review.myshopify.com";
const now = new Date("2026-10-15T20:00:00Z");
const item = (handle: string) => ({ handle, price: { __typename: "FlatRatePrice", active: true, currency: "USD", amount: "0.00" } });
const contract = { shop: { id, myshopifyDomain: domain }, billingPeriod: "EVERY_30_DAYS", items: [item("growth")], cancelAtEndOfCycle: false, trialEndsAt: null, currentBillingCycle: { endTime: "2026-11-15T20:00:00Z" }, pendingUpdate: null };
const response = (value: unknown) => vi.fn(async () => Response.json(value)) as unknown as typeof fetch;

function database(shopId = "billing-test") {
  let row = { id: shopId, domain, shopifyShopId: id, plan: "development", billingStatus: "UNSELECTED", billingVerifiedAt: null, billingError: null, billingCancelAtPeriodEnd: false, billingPeriodEnd: null };
  const update = vi.fn(async ({ data }: any) => { row = { ...row, ...data }; return row; });
  return { db: { shop: { update } } as never, shop: row as never, update };
}

describe("Partner API subscription verification", () => {
  it("queries Shopify with the server credential and authenticated shop identity", async () => {
    const fetchImpl = response({ data: { activeSubscription: contract } });
    expect(await readSubscription(config, id, domain, fetchImpl)).toMatchObject({ items: [{ handle: "growth" }] });
    const [url, request] = vi.mocked(fetchImpl).mock.calls[0]!;
    expect(url).toBe("https://partners.shopify.com/5223843/api/2026-07/graphql.json");
    expect(JSON.parse(String(request?.body)).variables).toEqual({ appId: config.appId, shopId: id });
  });

  it.each([{ errors: [{ message: "denied" }] }, {}, { data: { activeSubscription: { ...contract, shop: { id, myshopifyDomain: "other.myshopify.com" } } } }])("rejects errors or an identity mismatch", async (body) => {
    await expect(readSubscription(config, id, domain, response(body))).rejects.toThrow();
  });

  it("persists only the verified active plan and a separate pending downgrade", async () => {
    const { db, shop, update } = database("verified");
    const scheduled = item("starter");
    scheduled.price.active = false;
    const value = { ...contract, pendingUpdate: { items: [scheduled] } };
    await refreshBilling(db, shop, undefined, { config, now, fetchImpl: response({ data: { activeSubscription: value } }) });
    expect(update).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ plan: "growth", billingPendingPlan: "starter", billingStatus: "ACTIVE", billingPrice: "0.00" }) }));
  });

  it("removes access when Shopify reports no contract", async () => {
    const { db, shop, update } = database("cancelled");
    await refreshBilling(db, shop, undefined, { config, now, fetchImpl: response({ data: { activeSubscription: null } }) });
    expect(update).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ billingStatus: "UNSELECTED", billingPendingPlan: null }) }));
  });

  it("retains the original verification timestamp on an outage", async () => {
    const { db, shop, update } = database("outage");
    await refreshBilling(db, shop, undefined, { config, now, fetchImpl: vi.fn(async () => { throw new Error("network"); }) });
    expect(update).toHaveBeenLastCalledWith({ where: { id: "outage" }, data: { billingError: "verification_unavailable" } });
  });

  it("coalesces parallel page loaders into one verification", async () => {
    const { db, shop } = database("parallel");
    const fetchImpl = response({ data: { activeSubscription: contract } });
    await Promise.all([refreshBilling(db, shop, undefined, { config, now, fetchImpl }), refreshBilling(db, shop, undefined, { config, now, fetchImpl })]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
