import { authenticate } from "../shopify.server";
import { db } from "../db.server";
import { ensureShop } from "./shops.server";
import { messages, toLocale } from "../i18n";
import { refreshBilling } from "./billing.server";

/** Authenticates the embedded admin request and loads this shop's record. */
export async function requireShop(request: Request) {
  const { session, admin, redirect } = await authenticate.admin(request);
  const shop = await refreshBilling(db, await ensureShop(db, session.shop), admin);
  const locale = toLocale(shop.locale);
  return { session, admin, redirect, shop, locale, t: messages[locale] };
}
