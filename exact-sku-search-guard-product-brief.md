# Exact SKU and Barcode Search Guard

## Product decision

Build a narrow Shopify search-reliability app that guarantees deterministic SKU, barcode and model-number matching while leaving ordinary searches with Shopify's native search.

The full search-app market is crowded. The opportunity is the small, defensible layer between unreliable native identifier search and expensive, operationally heavy search suites.

**Recommendation:** Build and validate a two-week MVP.

## Validated problem

Shopify Search and Discovery has a 2.7 rating from 507 reviews, including 101 one-star reviews. Recent 2026 complaints repeatedly report:

- Exact SKU or product-model searches returning hundreds or thousands of unrelated products.
- SKU searches that worked previously no longer returning the correct product.
- Merchants being pushed toward paid third-party search tools.
- Search changes disrupting established storefront behaviour.

Paid alternatives validate traffic and willingness to pay:

| App | Rating and reviews | Entry price | Scope |
|---|---:|---:|---|
| Smart Product Filter and Search | 4.9 from 2,369 | $14 monthly | Full search, filters, AI and merchandising |
| Searchanise | 4.7 from 1,260 | $19 monthly | Full search, filters and merchandising |
| Rapid Search | 4.9 from 410 | Free then $14 | Full search and filters |
| Boost AI Search | 4.7 from 1,635 | $29 monthly | Full search, filters, recommendations and merchandising |

Their negative reviews expose the costs of replacing the complete storefront search system: outages, theme conflicts, mobile failures, SEO concerns, session limits, escalating prices and urgent support obligations.

## Value added by this iteration

### 1. It solves the exact failure merchants describe

The app does not claim to make every search smarter. It guarantees that a known identifier leads to the correct product or variant. This is especially valuable to parts, automotive, industrial, electronics, replacement-component and wholesale stores where shoppers arrive with a code rather than a descriptive phrase.

### 2. It fails open instead of taking search down

If the app cannot resolve an exact identifier, it submits the original query to Shopify unchanged. If the service is unavailable, native search continues to work. Full search replacements can become a storefront-wide point of failure; this app should not.

### 3. It avoids theme ownership

The app uses a theme app extension and app embed instead of modifying theme files or replacing collection pages. This reduces installation friction, theme-specific support, uninstall residue and the risk of breaking SEO or navigation.

### 4. It gives merchants evidence of recovered revenue

The dashboard reports:

- Exact searches successfully recovered.
- Previously zero-result identifiers now matched.
- Duplicate or missing SKUs and barcodes.
- Unresolved identifier-like searches.
- Product views and add-to-cart events following a recovered search.

This turns the value proposition from “better search” into a measurable statement: “These customers found products that your existing search would have missed.”

### 5. It removes query and session anxiety

Pricing is based on indexed variants, not searches, sessions or traffic. Merchants should never have search disabled because they exceeded a monthly usage allowance.

### 6. It is deliberately simpler than the incumbents

The product does not compete on AI, filters, recommendations, collection merchandising or visual customization. Its value is reliability, low operational risk, transparent pricing and fast installation.

## Shopify App Store screenshot plan

Use the standard three-screenshot policy. Each screenshot must show a real product state and one buyer or merchant outcome. Captions should be placed in the screenshot shell rather than relying on the gallery description.

### Screenshot 1

**Caption:** Every Exact SKU Finds the Right Product

**Supporting line:** Fix SKU, barcode and model-number searches without replacing Shopify search.

**Screen content:** A split storefront view. The left side shows the native search returning unrelated products for a specific SKU. The right side shows the same SKU opening the correct product with the correct variant selected.

**Value communicated:** The app solves the precise search failure merchants complain about.

### Screenshot 2

**Caption:** Find Identifier Problems Before Shoppers Do

**Supporting line:** Catch duplicate and missing SKUs and barcodes in one product-data audit.

**Screen content:** The merchant health dashboard with counts for duplicates, missing identifiers and ambiguous normalized matches, plus a short actionable table.

**Value communicated:** The product prevents bad search outcomes instead of only reacting to them.

### Screenshot 3

**Caption:** See Every Search Your Store Recovered

