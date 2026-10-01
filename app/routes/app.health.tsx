import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import { db } from "../db.server";
import { requireShop } from "../services/session.server";
import { getIdentifierHealthCached, type VariantRef } from "../services/health.server";
import { fmt } from "../i18n";
import { useT } from "../i18n/use-t";
import { screenshotHealth } from "../services/screenshot-fixtures.server";
import { isScreenshotMode } from "../services/screenshot-mode.server";
import { AppStorePreviewHealth } from "../app-store-preview-screens";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (isScreenshotMode()) {
    return { screenshotMode: true, health: screenshotHealth };
  }
  const { shop } = await requireShop(request);
  return { screenshotMode: false, health: await getIdentifierHealthCached(db, shop.id) };
};

const numericId = (gid: string) => gid.split("/").pop() ?? "";

function ProductLink({ v }: { v: VariantRef }) {
  return (
    <s-link href={`shopify://admin/products/${numericId(v.productId)}`} target="_top">
      {v.title}
      {v.variantTitle && v.variantTitle !== "Default Title" ? ` · ${v.variantTitle}` : ""}
    </s-link>
  );
}

function VariantTable({ rows }: { rows: VariantRef[] }) {
  const { t } = useT();
  return (
    <s-table>
      <s-table-header-row>
        <s-table-header>{t.health.product}</s-table-header>
      </s-table-header-row>
      <s-table-body>
        {rows.map((v) => (
          <s-table-row key={v.variantId}>
            <s-table-cell>
              <ProductLink v={v} />
            </s-table-cell>
          </s-table-row>
        ))}
      </s-table-body>
    </s-table>
  );
}

export default function Health() {
  const { screenshotMode, health } = useLoaderData<typeof loader>();
  const { t } = useT();
  const c = health.counts;
  const limited = (shown: number, total: number) => (total > shown ? <s-text>{fmt(t.health.showing, { count: shown })}</s-text> : null);

  if (screenshotMode) {
    return <AppStorePreviewHealth health={health} />;
  }

  return (
    <s-page heading={t.health.title}>
      <s-section>
        <s-paragraph>{t.health.intro}</s-paragraph>
        <s-stack direction="inline" gap="base">
          <s-badge tone={c.duplicates ? "critical" : "success"}>{`${t.health.duplicates}: ${c.duplicates}`}</s-badge>
          <s-badge tone={c.ambiguousAliases ? "warning" : "success"}>{`${t.health.ambiguous}: ${c.ambiguousAliases}`}</s-badge>
          <s-badge tone={c.missingSku ? "warning" : "success"}>{`${t.health.missingSku}: ${c.missingSku}`}</s-badge>
          <s-badge tone={c.missingBarcode ? "neutral" : "success"}>{`${t.health.missingBarcode}: ${c.missingBarcode}`}</s-badge>
        </s-stack>
      </s-section>

      <s-section heading={t.health.duplicates}>
        <s-paragraph>{t.health.duplicatesHelp}</s-paragraph>
        {health.duplicates.length === 0 ? (
          <s-text>{t.health.allClear}</s-text>
        ) : (
          <s-table>
            <s-table-header-row>
              <s-table-header>{t.health.value}</s-table-header>
              <s-table-header>{t.health.types}</s-table-header>
              <s-table-header>{t.health.variantsCol}</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {health.duplicates.map((d) => (
                <s-table-row key={d.value}>
                  <s-table-cell>{d.value}</s-table-cell>
                  <s-table-cell>{d.types.join(", ")}</s-table-cell>
                  <s-table-cell>
                    <s-stack gap="small-300">
                      {d.variants.map((v) => (
                        <ProductLink key={v.variantId} v={v} />
                      ))}
                    </s-stack>
                  </s-table-cell>
                </s-table-row>
              ))}
            </s-table-body>
          </s-table>
        )}
        {limited(health.duplicates.length, c.duplicates)}
      </s-section>

      <s-section heading={t.health.ambiguous}>
        <s-paragraph>{t.health.ambiguousHelp}</s-paragraph>
        {health.ambiguousAliases.length === 0 ? (
          <s-text>{t.health.allClear}</s-text>
        ) : (
          <s-table>
            <s-table-header-row>
              <s-table-header>{t.health.codes}</s-table-header>
              <s-table-header>{t.health.variantsCol}</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {health.ambiguousAliases.map((a) => (
                <s-table-row key={a.compact}>
                  <s-table-cell>{a.values.join("  ≈  ")}</s-table-cell>
                  <s-table-cell>{a.variantIds.length}</s-table-cell>
                </s-table-row>
              ))}
            </s-table-body>
          </s-table>
        )}
        {limited(health.ambiguousAliases.length, c.ambiguousAliases)}
      </s-section>

      <s-section heading={t.health.missingSku}>
        {health.missingSku.length === 0 ? <s-text>{t.health.allClear}</s-text> : <VariantTable rows={health.missingSku} />}
        {limited(health.missingSku.length, c.missingSku)}
      </s-section>

      <s-section heading={t.health.missingBarcode}>
        {health.missingBarcode.length === 0 ? <s-text>{t.health.allClear}</s-text> : <VariantTable rows={health.missingBarcode} />}
        {limited(health.missingBarcode.length, c.missingBarcode)}
      </s-section>
    </s-page>
  );
}
