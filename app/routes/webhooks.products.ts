import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";
import { getShopByDomain } from "../services/shops.server";
import {
  applyProductWebhook,
  claimWebhook,
  finishWebhook,
  type ProductWebhookPayload,
} from "../services/catalog-sync.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop: domain, topic, payload, admin, webhookId } = await authenticate.webhook(request);

  const shop = await getShopByDomain(db, domain);
  if (!shop) return new Response();

  // Duplicate deliveries are acknowledged without reprocessing.
  if (!(await claimWebhook(db, shop.id, webhookId, topic))) return new Response();

  try {
    await applyProductWebhook(db, admin, shop, topic, payload as ProductWebhookPayload);
    await finishWebhook(db, webhookId);
    return new Response();
  } catch (err) {
    await finishWebhook(db, webhookId, err);
    // Non-2xx makes Shopify retry the same delivery.
    return new Response("Sync failed", { status: 500 });
  }
};
