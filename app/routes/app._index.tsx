import { useEffect } from "react";
import { useFetcher, useLoaderData, useRevalidator, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { db } from "../db.server";
import { requireShop } from "../services/session.server";
import { getIdentifierHealthCached } from "../services/health.server";
import { getRecoveryAnalytics } from "../services/analytics.server";
import { startCatalogImport } from "../services/catalog-import.server";
import { setEmbedActive, updateShopSettings } from "../services/shops.server";
import { fmt } from "../i18n";
import { useT } from "../i18n/use-t";

const EMBED_HANDLE = "exact-search-guard";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { shop } = await requireShop(request);
  const ready = shop.syncState === "READY";
  const [health, analytics] = ready
    ? await Promise.all([getIdentifierHealthCached(db, shop.id), getRecoveryAnalytics(db, shop.id, 30)])
    : [null, null];
  return {
    domain: shop.domain,
    apiKey: process.env.SHOPIFY_API_KEY || "",
    syncState: shop.syncState,
    syncError: shop.syncError,
    mode: shop.mode,
    enabled: shop.enabled,
    embedActive: shop.embedActive,
    indexed: health?.indexedVariants ?? 0,
    counts: health?.counts ?? null,
    recovered: analytics?.recovered ?? 0,
    unresolved: analytics?.unresolved ?? 0,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, shop } = await requireShop(request);
  const form = await request.formData();
  switch (form.get("intent")) {
    case "mode":
      await updateShopSettings(db, shop.id, { mode: form.get("mode") === "LIVE" ? "LIVE" : "TEST" });
      break;
    case "rebuild":
      await startCatalogImport(db, admin, shop);
      break;
    case "embed":
      await setEmbedActive(db, shop.id, form.get("active") === "1");
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
      try {
        const list: Array<{ handle?: string; activations?: unknown[] }> = await (window as any).shopify.app.extensions();
        const active = list.some((e) => e.handle === EMBED_HANDLE && (e.activations?.length ?? 0) > 0);
        if (!cancelled && active !== d.embedActive) {
          fetcher.submit({ intent: "embed", active: active ? "1" : "0" }, { method: "post", action: "/app?index" });
        }
      } catch {
        /* App Bridge unavailable (for example in tests): keep the stored value. */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.embedActive]);

  const editorUrl = `https://${d.domain}/admin/themes/current/editor?context=apps&activateAppId=${d.apiKey}/${EMBED_HANDLE}`;
  const importDone = d.syncState === "READY";
  const live = d.mode === "LIVE";

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
          <fetcher.Form method="post" action="/app?index">
            <input type="hidden" name="intent" value="rebuild" />
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
          <s-button href={editorUrl} target="_blank">
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
        <fetcher.Form method="post" action="/app?index">
          <input type="hidden" name="intent" value="mode" />
          <input type="hidden" name="mode" value={live ? "TEST" : "LIVE"} />
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
