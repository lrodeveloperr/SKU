import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";
import { completeBulkImport } from "../services/catalog-import.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { payload, admin } = await authenticate.webhook(request);
  const p = payload as { admin_graphql_api_id?: string; type?: string };

  if (admin && p.admin_graphql_api_id && p.type === "query") {
    // Unknown or already-finished operations are ignored inside.
    await completeBulkImport(db, admin, p.admin_graphql_api_id);
  }
  return new Response();
};