**Supporting line:** Track exact matches, unresolved codes and the products shoppers reached.

**Screen content:** The recovery dashboard with recovered searches, native fallbacks, unresolved identifier-like queries and top recovered products.

**Value communicated:** The merchant can see and verify the app's contribution.

### Screenshot rules

- Use a merchant-realistic catalog such as automotive, industrial parts or electronics.
- Use one consistent SKU across screenshot 1 so the before-and-after result is immediately understandable.
- Do not claim recovered revenue until conversion attribution is implemented and validated.
- Do not lead with settings, installation or pricing; lead with the customer outcome.
- Keep the app name, terminology and interface text consistent with the listing.
- Produce English and Spanish caption sets after the English listing is locked.

## Core workflow

1. Merchant installs the app and authorizes read access to products and variants.
2. The app imports SKU, barcode, handle, variant and optional model-number metafield data.
3. The merchant reviews duplicate and missing identifiers.
4. The merchant activates the app embed in test mode.
5. A shopper enters a search query.
6. The app normalizes case, spaces, dashes and permitted punctuation.
7. One exact match opens the matching product and preselects the variant.
8. Several exact matches display a small chooser.
9. No exact match passes the original query to Shopify search.
10. The dashboard records recoveries, collisions and unresolved searches.

## Engine rules

- Exact match always outranks partial or fuzzy matching.
- SKU and barcode remain separate identifiers.
- Normalization must never merge identifiers that are materially different.
- Duplicate identifiers never trigger an arbitrary redirect.
- Unpublished or inaccessible products are never returned.
- Out-of-stock behaviour is merchant configurable: show, warn or exclude.
- Every lookup has a strict timeout and native-search fallback.
- Disabling or uninstalling the app immediately restores native behaviour.

## MVP scope

### Included

- SKU and barcode indexing.
- One configurable model-number metafield.
- Case, whitespace and punctuation normalization.
- Variant-aware product redirects.
- Duplicate-identifier detection.
- Native-search fallback.
- Test mode and diagnostic search box.
- Recovered-search and zero-result analytics.
- English and Spanish merchant interface.

### Excluded

- AI or semantic search.
- Collection filters.
- Product recommendations.
- Merchandising rules.
- Synonym management.
- Full search-results-page replacement.
- Theme-file editing.

## Build-ready technical specification

### Documented Shopify path

Use Shopify's recommended React Router template rather than assembling authentication, App Bridge, billing and webhook handling manually.

```bash
shopify app init
# Select: Build a React Router app

cd exact-search-guard
shopify app generate extension
# Select: Theme app extension

shopify app dev
```

The generated application should use Node.js, TypeScript, React Router, `@shopify/shopify-app-react-router`, App Bridge and Polaris web components.

### API version and scopes

At the September 30, 2026 research date, `2026-07` is the latest stable Admin API version and `2026-10` is the release candidate. Pin a stable version explicitly when coding; do not rely on `LATEST_API_VERSION` in production.

Minimum initial scopes:

```toml
[access_scopes]
scopes = "read_products,write_app_proxy"
```

Do not request customer, order or theme-write access. Add `write_pixels` only if the post-MVP conversion pixel is implemented.

### App configuration

Configure one app proxy in `shopify.app.toml`; Shopify permits only one proxy root, but all lookup paths can live beneath it.

```toml
[webhooks]
api_version = "2026-07"

[[webhooks.subscriptions]]
topics = ["products/create", "products/update", "products/delete"]
uri = "/webhooks/products"

[[webhooks.subscriptions]]
topics = ["app/uninstalled"]
uri = "/webhooks/app-uninstalled"

[app_proxy]
url = "/proxy/search-guard"
prefix = "apps"
subpath = "exact-search"
```

The storefront calls `/apps/exact-search/lookup?q=...`. Shopify forwards that request to the application. The React Router loader must call `authenticate.public.appProxy(request)` before resolving the shop or query.

### Theme app extension

Create one app embed block targeting `body`. It loads a small JavaScript asset on the storefront without changing theme files.

```liquid
{% schema %}
{
  "name": "Exact Search Guard",
  "target": "body",
  "javascript": "exact-search-guard.js",
  "settings": []
}
{% endschema %}
```

