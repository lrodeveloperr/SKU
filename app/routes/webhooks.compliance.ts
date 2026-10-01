import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";
import { deleteShopData } from "../services/jobs.server";

// Mandatory privacy webhooks. The app stores no customer data, so only
// shop/redact has work to do (anything left after uninstall is removed).
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);
  if (topic === "SHOP_REDACT") await deleteShopData(db, shop);
  return new Response();
};
