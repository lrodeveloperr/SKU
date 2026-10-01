import { useActionData, useLoaderData, useNavigation, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { db } from "../db.server";
import { requireShop } from "../services/session.server";
import { startCatalogImportWithSessionRefresh } from "../services/catalog-import-auth.server";
import { updateShopSettings } from "../services/shops.server";
import { planFor } from "../domain/plans";
import { fmt, messages, toLocale } from "../i18n";
import { useT } from "../i18n/use-t";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { shop } = await requireShop(request);
  const used = await db.catalogVariant.count({ where: { shopId: shop.id } });
  return {
    mode: shop.mode,
    enabled: shop.enabled,
    outOfStockMode: shop.outOfStockMode,
    locale: toLocale(shop.locale),
    namespace: shop.modelMetafieldNamespace ?? "",
    key: shop.modelMetafieldKey ?? "",
    plan: planFor(shop.plan),
    used,
    syncState: shop.syncState,
    lastSyncedAt: shop.lastSyncedAt?.toISOString() ?? null,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, shop, t } = await requireShop(request);
  const form = await request.formData();
  const text = (k: string) => String(form.get(k) ?? "").trim();

  const namespace = text("namespace");
  const key = text("key");
  if (Boolean(namespace) !== Boolean(key)) return { ok: false as const, error: t.settings.invalidMetafield };

  const oos = text("outOfStockMode");
  try {
    const { shop: updated, needsReimport } = await updateShopSettings(db, shop.id, {
      mode: text("mode") === "LIVE" ? "LIVE" : "TEST",
      enabled: form.get("enabled") === "on",
      outOfStockMode: oos === "WARN" || oos === "EXCLUDE" ? oos : "SHOW",
      locale: toLocale(text("locale")),
      modelMetafield: namespace ? { namespace, key } : null,
    });
    if (needsReimport) await startCatalogImportWithSessionRefresh(db, request, admin, updated);
    return { ok: true as const, message: needsReimport ? messages[toLocale(updated.locale)].settings.modelChanged : messages[toLocale(updated.locale)].common.saved };
  } catch {
    return { ok: false as const, error: t.settings.invalidMetafield };
  }
};

export default function Settings() {
  const d = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const saving = useNavigation().state === "submitting";
  const { t } = useT();
  const over = d.used > d.plan.maxVariants;

  return (
    <s-page heading={t.settings.title}>
      {result && (result.ok ? <s-banner tone="success">{result.message}</s-banner> : <s-banner tone="critical">{result.error}</s-banner>)}

      <form method="post" action="/app/settings">
        <s-section heading={t.settings.mode}>
          <s-stack gap="base">
            <s-select label={t.settings.mode} name="mode" value={d.mode}>
              <s-option value="TEST">{t.settings.modeTest}</s-option>
              <s-option value="LIVE">{t.settings.modeLive}</s-option>
            </s-select>
            <s-checkbox label={t.settings.enabled} name="enabled" checked={d.enabled} details={t.settings.enabledHelp} />
          </s-stack>
        </s-section>

        <s-section heading={t.settings.oos}>
          <s-select label={t.settings.oos} name="outOfStockMode" value={d.outOfStockMode}>
            <s-option value="SHOW">{t.settings.oosShow}</s-option>
            <s-option value="WARN">{t.settings.oosWarn}</s-option>
            <s-option value="EXCLUDE">{t.settings.oosExclude}</s-option>
          </s-select>
        </s-section>

        <s-section heading={t.settings.model}>
          <s-paragraph>{t.settings.modelHelp}</s-paragraph>
          <s-stack direction="inline" gap="base">
            <s-text-field label={t.settings.namespace} name="namespace" value={d.namespace} placeholder="custom" />
            <s-text-field label={t.settings.key} name="key" value={d.key} placeholder="model_number" />
          </s-stack>
        </s-section>

        <s-section heading={t.settings.language}>
          <s-select label={t.settings.language} name="locale" value={d.locale}>
            <s-option value="en">English</s-option>
            <s-option value="es">Español</s-option>
          </s-select>
        </s-section>

        <s-section>
          <s-button type="submit" variant="primary" loading={saving}>
            {t.common.save}
          </s-button>
        </s-section>
      </form>

      <s-section heading={t.settings.plan}>
        <s-stack gap="small-200">
          <s-text>
            {d.plan.name} · ${d.plan.priceUsd}/mo
          </s-text>
          <s-text>{fmt(t.settings.usage, { used: d.used.toLocaleString(), max: d.plan.maxVariants.toLocaleString() })}</s-text>
          {over && <s-banner tone="warning">{t.settings.overLimit}</s-banner>}
          <s-text>{t.settings.billingNote}</s-text>
        </s-stack>
      </s-section>

      <s-section heading={t.settings.index}>
        <s-text>
          {t.settings.state[d.syncState]} · {t.settings.lastSynced}: {d.lastSyncedAt ? new Date(d.lastSyncedAt).toLocaleString() : t.settings.never}
        </s-text>
      </s-section>
    </s-page>
  );
}