The JavaScript should:

1. Register a capture-phase submit listener.
2. Consider only GET forms whose action resolves to Shopify's `/search` path and which contain a `q` field.
3. Ignore empty, long or clearly natural-language queries.
4. Call the app-proxy lookup with a strict timeout.
5. Redirect only for a unique exact match.
6. Show a lightweight chooser only for several verified matches.
7. Submit the original form unchanged after no match, timeout, network failure or malformed response.
8. Mark its own fallback submission so it cannot intercept the same form twice.

The merchant must activate the app embed in the theme editor. Provide an activation deep link during onboarding and check activation with `shopify.app.extensions()` when the merchant opens the admin app.

### Indexing and synchronization

Initial installation:

1. Authenticate the embedded admin request.
2. Start `bulkOperationRunQuery` for active products and variants.
3. Request product ID, handle, status and variant ID, `legacyResourceId`, title, SKU and barcode.
4. Subscribe to or poll the specific bulk-operation ID until completion.
5. Download the JSONL result and build the index transactionally.
6. Mark the shop ready only after the complete index commits.

Ongoing synchronization:

- `products/create`: fetch and upsert the complete product and variants.
- `products/update`: replace the product's identifier rows in one transaction.
- `products/delete`: remove all rows for the product.
- `app/uninstalled`: revoke active state and delete merchant data according to the retention policy.
- Nightly reconciliation: compare a lightweight product update watermark and repair missed webhook changes.

Webhook delivery is not guaranteed, so the periodic reconciliation is required even with real-time subscriptions.

### Identifier engine

Store separate identifier types: `SKU`, `BARCODE` and `MODEL`. Do not merge them into one untyped string.

For each identifier, store:

- Original value.
- Unicode NFKC and case-folded value.
- Whitespace-normalized value.
- Optional compact alias with configured separators removed.
- Shop, product, variant and market/publication state.

Lookup order:

1. Exact original comparison.
2. Exact case-folded comparison.
3. Whitespace-normalized comparison.
4. Compact alias only when it resolves uniquely.
5. Otherwise return `multiple` or `none`; never guess.

The product URL should use the product handle and the variant's numeric `legacyResourceId`, for example `/products/example-handle?variant=123456789`.

### Minimal database model

Use PostgreSQL with Prisma or Drizzle. Four core tables are sufficient:

| Table | Purpose |
|---|---|
| `shops` | Installation, plan, locale, embed status and sync state |
| `identifier_entries` | Typed normalized identifiers mapped to products and variants |
| `search_events` | Match, multiple, fallback, timeout and unresolved events without customer PII |
| `sync_jobs` | Initial imports, webhook work, reconciliation and failure recovery |

Required constraints:

- Unique source row per shop, identifier type and variant.
- Indexed lookup keys beginning with shop ID and identifier type.
- Idempotency key for every webhook delivery.
- Cascade deletion by shop.

### Suggested repository structure

```text
app/
  domain/identifiers/normalize.ts
  domain/identifiers/lookup.ts
  domain/identifiers/collisions.ts
  routes/app._index.tsx
  routes/app.health.tsx
  routes/app.analytics.tsx
  routes/proxy.search-guard.ts
  routes/webhooks.products.ts
  routes/webhooks.app-uninstalled.ts
  services/catalog-import.server.ts
  services/catalog-sync.server.ts
  services/search-events.server.ts
extensions/
  exact-search-guard/
    blocks/exact-search-guard.liquid
    assets/exact-search-guard.js
prisma/
  schema.prisma
tests/
  identifiers/
  proxy/
  webhooks/
  storefront/
```

Keep the identifier engine free of Shopify UI code so it can be mutation-tested and fuzzed independently.

### Admin interface

Limit the embedded UI to five routes:

1. Overview and setup checklist.
2. Identifier health and collision repair.
3. Diagnostic test search.
4. Recovery analytics.
5. Settings and billing.

Use native Polaris web components and Shopify navigation. Do not create a separate design system.

### Analytics boundary

The MVP should measure resolution events—match, fallback, multiple and unresolved—without customer identifiers. Do not label these events as revenue.

