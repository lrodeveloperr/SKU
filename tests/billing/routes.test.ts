import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../app/db.server", () => ({ db: { catalogVariant: { count: vi.fn(async () => 12) } } }));
vi.mock("../../app/services/session.server", () => ({ requireShop: vi.fn() }));
vi.mock("../../app/services/billing.server", () => ({ refreshBilling: vi.fn() }));

import { requireShop } from "../../app/services/session.server";
import { refreshBilling } from "../../app/services/billing.server";
import { loader as billingLoader } from "../../app/routes/app.billing";
import { loader as selectionLoader } from "../../app/routes/app.billing.select";

const shop = { id: "s1", domain: "review.myshopify.com", plan: "development", billingStatus: "UNSELECTED", billingError: null, billingVerifiedAt: new Date(), billingPrice: null, billingCurrency: null, billingCancelAtPeriodEnd: false, billingPeriodEnd: null, billingPendingPlan: null };
const redirect = vi.fn((url: string) => new Response(null, { status: 302, headers: { Location: url } }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireShop).mockResolvedValue({ shop, session: { shop: shop.domain }, admin: {}, redirect } as never);
  vi.mocked(refreshBilling).mockResolvedValue(shop as never);
});

describe("authenticated billing routes", () => {
  it("does not grant a plan from forged return parameters", async () => {
    const result = await billingLoader({ request: new Request("https://app.test/app/billing?plan_handle=large-catalog&shop=evil.myshopify.com") } as never);
    expect(result.plan).toBeNull();
    expect(refreshBilling).toHaveBeenCalledWith(expect.anything(), shop, expect.anything(), { force: true });
  });

  it("redirects the authenticated shop through the Shopify framework", async () => {
    const response = await selectionLoader({ request: new Request("https://app.test/app/billing/select?shop=evil.myshopify.com") } as never);
    expect(response.headers.get("Location")).toBe("https://admin.shopify.com/store/review/charges/exact-search-guard/pricing_plans");
    expect(redirect).toHaveBeenCalledWith(expect.any(String), { target: "_top" });
  });

  it("rejects an unauthenticated direct billing request", async () => {
    const denied = new Response("Unauthorized", { status: 401 });
    vi.mocked(requireShop).mockRejectedValue(denied);
    await expect(selectionLoader({ request: new Request("https://app.test/app/billing/select") } as never)).rejects.toBe(denied);
    expect(redirect).not.toHaveBeenCalled();
  });
});
