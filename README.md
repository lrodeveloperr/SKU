# Exact Search Guard

Backend for the app described in [`exact-sku-search-guard-product-brief.md`](./exact-sku-search-guard-product-brief.md).
Node, TypeScript, React Router (Shopify app template packages), Prisma and PostgreSQL.

```bash
cp .env.example .env      # fill in Shopify and database values
npm install
npx prisma migrate deploy
npm test && npm run typecheck
```

| Area | Where |
|---|---|
| Identifier engine (pure, no Shopify imports) | `app/domain/identifiers/` |
| Bulk and product GraphQL, JSONL parsing, row building | `app/domain/catalog/` |
| Import, sync, reconciliation, lookup, analytics, health | `app/services/` |
| App proxy lookup: `/apps/exact-search/lookup?q=` | `app/routes/proxy.search-guard.lookup.ts` |
| Webhooks and nightly job | `app/routes/webhooks.*.ts`, `app/routes/jobs.reconcile.ts` |
| Theme app embed (fail-open storefront script) | `extensions/exact-search-guard/` |
| Admin screens (Polaris web components, EN/ES) | `app/routes/app.*.tsx`, `app/i18n/` |
| Schema and migration | `prisma/` |

Run `npm run build` to build the admin app.
Production hosting is `https://exact-search-guard.worksbienstudios.com`.
Production deployment settings and verification checks are in [`docs/production-readiness.md`](./docs/production-readiness.md).
Billing uses Shopify App Pricing in the Partner Dashboard; see [`docs/pricing-readiness.md`](./docs/pricing-readiness.md).
Schedule `POST /jobs/reconcile` nightly with `Authorization: Bearer $CRON_SECRET`.