After the search engine is validated, a web pixel extension can subscribe to Shopify customer events such as product views and add-to-cart events. Web pixels run in a sandbox and honour Shopify consent signals, so conversion attribution must be designed as a separate privacy-reviewed increment.

### Performance and failure rules

- Target cached lookup: under 75 milliseconds at the application edge.
- Hard storefront timeout: 150 milliseconds initially; validate on real themes.
- Cache only shop configuration and hot identifier lookups.
- Return a small versioned JSON response.
- Never block, alter or clear the original search query on failure.
- Rate-limit by shop and client IP without storing raw IP addresses long term.
- Log no customer name, email, cart or order data.
- Remove storefront functionality automatically when the app embed is disabled or the app is uninstalled.

### Implementation order

1. Scaffold the React Router app and PostgreSQL session storage.
2. Implement and exhaustively test the identifier normalization engine.
3. Implement bulk catalog import and collision reporting.
4. Add idempotent product webhooks and nightly reconciliation.
5. Add the authenticated app-proxy lookup route.
6. Add the fail-open theme app embed.
7. Build the five-screen merchant interface.
8. Add resolution analytics.
9. Test across Dawn plus four structurally different themes.
10. Add billing only after the product works end to end.

### Required automated tests

- Unicode, casing, whitespace, dash and punctuation normalization.
- Collisions created by compact aliases.
- Duplicate SKU and barcode behaviour.
- Unique, multiple, none, timeout and backend-error responses.
- Webhook replay, reordering and duplicate delivery.
- Bulk-import partial failure and safe retry.
- Storefront fallback with JavaScript disabled, slow network and proxy failure.
- Theme search forms with alternate markup but standard Shopify search semantics.
- Uninstall and merchant-data deletion.
- Catalogs with at least 100,000 variants.

### Official implementation references

- Scaffold an app: https://shopify.dev/docs/apps/build/scaffold-app
- React Router app guide: https://shopify.dev/docs/apps/build/build?framework=reactRouter
- Theme app extensions: https://shopify.dev/docs/apps/build/online-store/theme-app-extensions
- Theme extension configuration: https://shopify.dev/docs/apps/build/online-store/theme-app-extensions/configuration
- App proxies: https://shopify.dev/docs/apps/build/online-store/app-proxies
- Authenticate app proxies: https://shopify.dev/docs/apps/build/online-store/app-proxies/authenticate-app-proxies
- GraphQL bulk operations: https://shopify.dev/docs/apps/build/apis/graphql-admin/bulk-operations/queries
- Webhook subscriptions: https://shopify.dev/docs/apps/build/webhooks/subscribe
- Web pixels: https://shopify.dev/docs/apps/build/marketing/pixels

## Proposed pricing

| Plan | Price | Limit |
|---|---:|---:|
| Development | Free | Development stores and 100 variants |
| Starter | $9 monthly | 5,000 variants |
| Growth | $19 monthly | 50,000 variants |
| Large Catalog | $39 monthly | 250,000 variants |

All plans include unlimited searches. Pricing should be tested against merchant willingness to pay before final submission.

## Two-week validation build

### Week 1

- Product and variant import.
- Normalized identifier engine.
- Duplicate detection.
- Webhook synchronization.
- Admin diagnostic search.

### Week 2

- Theme app embed.
- Exact redirect and multiple-match chooser.
- Native fallback and failure timeout.
- Basic recovery analytics.
- Testing across five materially different Shopify themes.

## Success and kill criteria

Proceed after the pilot if:

- At least five stores with 1,000 or more variants install it.
- At least three stores demonstrate genuine missed or incorrect SKU searches.
- At least three merchants agree to pay $9 or more monthly.
- The app resolves exact identifiers in under 150 milliseconds at the service edge.
- Disabling the service causes no loss of native search functionality.

Stop or reposition if merchants primarily want full filters and merchandising, exact identifier failures cannot be reproduced, or theme interception requires extensive store-specific work.

## Final positioning

**Working listing promise:** Make every exact SKU, barcode and model-number search reach the right Shopify product without replacing your search engine.

**Defensible value:** deterministic identifier search, measurable recoveries, fail-open reliability, no query limits and no theme takeover.
