# Production Readiness

This app is wired for production on Railway and the Shopify Partner app named Exact Search Guard.

## Production Target

| Item | Value |
|---|---|
| Public app URL | `https://exact-search-guard.worksbienstudios.com` |
| Railway project | `Exact Search Guard` |
| Railway environment | `production` |
| App service | `exact-search-guard` |
| Database service | `Postgres` |
| Source repository | `lrodeveloperr/SKU` on `main` |

## Railway Service Settings

| Setting | Value |
|---|---|
| Builder | Railpack |
| Build command | `npm run prisma:generate && npm run build` |
| Pre-deploy command | `npm run prisma:migrate` |
| Start command | `npm run start` |
| Healthcheck path | `/` |
| Public domains | `exact-search-guard.worksbienstudios.com`, `exact-search-guard-production.up.railway.app` |

## Required Environment Variables

| Variable | Purpose |
|---|---|
| `SHOPIFY_API_KEY` | Shopify app client ID; must match `shopify.app.toml`. |
| `SHOPIFY_API_SECRET` | Shopify app secret from the Partner Dashboard. |
| `SHOPIFY_APP_URL` | Must be `https://exact-search-guard.worksbienstudios.com`. |
| `SCOPES` | Must be `read_products,write_app_proxy`. |
| `DATABASE_URL` | Railway Postgres connection string. |
| `CRON_SECRET` | Bearer token for `POST /jobs/reconcile`. |
| `IP_HASH_SECRET` | Secret used to HMAC client IPs for rate limiting. |
| `NODE_ENV` | `production`. |
| `PORT` | `3000`. |

The connected Railway service currently exposes all required variable names. Secret values are intentionally not stored in the repository.

## Shopify Partner App Settings

| Setting | Value |
|---|---|
| App URL | `https://exact-search-guard.worksbienstudios.com` |
| Redirect URL | `https://exact-search-guard.worksbienstudios.com/auth/callback` |
| Scopes | `read_products,write_app_proxy` |
| App proxy | Prefix `apps`, subpath `exact-search`, URL `/proxy/search-guard` |
| Webhook API version | `2026-07` |

## Production Verification

After each production deploy:

1. Confirm Railway deploy status is `SUCCESS` for the app service.
2. Confirm `GET /` returns the Exact Search Guard public page.
3. Confirm `GET /support`, `GET /about`, and `GET /policies` return `200`.
4. Confirm an embedded Shopify admin install redirects to `/app`.
5. Confirm a development store can enable the theme app embed.
6. Confirm app proxy lookup is reachable at `/apps/exact-search/lookup?q=TEST-SKU` through the storefront proxy.
7. Confirm `POST /jobs/reconcile` rejects missing or wrong bearer tokens.

## Current Caveat

If Railway shows an older commit after GitHub main has advanced, trigger a new Railway deployment from the GitHub source rather than redeploying the old snapshot. A redeploy of an existing Railway deployment can rebuild the same commit snapshot.
