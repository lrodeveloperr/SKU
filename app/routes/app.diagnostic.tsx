import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import { db } from "../db.server";
import { requireShop } from "../services/session.server";
import { diagnoseQuery } from "../services/diagnostic.server";
import { MAX_QUERY_LENGTH } from "../domain/identifiers/normalize";
import { useT } from "../i18n/use-t";

// A GET form keeps the test shareable and needs no action.
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { shop } = await requireShop(request);
  const q = (new URL(request.url).searchParams.get("q") ?? "").slice(0, MAX_QUERY_LENGTH * 2);
  const diagnostic = q.trim() ? await diagnoseQuery(db, shop, q) : null;
  return { q, diagnostic };
};

export default function Diagnostic() {
  const { q, diagnostic } = useLoaderData<typeof loader>();
  const { t } = useT();
  const r = diagnostic?.response;
  const experience = {
    off: t.diagnostic.liveOff,
    test: t.diagnostic.liveTest,
    not_ready: t.diagnostic.liveNotReady,
    live: t.diagnostic.liveOn,
  };

  return (
    <s-page heading={t.diagnostic.title}>
      <s-section>
        <s-paragraph>{t.diagnostic.intro}</s-paragraph>
        <form method="get">
          <s-stack gap="base">
            <s-text-field label={t.diagnostic.label} name="q" value={q} maxLength={MAX_QUERY_LENGTH * 2} />
            <s-button type="submit" variant="primary">
              {t.diagnostic.run}
            </s-button>
          </s-stack>
        </form>
      </s-section>

      {diagnostic && r && (
        <s-section heading={diagnostic.query}>
          <s-stack gap="base">
            <s-banner tone={r.status === "none" ? "info" : "success"}>
              {r.status === "match" ? t.diagnostic.match : r.status === "multiple" ? t.diagnostic.multiple : t.diagnostic.none}
            </s-banner>
            <s-text>{diagnostic.eligible ? t.diagnostic.eligibleYes : t.diagnostic.eligibleNo}</s-text>
            {r.status === "none" && r.reason && r.reason in t.diagnostic.reasons && (
              <s-text>{t.diagnostic.reasons[r.reason as keyof typeof t.diagnostic.reasons]}</s-text>
            )}
            {diagnostic.stage && (
              <s-text>
                {t.diagnostic.stage}: {t.diagnostic.stages[diagnostic.stage]}
              </s-text>
            )}
            {r.matches && (
              <s-table>
                <s-table-header-row>
                  <s-table-header>{t.health.product}</s-table-header>
                  <s-table-header>{t.health.variant}</s-table-header>
                  <s-table-header>{t.health.types}</s-table-header>
                </s-table-header-row>
                <s-table-body>
                  {r.matches.map((m) => (
                    <s-table-row key={m.url}>
                      <s-table-cell>{m.title}</s-table-cell>
                      <s-table-cell>{m.variantTitle}</s-table-cell>
                      <s-table-cell>{m.identifierTypes.join(", ")}</s-table-cell>
                    </s-table-row>
                  ))}
                </s-table-body>
              </s-table>
            )}
            <s-text>
              {t.diagnostic.liveState}: {experience[diagnostic.experience]}
            </s-text>
          </s-stack>
        </s-section>
      )}
    </s-page>
  );
}
