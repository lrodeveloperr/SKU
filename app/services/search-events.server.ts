import type { PrismaClient, SearchOutcome } from "@prisma/client";

export interface SearchEventInput {
  shopId: string;
  outcome: SearchOutcome;
  identifierShaped: boolean;
  /** Raw query; discarded unless it is identifier-shaped. */
  query: string;
  stage?: string;
  reason?: string;
  productHandle?: string;
  matchCount?: number;
  latencyMs?: number;
}

/** Records a resolution event. Never throws: analytics must not affect search. */
export async function recordSearchEvent(db: PrismaClient, e: SearchEventInput): Promise<void> {
  try {
    await db.searchEvent.create({
      data: {
        shopId: e.shopId,
        outcome: e.outcome,
        identifierShaped: e.identifierShaped,
        // Plain-language queries are never retained.
        query: e.identifierShaped ? e.query.trim().slice(0, 64) : null,
        stage: e.stage,
        reason: e.reason,
        productHandle: e.productHandle,
        matchCount: e.matchCount ?? 0,
        latencyMs: e.latencyMs,
      },
    });
  } catch {
    // Intentionally swallowed.
  }
}

export const EVENT_RETENTION_DAYS = 90;

export async function purgeOldEvents(db: PrismaClient, now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - EVENT_RETENTION_DAYS * 86_400_000);
  const res = await db.searchEvent.deleteMany({ where: { createdAt: { lt: cutoff } } });
  return res.count;
}
