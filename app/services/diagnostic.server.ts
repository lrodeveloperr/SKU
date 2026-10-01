import type { PrismaClient, Shop } from "@prisma/client";
import type { MatchStage } from "../domain/identifiers/lookup";
import { classifyQuery, normalizeIdentifier } from "../domain/identifiers/normalize";
import { PrismaIdentifierStore, resolveForShop, type LookupResponse } from "./lookup.server";

export type ShopperExperience = "off" | "test" | "not_ready" | "live";

export interface Diagnostic {
  query: string;
  eligible: boolean;
  normalized: ReturnType<typeof normalizeIdentifier>;
  stage?: MatchStage;
  /** The storefront response a preview session would receive. */
  response: LookupResponse;
  experience: ShopperExperience;
}

export function shopperExperience(shop: Pick<Shop, "enabled" | "mode" | "syncState">): ShopperExperience {
  if (!shop.enabled) return "off";
  if (shop.syncState !== "READY") return "not_ready";
  return shop.mode === "TEST" ? "test" : "live";
}

/** Runs the real lookup for a query regardless of test mode, and explains the outcome. */
export async function diagnoseQuery(db: PrismaClient, shop: Shop, query: string): Promise<Diagnostic> {
  const klass = classifyQuery(query);
  // Same engine the storefront uses, with test mode and sync state out of the way.
  const { response, stage } = await resolveForShop(
    new PrismaIdentifierStore(db, shop.id),
    { ...shop, mode: "LIVE", enabled: true, syncState: "READY" },
    { query, preview: true },
  );
  return {
    query,
    eligible: klass.eligible,
    normalized: normalizeIdentifier(query),
    stage,
    response,
    experience: shopperExperience(shop),
  };
}
