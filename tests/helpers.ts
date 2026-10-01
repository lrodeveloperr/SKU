import type { IdentifierCandidate, IdentifierStore, MatchStage } from "../app/domain/identifiers/lookup";
import { normalizeIdentifier, type IdentifierType } from "../app/domain/identifiers/normalize";

export interface Row {
  type: IdentifierType;
  value: string;
  variantId: string;
  handle?: string;
  inStock?: boolean;
}

/** In-memory store with the same stage semantics as the Prisma store. */
export class MemoryStore implements IdentifierStore {
  calls: Array<[MatchStage, string]> = [];
  constructor(private rows: Row[]) {}

  async find(stage: MatchStage, key: string, options: { excludeOutOfStock: boolean }): Promise<IdentifierCandidate[]> {
    this.calls.push([stage, key]);
    return this.rows
      .filter((r) => (options.excludeOutOfStock ? (r.inStock ?? true) : true))
      .filter((r) => normalizeIdentifier(r.value)[stage] === key)
      .map((r) => ({
        type: r.type,
        variantId: r.variantId,
        variantLegacyId: r.variantId.replace(/\D/g, ""),
        productId: `p-${r.variantId}`,
        handle: r.handle ?? `handle-${r.variantId}`,
        productTitle: `Product ${r.variantId}`,
        variantTitle: "Default",
        spaced: normalizeIdentifier(r.value).spaced,
        inStock: r.inStock ?? true,
      }));
  }
}
