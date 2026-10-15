import type { LoaderFunctionArgs } from "react-router";
import { pricingPlansUrl } from "../domain/billing";
import { requireShop } from "../services/session.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, redirect } = await requireShop(request);
  return redirect(pricingPlansUrl(session.shop, process.env.SHOPIFY_APP_HANDLE || "exact-search-guard"), { target: "_top" });
};
