export type IdentifierType = "SKU" | "BARCODE" | "MODEL";

export interface NormalizedIdentifier {
  /** Value exactly as supplied. */
  original: string;
  /** Unicode NFKC and case-folded. */
  folded: string;
  /** `folded` with whitespace collapsed and trimmed. */
  spaced: string;
  /** `spaced` with separators removed; only ever used when it resolves uniquely. */
  compact: string;
}

/** Whitespace, ASCII and Unicode dashes, underscore, dot, slash, middle dot. */
const SEPARATORS = /[\s\-_./\\·‐-―−]+/gu;

/** Compact aliases shorter than this are too collision-prone to be useful. */
export const MIN_COMPACT_LENGTH = 3;

export const MAX_INDEXED_IDENTIFIER_LENGTH = 255;

export function normalizeIdentifier(raw: string): NormalizedIdentifier {
  const folded = raw.normalize("NFKC").toLowerCase();
  const spaced = folded.replace(/\s+/gu, " ").trim();
  const compact = spaced.replace(SEPARATORS, "");
  return { original: raw, folded, spaced, compact };
}

export const MAX_QUERY_LENGTH = 64;
const MAX_QUERY_TOKENS = 3;
const ALLOWED_QUERY = /^[\p{L}\p{N}\s\-_./\\#+:]+$/u;

export interface QueryClassification {
  /** Worth sending to the identifier lookup. */
  eligible: boolean;
  /** Looks like a code (contains a digit); used to keep analytics free of plain-language noise. */
  identifierShaped: boolean;
}

/**
 * Decides whether a storefront query is plausibly an identifier. Empty, long
 * and natural-language queries are never looked up.
 */
export function classifyQuery(query: string): QueryClassification {
  const no = { eligible: false, identifierShaped: false };
  const q = query.trim();
  if (q.length === 0 || q.length > MAX_QUERY_LENGTH) return no;
  if (!ALLOWED_QUERY.test(q)) return no;

  const tokens = q.split(/\s+/u);
  if (tokens.length > MAX_QUERY_TOKENS) return no;
  if (
    tokens.length > 1 &&
    !tokens.every((t) => /\d/u.test(t) || t.length <= 3)
  ) {
    return no;
  }
  return { eligible: true, identifierShaped: /\d/u.test(q) };
}

/** Trims, bounds and drops empty identifier values coming from Shopify. */
export function cleanIdentifierValue(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_INDEXED_IDENTIFIER_LENGTH) return null;
  return trimmed;
}
