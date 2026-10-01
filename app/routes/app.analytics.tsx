import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import { db } from "../db.server";
import { requireShop } from "../services/session.server";
import { getRecoveryAnalytics } from "../services/analytics.server";
import { fmt } from "../i18n";
import { useT } from "../i18n/use-t";

const RANGES = [7, 30, 90];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { shop } = await requireShop(request);
  const requested = Number(new URL(request.url).searchParams.get("days"));
  const days = RANGES.includes(requested) ? requested : 30;
  return { days, analytics: await getRecoveryAnalytics(db, shop.id, days) };
};

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <s-box padding="base" border="base" borderRadius="base">
      <s-stack gap="small-300">
        <s-text>{label}</s-text>
        <s-heading>{value.toLocaleString()}</s-heading>
      </s-stack>
    </s-box>
  );
}

export default function Analytics() {
  const { days, analytics: a } = useLoaderData<typeof loader>();
  const { t } = useT();

  return (
    <s-page heading={t.analytics.title}>
      <s-section>
        <s-paragraph>{t.analytics.intro}</s-paragraph>
        <s-stack direction="inline" gap="small-200">
          {RANGES.map((r) => (
            <s-button key={r} href={`/app/analytics?days=${r}`} variant={r === days ? "primary" : "secondary"}>
              {fmt(t.analytics.days, { count: r })}
            </s-button>
          ))}
        </s-stack>
      </s-section>

      <s-section>
        <s-grid gridTemplateColumns="repeat(auto-fit, minmax(180px, 1fr))" gap="base">
          <Stat label={t.analytics.recovered} value={a.recovered} />
          <Stat label={t.analytics.exact} value={a.matches} />
          <Stat label={t.analytics.chooser} value={a.multiples} />
          <Stat label={t.analytics.fallback} value={a.fallbacks} />
          <Stat label={t.analytics.unresolved} value={a.unresolved} />
          <Stat label={t.analytics.slow} value={a.timeouts + a.errors} />
        </s-grid>
      </s-section>

      <s-section heading={t.analytics.topProducts}>
        {a.topRecoveredProducts.length === 0 ? (
          <s-text>{t.analytics.empty}</s-text>
        ) : (
          <s-table>
            <s-table-header-row>
              <s-table-header>{t.health.product}</s-table-header>
              <s-table-header>{t.analytics.count}</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {a.topRecoveredProducts.map((p) => (
                <s-table-row key={p.handle}>
                  <s-table-cell>{p.handle}</s-table-cell>
                  <s-table-cell>{p.count}</s-table-cell>
                </s-table-row>
              ))}
            </s-table-body>
          </s-table>
        )}
      </s-section>

      <s-section heading={t.analytics.topUnresolved}>
        <s-paragraph>{t.analytics.topUnresolvedHelp}</s-paragraph>
        {a.topUnresolvedQueries.length === 0 ? (
          <s-text>{t.analytics.empty}</s-text>
        ) : (
          <s-table>
            <s-table-header-row>
              <s-table-header>{t.health.value}</s-table-header>
              <s-table-header>{t.analytics.count}</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {a.topUnresolvedQueries.map((q) => (
                <s-table-row key={q.query}>
                  <s-table-cell>{q.query}</s-table-cell>
                  <s-table-cell>{q.count}</s-table-cell>
                </s-table-row>
              ))}
            </s-table-body>
          </s-table>
        )}
      </s-section>
    </s-page>
  );
}
