import type { CatalogVariant, PrismaClient, Shop } from "@prisma/client";
import {
  productPath,
  resolveIdentifier,
  type FindOptions,
  type IdentifierCandidate,
  type IdentifierStore,
  type MatchStage,
  type ResolvedMatch,
} from "../domain/identifiers/lookup";
import { classifyQuery, normalizeIdentifier, type IdentifierType } from "../domain/identifiers/normalize";
import { lookupCache, shopVersion, shopConfigCache } from "./cache.server";
import { recordSearchEvent } from "./search-events.server";

/** Server-side budget; the storefront script enforces its own 150 ms abort. */
export const LOOKUP_TIMEOUT_MS = 120;
const MAX_CANDIDATE_ROWS = 50;

type CatalogVariantFallbackRow = Pick<
  CatalogVariant,
  "id" | "legacyId" | "productId" | "handle" | "productTitle" | "variantTitle" | "sku" | "barcode" | "inStock"
>;

function identifierEquals(stage: MatchStage, key: string) {
  return stage === "original" ? { equals: key } : { equals: key, mode: "insensitive" as const };
}

export function candidatesFromCatalogVariants(
  rows: CatalogVariantFallbackRow[],
  stage: MatchStage,
  key: string,
): IdentifierCandidate[] {
  const candidates: IdentifierCandidate[] = [];

  for (const row of rows) {
    const identifiers: Array<[IdentifierType, string | null]> = [
      ["SKU", row.sku],
      ["BARCODE", row.barcode],
    ];

    for (const [type, value] of identifiers) {
      if (!value) continue;
      const normalized = normalizeIdentifier(value);
      if (normalized[stage] !== key) continue;

      candidates.push({
        type,
        variantId: row.id,
        variantLegacyId: row.legacyId,
        productId: row.productId,
        handle: row.handle,
        productTitle: row.productTitle,
        variantTitle: row.variantTitle,
        spaced: normalized.spaced,
        inStock: row.inStock,
      });
    }
  }

  return candidates;
}

export class PrismaIdentifierStore implements IdentifierStore {
  constructor(
    private db: PrismaClient,
    private shopId: string,
  ) {}

  async find(stage: MatchStage, key: string, options: FindOptions): Promise<IdentifierCandidate[]> {
    const rows = await this.db.identifierEntry.findMany({
      where: {
        shopId: this.shopId,
        [stage]: key,
        // Unpublished or inaccessible products are never returned.
        variant: { is: { published: true, ...(options.excludeOutOfStock ? { inStock: true } : {}) } },
      },
      include: { variant: true },
      take: MAX_CANDIDATE_ROWS,
    });
    if (rows.length > 0) {
      return rows.map((r) => ({
        type: r.type,
        variantId: r.variantId,
        variantLegacyId: r.variant.legacyId,
        productId: r.variant.productId,
        handle: r.variant.handle,
        productTitle: r.variant.productTitle,
        variantTitle: r.variant.variantTitle,
        spaced: r.spaced,
        inStock: r.variant.inStock,
      }));
    }

    if (stage === "compact") return [];

    const match = identifierEquals(stage, key);
    const variants = await this.db.catalogVariant.findMany({
      where: {
        shopId: this.shopId,
        published: true,
        ...(options.excludeOutOfStock ? { inStock: true } : {}),
        OR: [{ sku: match }, { barcode: match }],
      },
      select: {
        id: true,
        legacyId: true,
        productId: true,
        handle: true,
        productTitle: true,
        variantTitle: true,
        sku: true,
        barcode: true,
        inStock: true,
      },
      take: MAX_CANDIDATE_ROWS,
    });

    return candidatesFromCatalogVariants(variants, stage, key);
  }
}

// ---------------------------------------------------------------------------
// Public response (versioned; the storefront script depends on this shape)
// ---------------------------------------------------------------------------

export interface LookupMatchDto {
  url: string;
  title: string;
  variantTitle: string;
  identifierTypes: string[];
  inStock: boolean;
}

export type LookupReason =
  | "not_found"
  | "ambiguous_alias"
  | "ineligible"
  | "disabled"
  | "test_mode"
  | "not_ready"
  | "rate_limited"
  | "timeout"
  | "error";

export interface LookupResponse {
  v: 1;
  status: "match" | "multiple" | "none";
  reason?: LookupReason;
  matches?: LookupMatchDto[];
  truncated?: boolean;
  /** Present when the shop warns about sold-out variants. */
  warnOutOfStock?: boolean;
}

const none = (reason: LookupReason): LookupResponse => ({ v: 1, status: "none", reason });

