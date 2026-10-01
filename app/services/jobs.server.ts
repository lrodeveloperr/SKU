import type { PrismaClient } from "@prisma/client";
import type { AdminClient } from "./admin.server";
import { completeBulkImport, startCatalogImport } from "./catalog-import.server";
import { reconcileShop } from "./catalog-sync.server";
import { invalidateShop } from "./cache.server";
import { purgeOldEvents } from "./search-events.server";

const STUCK_IMPORT_MS = 10 * 60_000;
const WEBHOOK_JOB_RETENTION_MS = 7 * 86_400_000;

export interface NightlyReport {
  shops: number;
  reconciled: number;
  importsRestarted: number;
  importsPolled: number;
  failures: Array<{ shop: string; error: string }>;
  eventsPurged: number;
}

/**
 * Nightly maintenance: poll imports whose finish webhook never arrived,
 * restart failed imports, reconcile ready shops, and purge old data.
 * `getAdmin` returns an offline admin client for a shop domain.
 */
export async function runNightlyJobs(
  db: PrismaClient,
  getAdmin: (domain: string) => Promise<AdminClient>,
  now = new Date(),
): Promise<NightlyReport> {
  const report: NightlyReport = {
    shops: 0,
    reconciled: 0,
    importsRestarted: 0,
    importsPolled: 0,
    failures: [],
    eventsPurged: 0,
  };

  const shops = await db.shop.findMany();
  report.shops = shops.length;

  for (const shop of shops) {
    try {
      const admin = await getAdmin(shop.domain);

      const stuck = await db.syncJob.findMany({
        where: {
          shopId: shop.id,
          type: "INITIAL_IMPORT",
          status: "RUNNING",
          bulkOperationId: { not: null },
          startedAt: { lt: new Date(now.getTime() - STUCK_IMPORT_MS) },
        },
      });
      for (const job of stuck) {
        await completeBulkImport(db, admin, job.bulkOperationId as string);
        report.importsPolled += 1;
      }

      const current = await db.shop.findUniqueOrThrow({ where: { id: shop.id } });
      if (current.syncState === "PENDING" || current.syncState === "FAILED") {
        await startCatalogImport(db, admin, current);
        report.importsRestarted += 1;
      } else if (current.syncState === "READY") {
        await reconcileShop(db, admin, current);
        report.reconciled += 1;
      }
    } catch (err) {
      report.failures.push({ shop: shop.domain, error: err instanceof Error ? err.message : String(err) });
    }
  }

  report.eventsPurged = await purgeOldEvents(db, now);
  await db.syncJob.deleteMany({
    where: {
      type: "WEBHOOK",
      status: "DONE",
      finishedAt: { lt: new Date(now.getTime() - WEBHOOK_JOB_RETENTION_MS) },
    },
  });
  return report;
}

/** Removes every trace of a shop. Rows cascade from the shop record. */
export async function deleteShopData(db: PrismaClient, domain: string): Promise<void> {
  await db.shop.deleteMany({ where: { domain } });
  await db.session.deleteMany({ where: { shop: domain } });
  invalidateShop(domain);
}
