export const meta = () => [{ title: "Exact Search Guard Privacy Policy" }];

export default function PrivacyPolicy() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 860, margin: "0 auto", padding: "48px 24px", lineHeight: 1.6 }}>
      <h1>Exact Search Guard Privacy Policy</h1>
      <p>Effective date: October 1, 2026</p>

      <h2>Overview</h2>
      <p>
        Exact Search Guard helps Shopify merchants route exact SKU, barcode, and model-number searches to the right product while leaving ordinary search behavior unchanged. The app is built for product-search reliability and does not request customer, order, or payment data access.
      </p>

      <h2>Data the app uses</h2>
      <p>
        To provide the service, the app reads product and variant information from the merchant store, including product IDs, handles, titles, variant IDs, SKUs, barcodes, product status, and optional model-number metafield values configured by the merchant.
      </p>
      <p>
        The app also stores operational search events such as exact matches, duplicate matches, fallbacks, timeouts, and unresolved identifier-like searches. These events are used to show app health and recovery analytics to the merchant.
      </p>

      <h2>Data the app does not use</h2>
      <p>
        The app does not request access to customer profiles, customer email addresses, orders, payments, carts, or checkout data. It does not use customer names, personal email addresses, payment details, or order history for app functionality.
      </p>

      <h2>How data is used</h2>
      <p>
        Product identifier data is used to build and maintain a searchable index for exact SKU, barcode, and model-number lookup. Search event data is used to help merchants understand whether exact identifier searches are matching, falling back to native search, or exposing missing or duplicate product data.
      </p>

      <h2>Storage and deletion</h2>
      <p>
        Store data is kept only for app functionality. If a merchant uninstalls the app, the app marks the installation inactive and removes merchant data according to the app's retention and deletion process.
      </p>

      <h2>Support</h2>
      <p>
        Questions about this policy or the app can be sent to <a href="mailto:info@worksbienstudios.com">info@worksbienstudios.com</a>.
      </p>
    </main>
  );
}