function toDto(m: ResolvedMatch): LookupMatchDto {
  return {
    url: productPath(m.handle, m.variantLegacyId),
    title: m.productTitle,
    variantTitle: m.variantTitle,
    identifierTypes: m.types,
    inStock: m.inStock,
  };
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | "timeout"> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<"timeout">((resolve) => {
    timer = setTimeout(() => resolve("timeout"), ms);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer));
}

export interface LookupRequest {
  query: string;
  /** Test-mode shops only resolve requests that opt in with preview=1. */
  preview: boolean;
}

export interface ResolveOutcome {
  response: LookupResponse;
  stage?: MatchStage;
  handle?: string;
  identifierShaped: boolean;
  /** Whether this resolution should be recorded as a search event. */
  log: boolean;
}

/** Resolution of a query for a shop's configuration; no I/O beyond the store. */
export async function resolveForShop(
  store: IdentifierStore,
  shop: Pick<Shop, "enabled" | "mode" | "syncState" | "outOfStockMode">,
  req: LookupRequest,
): Promise<ResolveOutcome> {
  const klass = classifyQuery(req.query);
  const base = { identifierShaped: klass.identifierShaped, log: false };

  if (!shop.enabled) return { response: none("disabled"), ...base };
  if (shop.mode === "TEST" && !req.preview) return { response: none("test_mode"), ...base };
  if (shop.syncState !== "READY") return { response: none("not_ready"), ...base };
  if (!klass.eligible) return { response: none("ineligible"), ...base };

  const result = await resolveIdentifier(store, req.query, {
    excludeOutOfStock: shop.outOfStockMode === "EXCLUDE",
  });

  if (result.status === "none") {
    return { response: none(result.reason), identifierShaped: klass.identifierShaped, log: true };
  }
  const warn = shop.outOfStockMode === "WARN";
  const response: LookupResponse = {
    v: 1,
    status: result.status,
    matches: result.matches.map(toDto),
    ...(result.status === "multiple" && result.truncated ? { truncated: true } : {}),
    ...(warn && result.matches.some((m) => !m.inStock) ? { warnOutOfStock: true } : {}),
  };
  return {
    response,
    stage: result.stage,
    handle: result.status === "match" ? result.matches[0].handle : undefined,
    identifierShaped: klass.identifierShaped,
    log: true,
  };
}

/** Looks up a query for a shop with caching, a strict timeout, and fail-open results. */
export async function lookupForShop(
  db: PrismaClient,
  shop: Shop,
  req: LookupRequest,
  options: { timeoutMs?: number; now?: () => number } = {},
): Promise<LookupResponse> {
  const timeoutMs = options.timeoutMs ?? LOOKUP_TIMEOUT_MS;
  const now = options.now ?? Date.now;
  const started = now();
  const klass = classifyQuery(req.query);

  const record = (outcome: ResolveOutcome) => {
    if (!outcome.log) return;
    const { response } = outcome;
    void recordSearchEvent(db, {
      shopId: shop.id,
      outcome: response.status === "match" ? "MATCH" : response.status === "multiple" ? "MULTIPLE" : "FALLBACK",
      identifierShaped: outcome.identifierShaped,
      query: req.query,
      stage: outcome.stage,
      reason: response.reason,
      productHandle: outcome.handle,
      matchCount: response.matches?.length ?? 0,
      latencyMs: now() - started,
    });
  };

  // Cached hits are still counted, so analytics reflect every recovered search.
  const cacheKey = `${shop.domain}\u0000${shopVersion(shop.domain)}\u0000${req.preview ? 1 : 0}\u0000${req.query}`;
  const cached = lookupCache.get(cacheKey) as ResolveOutcome | undefined;
  if (cached) {
    record(cached);
    return cached.response;
  }

  const failure = (outcome: "TIMEOUT" | "ERROR", reason: LookupReason): LookupResponse => {
    void recordSearchEvent(db, {
      shopId: shop.id,
      outcome,
      identifierShaped: klass.identifierShaped,
      query: req.query,
      latencyMs: now() - started,
    });
    return none(reason);
  };

  try {
    const outcome = await withTimeout(
      resolveForShop(new PrismaIdentifierStore(db, shop.id), shop, req),
      timeoutMs,
    );
    if (outcome === "timeout") return failure("TIMEOUT", "timeout");
    record(outcome);
    lookupCache.set(cacheKey, outcome);
    return outcome.response;
  } catch {
    return failure("ERROR", "error");
  }
}

/** Loads a shop's config, cached briefly because every lookup needs it. */
export async function getShopConfig(db: PrismaClient, domain: string): Promise<Shop | null> {
  const hit = shopConfigCache.get(domain) as Shop | null | undefined;
  if (hit !== undefined) return hit;
  const shop = await db.shop.findUnique({ where: { domain } });
  shopConfigCache.set(domain, shop);
  return shop;
}
