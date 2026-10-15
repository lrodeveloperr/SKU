import { Form, useLoaderData, type LoaderFunctionArgs } from "react-router";
import { db } from "../db.server";
import { PLANS, findPlan } from "../domain/plans";
import { hasVerifiedPlan } from "../domain/billing";
import { requireShop } from "../services/session.server";
import { refreshBilling } from "../services/billing.server";
import { useT } from "../i18n/use-t";
import { fmt } from "../i18n";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { shop, admin } = await requireShop(request);
  // Every visit verifies with Shopify; plan_handle in the return URL is never an entitlement.
  const current = await refreshBilling(db, shop, admin, { force: true });
  const used = await db.catalogVariant.count({ where: { shopId: current.id } });
  return {
    plan: hasVerifiedPlan(current) ? findPlan(current.plan) : null,
    used,
    error: Boolean(current.billingError),
    price: current.billingPrice,
    currency: current.billingCurrency,
    cancelling: current.billingCancelAtPeriodEnd,
    periodEnd: current.billingPeriodEnd?.toISOString() ?? null,
    pendingPlan: findPlan(current.billingPendingPlan),
  };
};

export default function Billing() {
  const d = useLoaderData<typeof loader>();
  const { t } = useT();
  return (
    <s-page heading={t.billing.title}>
      {d.error && <s-banner tone="warning">{t.billing.unavailable}</s-banner>}
      <s-section heading={t.billing.current}>
        <s-stack gap="base">
          <s-paragraph>{d.plan ? d.plan.name : t.billing.unselected}</s-paragraph>
          {d.plan && <s-paragraph>{fmt(t.billing.usage, { used: d.used.toLocaleString(), max: d.plan.maxVariants.toLocaleString() })}</s-paragraph>}
          {d.plan && d.price !== null && <s-paragraph>{fmt(t.billing.approvedPrice, { amount: d.price, currency: d.currency ?? "USD" })}</s-paragraph>}
          {d.plan && d.used > d.plan.maxVariants && <s-banner tone="warning">{t.billing.overLimit}</s-banner>}
          {d.cancelling && <s-paragraph>{fmt(t.billing.cancelling, { date: d.periodEnd ? new Date(d.periodEnd).toLocaleDateString() : "—" })}</s-paragraph>}
          {d.pendingPlan && <s-paragraph>{fmt(t.billing.pending, { plan: d.pendingPlan.name })}</s-paragraph>}
          <s-button href="/app/billing/select" variant="primary">{d.plan ? t.billing.change : t.billing.choose}</s-button>
          <Form method="get" action="/app/billing"><s-button type="submit">{t.billing.refresh}</s-button></Form>
        </s-stack>
      </s-section>
      <s-section heading={t.billing.plans}>
        <s-paragraph>{t.billing.shopifyCharges}</s-paragraph>
        <s-grid gridTemplateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap="base">
          {PLANS.map((plan) => <s-box key={plan.key} padding="base" border="base" borderRadius="base">
            <s-stack gap="base">
              <s-heading>{plan.name}</s-heading>
              <s-text>{plan.priceUsd === 0 ? t.billing.free : `$${plan.priceUsd} USD / ${t.billing.month}`}</s-text>
              <s-paragraph>{fmt(t.billing.limit, { max: plan.maxVariants.toLocaleString() })}</s-paragraph>
              <s-paragraph>{t.billing.unlimited}</s-paragraph>
              {d.plan?.key === plan.key && <s-badge tone="success">{t.billing.current}</s-badge>}
            </s-stack>
          </s-box>)}
        </s-grid>
      </s-section>
    </s-page>
  );
}
