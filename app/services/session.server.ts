import { authenticate } from "../shopify.server";
import { db } from "../db.server";
import { ensureShop } from "./shops.server";
import { messages, toLocale } from "../i18n";

/** Authenticates the embedded admin request and loads this shop's record. */
export async function requireShop(request: Request) {
  const { session, admin } = await authenticate.admin(request);
  const shop = await ensureShop(db, session.shop);
  const locale = toLocale(shop.locale);
  return { session, admin, shop, locale, t: messages[locale] };
}
