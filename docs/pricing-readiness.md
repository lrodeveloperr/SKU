# Pricing Readiness

Exact Search Guard should use Shopify App Pricing for public-app subscriptions. Do not add an Admin Billing API flow for these supported monthly plans.

The app implements Shopify-hosted plan selection, Partner API contract verification, and server-side entitlement enforcement. Complete the dashboard and runtime configuration below before releasing it.

## Plans

| Plan | Monthly price | Catalog limit | Searches |
|---|---:|---:|---|
| Development | $0 | 100 variants | Unlimited |
| Starter | $9 | 5,000 variants | Unlimited |
| Growth | $19 | 50,000 variants | Unlimited |
| Large Catalog | $39 | 250,000 variants | Unlimited |

These values are mirrored in `app/domain/plans.ts`. The Large Catalog Shopify handle is `large-catalog`; the old local `large` value is migrated automatically. Even the free plan requires a verified selected contract. A no-charge paid development-store contract retains that plan's allowance.

## Partner Dashboard Setup

1. Check the four existing managed plan drafts against the table above.
2. Keep the plan names and prices exactly aligned with `app/domain/plans.ts`.
3. Set every plan's redirect URL to `/app/billing`. Enable Free for partners and developers on paid plans so other Partners' eligible dev stores can test at no charge.
4. Verify existing subscriptions before switching from legacy Manual pricing, then enable Shopify App Pricing after the runtime integration is ready.

## Runtime configuration

Set these on the existing Railway app service before deploying:

- `SHOPIFY_PARTNER_ORGANIZATION_ID=5223843`
- `SHOPIFY_PARTNER_APP_ID=gid://shopify/App/430251048961`
- `SHOPIFY_PARTNER_ACCESS_TOKEN`: an existing Partner API client token with Manage apps permission, kept only in server environment variables. If no suitable client exists, create one through the normal authorized account workflow.
- `SHOPIFY_APP_HANDLE`: the app's verified App Store handle; the intended default is `exact-search-guard`. Confirm the hosted pricing destination before launch.

The migration adds billing state to Shop without deleting catalog data. Existing installations start without a verified contract and must select a plan. Do not enable this release before the credential and managed pricing configuration are ready.

## Access and state handling

- Open Plans and billing from navigation, Overview, or Settings. Choose or change a plan on Shopify's hosted page.
- The authenticated session supplies the shop domain. Query-string shop and plan_handle values never grant access.
- Query activeSubscription on Partner API version 2026-07 using the authenticated Shopify Shop GID; validate the returned shop identity.
- Display the active plan separately from a scheduled downgrade.
- Refresh on billing-page visits, ordinary admin access after one minute, background storefront traffic, and nightly maintenance. Coalesce concurrent calls and serialize Partner API request starts.
- During an API outage, retain previously verified access for at most 24 hours, with a visible refresh warning. An unverified installation receives no entitlement. Failed checks never extend the last verification timestamp.
- A scheduled cancellation stops access at the verified cycle end. A null contract removes access.
- Enforce allowances before Go live and before returning storefront matches, including cached matches. Unavailable access or an over-limit catalog falls back to native Shopify search without deleting the index.

## Before App Store Submission

1. Confirm each plan appears in the Partner Dashboard listing/pricing step.
2. Verify the Partner API runtime configuration and complete each live gate in `docs/app-review-fixes-2026-10-15.md`.
3. Run npm test, npm run typecheck, and npm run build. Automated billing tests cover allowances, aliases, no-charge contracts, cancellation, outages, pending changes, API errors, identity mismatch, concurrency, forged return parameters, authenticated redirects, and cached matches.
4. Re-test fresh install, plan approval/decline, changes, cancellation, app embed activation, catalog import, diagnostic search, and mode switching on a development store.

## Official references

- https://shopify.dev/docs/apps/launch/billing/shopify-app-pricing
- https://shopify.dev/docs/apps/launch/billing/shopify-app-pricing/plans
- https://shopify.dev/docs/api/partner/2026-07/active-subscription
