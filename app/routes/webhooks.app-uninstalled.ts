import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";
import { deleteShopData } from "../services/jobs.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop } = await authenticate.webhook(request);
  // Revokes active state and deletes the merchant's data; the shop falls back to native search.
  await deleteShopData(db, shop);
  return new Response();
};
