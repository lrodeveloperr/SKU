import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";
import { MAX_QUERY_LENGTH } from "../domain/identifiers/normalize";
import { getShopConfig, lookupForShop, type LookupResponse } from "../services/lookup.server";
import { hashClient, lookupLimiter } from "../services/rate-limit.server";

// Shopify forwards /apps/exact-search/lookup to {app_proxy.url}/lookup.

function json(body: LookupResponse, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

const none = (reason: NonNullable<LookupResponse["reason"]>): Response =>
  json({ v: 1, status: "none", reason });

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Verifies Shopify's signature; rejects forged requests before anything else runs.
  const { session } = await authenticate.public.appProxy(request);

  // Fail open: every problem below tells the storefront to use native search.
  try {
    if (!session) return none("not_ready");

    const url = new URL(request.url);
    const query = url.searchParams.get("q") ?? "";
    if (query.trim().length === 0 || query.length > MAX_QUERY_LENGTH * 2) return none("ineligible");

    const client = hashClient(
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      process.env.IP_HASH_SECRET ?? "",
    );
    if (!lookupLimiter.allow(`${session.shop}:${client}`)) return none("rate_limited");

    const shop = await getShopConfig(db, session.shop);
    if (!shop) return none("not_ready");

    const response = await lookupForShop(db, shop, {
      query,
      preview: url.searchParams.get("preview") === "1",
    });
    return json(response);
  } catch {
    return none("error");
  }
};
