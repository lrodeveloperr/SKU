# Exact Search Guard: backend

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
| Schema and migration | `prisma/` |

Not built yet: the theme app extension, the admin UI and billing (briefly in the brief's implementation order, steps 6, 7 and 10).
Deploy `shopify.app.toml` after setting `client_id` and URLs, and schedule `POST /jobs/reconcile` nightly with `Authorization: Bearer $CRON_SECRET`.
