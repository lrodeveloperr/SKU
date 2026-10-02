import {
  MIN_COMPACT_LENGTH,
  normalizeIdentifier,
  type IdentifierType,
} from "./normalize";

export type MatchStage = "original" | "folded" | "spaced" | "compact";

export interface IdentifierCandidate {
  type: IdentifierType;
  variantId: string;
  variantLegacyId: string;
  productId: string;
  handle: string;
  productTitle: string;
  variantTitle: string;
  /** Normalized value of the matched identifier, used to detect ambiguous aliases. */
  spaced: string;
  inStock: boolean;
}

export interface FindOptions {
  excludeOutOfStock: boolean;
}

/**
 * Source of candidate rows. Implementations must only return published,
 * accessible products and may cap the number of rows returned.
 */
export interface IdentifierStore {
  find(stage: MatchStage, key: string, options: FindOptions): Promise<IdentifierCandidate[]>;
}

export interface ResolvedMatch extends Omit<IdentifierCandidate, "type"> {
  types: IdentifierType[];
}

export type LookupResult =
  | { status: "match"; stage: MatchStage; matches: [ResolvedMatch] }
  | { status: "multiple"; stage: MatchStage; matches: ResolvedMatch[]; truncated: boolean }
  | { status: "none"; reason: "not_found" | "ambiguous_alias" };

export const MAX_CHOOSER_MATCHES = 10;

function dedupeByVariant(rows: IdentifierCandidate[]): ResolvedMatch[] {
  const byVariant = new Map<string, ResolvedMatch>();
  for (const { type, ...rest } of rows) {
    const existing = byVariant.get(rest.variantId);
    if (existing) {
      if (!existing.types.includes(type)) existing.types.push(type);
    } else {
      byVariant.set(rest.variantId, { ...rest, types: [type] });
    }
  }
  return [...byVariant.values()];
}

/**
 * Resolves a query against the identifier index. Stages run from strictest to
 * loosest and the first stage with any hit decides the result, so an exact
 * match always outranks a normalized one. Never guesses: a compact alias that
 * could refer to materially different identifiers resolves to `none`.
 */
export async function resolveIdentifier(
  store: IdentifierStore,
  query: string,
  options: FindOptions,
): Promise<LookupResult> {
  const n = normalizeIdentifier(query);
  if (n.spaced.length === 0) return { status: "none", reason: "not_found" };

  const stages: Array<[MatchStage, string]> = [
    ["original", n.original],
    ["folded", n.folded],
    ["spaced", n.spaced],
  ];
  if (n.compact.length >= MIN_COMPACT_LENGTH) stages.push(["compact", n.compact]);

  const seen = new Set<string>();
  let ambiguous = false;

  for (const [stage, key] of stages) {
    // Stages can share the same key text while querying different index columns.
    const dedupeKey = `${stage}:${key}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const rows = await store.find(stage, key, options);
    if (rows.length === 0) continue;

    if (stage === "compact") {
      // Different underlying identifiers sharing a compact form must not be merged.
      const distinct = new Set(rows.map((r) => r.spaced));
      if (distinct.size > 1) {
        ambiguous = true;
        continue;
      }
    }

    const matches = dedupeByVariant(rows);
    const [only, ...rest] = matches;
    if (only && rest.length === 0) {
      return { status: "match", stage, matches: [only] };
    }
    return {
      status: "multiple",
      stage,
      matches: matches.slice(0, MAX_CHOOSER_MATCHES),
      truncated: matches.length > MAX_CHOOSER_MATCHES,
    };
  }

  return { status: "none", reason: ambiguous ? "ambiguous_alias" : "not_found" };
}

export function productPath(handle: string, variantLegacyId: string): string {
  return `/products/${encodeURIComponent(handle)}?variant=${encodeURIComponent(variantLegacyId)}`;
}
