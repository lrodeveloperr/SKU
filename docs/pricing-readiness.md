# Pricing Readiness

Exact Search Guard should use Shopify App Pricing for public-app subscriptions. Do not add an Admin Billing API flow for these supported monthly plans.

## Plans

| Plan | Monthly price | Catalog limit | Searches |
|---|---:|---:|---|
| Development | $0 | 100 variants | Unlimited |
| Starter | $9 | 5,000 variants | Unlimited |
| Growth | $19 | 50,000 variants | Unlimited |
| Large Catalog | $39 | 250,000 variants | Unlimited |

These values are mirrored in `app/domain/plans.ts` so the embedded settings screen can display plan usage. The app does not enforce paid entitlements yet; the Settings page intentionally says billing is not active.

## Partner Dashboard Setup

1. Create matching monthly plans in Shopify App Pricing.
2. Keep the plan names and prices exactly aligned with `app/domain/plans.ts`.
3. Set the Development plan as a free/test-friendly plan for development stores.
4. Use Shopify's managed app-pricing flow for merchant subscription and plan changes.

## Before App Store Submission

1. Confirm each plan appears in the Partner Dashboard listing/pricing step.
2. Decide whether the first public release enforces catalog limits or only shows warnings.
3. If enforcement is enabled, wire entitlement state into `shops.plan` before submission.
4. Re-test install, app embed activation, catalog import, diagnostic search, and mode switching on the development store.
