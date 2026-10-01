import { useEffect } from "react";
import { useFetcher, useLoaderData, useRevalidator, useSearchParams, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { db } from "../db.server";
import { requireShop } from "../services/session.server";
import { completeBulkImport } from "../services/catalog-import.server";
import { getIdentifierHealthCached } from "../services/health.server";
import { getRecoveryAnalytics } from "../services/analytics.server";
import { startCatalogImportWithSessionRefresh } from "../services/catalog-import-auth.server";
import { getShopByDomain, setEmbedActive, updateShopSettings } from "../services/shops.server";
import { unauthenticated } from "../shopify.server";
import { fmt } from "../i18n";
import { useT } from "../i18n/use-t";
import { screenshotAnalytics, screenshotHealth, screenshotShop } from "../services/screenshot-fixtures.server";
import { isScreenshotMode } from "../services/screenshot-mode.server";
import { AppStorePreviewOverview, AppStorePreviewSetup } from "../app-store-preview-screens";

const EMBED_HANDLE = "exact-search-guard";
const SHOP_DOMAIN = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;
const APP_BRIDGE_RETRIES = 20;
const APP_BRIDGE_RETRY_MS = 250;

type AppExtension = { handle?: string; activations?: unknown[] };
type ShopifyBridge = { app?: { extensions?: () => Promise<AppExtension[]> } };

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shopifyBridge() {
  return (window as Window & { shopify?: ShopifyBridge }).shopify;
}

async function loadAppExtensions(isCancelled: () => boolean): Promise<AppExtension[] | null> {
  for (let attempt = 0; attempt < APP_BRIDGE_RETRIES; attempt += 1) {
    if (isCancelled()) return null;

    const app = shopifyBridge()?.app;
    if (typeof app?.extensions === "function") {
      try {
        return await app.extensions();
      } catch {
        // The bridge can be present before its extension API is ready.
      }
    }

    await delay(APP_BRIDGE_RETRY_MS);
  }

  return null;
}

async function safeFormData(request: Request): Promise<FormData> {
  try {
    return await request.formData();
  } catch {
    return new FormData();
  }
}

function actionValue(form: FormData, url: URL, name: string): string {
  return String(form.get(name) ?? url.searchParams.get(name) ?? "");
}

function domainFromAction(request: Request, form: FormData, url: URL): string {
  const fromForm = actionValue(form, url, "domain") || url.searchParams.get("shop") || "";
  if (SHOP_DOMAIN.test(fromForm)) return fromForm;
  const referer = request.headers.get("referer");
  if (!referer) return "";
  try {
    const fromReferer = new URL(referer).searchParams.get("shop") ?? "";
    return SHOP_DOMAIN.test(fromReferer) ? fromReferer : "";
  } catch {
    return "";
  }
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (isScreenshotMode()) {
    const analytics = screenshotAnalytics(365);
    return {
      screenshotMode: true,
      domain: screenshotShop.domain,
      apiKey: process.env.SHOPIFY_API_KEY || "",
      syncState: screenshotShop.syncState,
      syncError: screenshotShop.syncError,
      mode: screenshotShop.mode,
      enabled: screenshotShop.enabled,
      embedActive: screenshotShop.embedActive,
      indexed: screenshotHealth.indexedVariants,
      counts: screenshotHealth.counts,
      recovered: analytics.recovered,
      unresolved: analytics.unresolved,
    };
  }
  const { admin, shop } = await requireShop(request);
  let currentShop = shop;
  if (shop.syncState === "IMPORTING") {
    const runningImport = await db.syncJob.findFirst({
      where: { shopId: shop.id, type: "INITIAL_IMPORT", status: "RUNNING", bulkOperationId: { not: null } },
      orderBy: { startedAt: "desc" },
      select: { bulkOperationId: true },
    });
    if (runningImport?.bulkOperationId) {
      const result = await completeBulkImport(db, admin, runningImport.bulkOperationId);
      if (result === "done" || result === "failed") {
        currentShop = (await db.shop.findUnique({ where: { id: shop.id } })) ?? shop;
      }
    }
  }
  const ready = currentShop.syncState === "READY";
  const [health, analytics] = ready
    ? await Promise.all([getIdentifierHealthCached(db, currentShop.id), getRecoveryAnalytics(db, currentShop.id, 30)])
    : [null, null];
  return {
    screenshotMode: false,
    domain: currentShop.domain,
    apiKey: process.env.SHOPIFY_API_KEY || "",
    syncState: currentShop.syncState,
    syncError: currentShop.syncError,
    mode: currentShop.mode,
    enabled: currentShop.enabled,
    embedActive: currentShop.embedActive,
    indexed: health?.indexedVariants ?? 0,
    counts: health?.counts ?? null,
    recovered: analytics?.recovered ?? 0,
    unresolved: analytics?.unresolved ?? 0,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const url = new URL(request.url);
  const form = await safeFormData(request);
  const intent = actionValue(form, url, "intent");
  let context: Pick<Awaited<ReturnType<typeof requireShop>>, "admin" | "shop">;
  try {
    context = await requireShop(request);
  } catch (err) {
    const domain = domainFromAction(request, form, url);
    if (!domain) throw err;
    const shop = await getShopByDomain(db, domain);
    if (!shop) throw err;
    const { admin } = await unauthenticated.admin(domain);
    context = { admin, shop };
  }
  const { admin, shop } = context;
  switch (intent) {
    case "mode":
      await updateShopSettings(db, shop.id, { mode: actionValue(form, url, "mode") === "LIVE" ? "LIVE" : "TEST" });
      break;
    case "rebuild":
      await startCatalogImportWithSessionRefresh(db, request, admin, shop);
      break;
    case "embed":
      await setEmbedActive(db, shop.id, actionValue(form, url, "active") === "1");
      break;
  }
  return null;
};

function Step(props: { title: string; done: boolean; children: React.ReactNode }) {
  return (
    <s-section heading={props.title}>
      <s-stack gap="small-200">
        <s-badge tone={props.done ? "success" : "neutral"}>{props.done ? "✓" : "…"}</s-badge>
        {props.children}
      </s-stack>
    </s-section>
  );
}

export default function Overview() {
  const d = useLoaderData<typeof loader>();
  const { t } = useT();
  const fetcher = useFetcher();
  const revalidator = useRevalidator();
  const [params] = useSearchParams();

  // Poll while the first import runs.
  useEffect(() => {
    if (d.syncState !== "IMPORTING" && d.syncState !== "PENDING") return;
    const id = setInterval(() => revalidator.revalidate(), 5000);
    return () => clearInterval(id);
  }, [d.syncState, revalidator]);

  // The embedded app asks App Bridge whether the theme app embed is switched on.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await loadAppExtensions(() => cancelled);
      if (!list) return;

      const active = list.some((e) => e.handle === EMBED_HANDLE && (e.activations?.length ?? 0) > 0);
      if (!cancelled && active !== d.embedActive) {
        const nextActive = active ? "1" : "0";
        fetcher.submit(
          { intent: "embed", active: nextActive, domain: d.domain },
          {
            method: "post",
            action: `/app?index&intent=embed&active=${nextActive}&domain=${encodeURIComponent(d.domain)}`,
          },
        );
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.embedActive]);

  const editorUrl = `shopify://admin/themes/current/editor?context=apps&activateAppId=${d.apiKey}/${EMBED_HANDLE}`;
  const actionUrl = `/app?index&domain=${encodeURIComponent(d.domain)}`;
  const importDone = d.syncState === "READY";
  const live = d.mode === "LIVE";

  if (d.screenshotMode) {
    if (params.get("screen") === "setup") {
      return <AppStorePreviewSetup />;
    }
    return (
      <AppStorePreviewOverview
        indexed={d.indexed}
        counts={d.counts ?? { duplicates: 0, ambiguousAliases: 0, missingSku: 0, missingBarcode: 0 }}
        recovered={d.recovered}
        unresolved={d.unresolved}
        embedActive={d.embedActive}
      />
    );
  }

  return (
    <s-page heading={t.overview.title}>
      <s-section>
        <s-paragraph>{t.overview.intro}</s-paragraph>
      </s-section>

      <s-section heading={t.overview.setup} />

      <Step title={`1. ${t.overview.stepImport}`} done={importDone}>
        {importDone && <s-paragraph>{fmt(t.overview.stepImportDone, { count: d.indexed })}</s-paragraph>}
        {(d.syncState === "IMPORTING" || d.syncState === "PENDING") && <s-paragraph>{t.overview.stepImportPending}</s-paragraph>}
        {d.syncState === "FAILED" && <s-banner tone="critical">{fmt(t.overview.stepImportFailed, { error: d.syncError ?? "" })}</s-banner>}
        {(d.syncState === "FAILED" || importDone) && (
          <fetcher.Form method="post" action={`${actionUrl}&intent=rebuild`}>
            <input type="hidden" name="intent" value="rebuild" />
            <input type="hidden" name="domain" value={d.domain} />
            <s-button type="submit">{t.overview.rebuild}</s-button>
          </fetcher.Form>
        )}
      </Step>

      <Step title={`2. ${t.overview.stepReview}`} done={Boolean(d.counts && d.counts.duplicates + d.counts.ambiguousAliases + d.counts.missingSku === 0)}>
        {d.counts && (
          <s-paragraph>
            {fmt(t.overview.stepReviewBody, { dups: d.counts.duplicates, ambiguous: d.counts.ambiguousAliases, missingSku: d.counts.missingSku })}
          </s-paragraph>
        )}
        <s-link href="/app/health">{t.overview.openHealth}</s-link>
      </Step>

      <Step title={`3. ${t.overview.stepEmbed}`} done={d.embedActive}>
        <s-paragraph>{d.embedActive ? t.overview.stepEmbedActive : t.overview.stepEmbedBody}</s-paragraph>
        {!d.embedActive && (
          <s-button href={editorUrl} target="_top">
            {t.overview.openEditor}
          </s-button>
        )}
      </Step>

      <Step title={`4. ${t.overview.stepTest}`} done={false}>
        <s-paragraph>{t.overview.stepTestBody}</s-paragraph>
        <s-link href="/app/diagnostic">{t.nav.diagnostic}</s-link>
      </Step>

      <Step title={`5. ${t.overview.stepLive}`} done={live}>
        <s-paragraph>{live ? t.overview.stepLiveDone : t.overview.stepLiveBody}</s-paragraph>
        <fetcher.Form method="post" action={`${actionUrl}&intent=mode&mode=${live ? "TEST" : "LIVE"}`}>
          <input type="hidden" name="intent" value="mode" />
          <input type="hidden" name="mode" value={live ? "TEST" : "LIVE"} />
          <input type="hidden" name="domain" value={d.domain} />
          <s-button type="submit" variant={live ? "secondary" : "primary"} disabled={!importDone}>
            {live ? t.overview.backToTest : t.overview.goLive}
          </s-button>
        </fetcher.Form>
      </Step>

      {importDone && (
        <s-section heading={t.overview.last30}>
          <s-stack direction="inline" gap="large">
            <s-text>
              {t.overview.recovered}: <strong>{d.recovered}</strong>
            </s-text>
            <s-text>
              {t.overview.unresolved}: <strong>{d.unresolved}</strong>
            </s-text>
          </s-stack>
        </s-section>
      )}
    </s-page>
  );
}
