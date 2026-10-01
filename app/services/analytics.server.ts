import type { PrismaClient, SearchOutcome } from "@prisma/client";

export interface RecoveryAnalytics {
  days: number;
  /** Exact searches the app resolved (unique match or chooser). Not revenue. */
  recovered: number;
  matches: number;
  multiples: number;
  fallbacks: number;
  timeouts: number;
  errors: number;
  /** Identifier-shaped queries that found nothing and went to native search. */
  unresolved: number;
  topRecoveredProducts: Array<{ handle: string; count: number }>;
  topUnresolvedQueries: Array<{ query: string; count: number }>;
}

/** Resolution analytics. Counts events only; revenue attribution is out of scope for the MVP. */
export async function getRecoveryAnalytics(
  db: PrismaClient,
  shopId: string,
  days = 30,
  now = new Date(),
): Promise<RecoveryAnalytics> {
  const since = new Date(now.getTime() - days * 86_400_000);
  const where = { shopId, createdAt: { gte: since } };

  const [byOutcome, unresolved, products, queries] = await Promise.all([
    db.searchEvent.groupBy({ by: ["outcome"], where, _count: { _all: true } }),
    db.searchEvent.count({ where: { ...where, outcome: "FALLBACK", identifierShaped: true, reason: "not_found" } }),
    db.searchEvent.groupBy({
      by: ["productHandle"],
      where: { ...where, outcome: "MATCH", productHandle: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { productHandle: "desc" } },
      take: 10,
    }),
    db.searchEvent.groupBy({
      by: ["query"],
      where: { ...where, outcome: "FALLBACK", identifierShaped: true, query: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { query: "desc" } },
      take: 10,
    }),
  ]);

  const n = (o: SearchOutcome) => byOutcome.find((r) => r.outcome === o)?._count._all ?? 0;
  return {
    days,
    recovered: n("MATCH") + n("MULTIPLE"),
    matches: n("MATCH"),
    multiples: n("MULTIPLE"),
    fallbacks: n("FALLBACK"),
    timeouts: n("TIMEOUT"),
    errors: n("ERROR"),
    unresolved,
    topRecoveredProducts: products.map((p) => ({ handle: p.productHandle as string, count: p._count._all })),
    topUnresolvedQueries: queries.map((q) => ({ query: q.query as string, count: q._count._all })),
  };
}
