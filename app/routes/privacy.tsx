import { PublicPage, PublicSection, supportEmail } from "../public-pages";

export const meta = () => [
  { title: "Exact Search Guard Privacy Policy" },
  {
    name: "description",
    content: "Privacy policy for Exact Search Guard.",
  },
];

export default function PrivacyPolicy() {
  return (
    <PublicPage eyebrow="Privacy" title="Exact Search Guard privacy policy.">
      <p>Effective date: October 1, 2026</p>
      <PublicSection title="Overview">
        <p>
          Exact Search Guard helps Shopify merchants route exact SKU, barcode, model-number, and alias searches to the right product while leaving ordinary search behavior unchanged. The app is built for product-search reliability and does not request customer, order, or payment data access.
        </p>
      </PublicSection>
      <PublicSection title="Data the app uses">
        <p>
          To provide the service, the app reads product and variant information from the merchant store, including product IDs, handles, titles, variant IDs, SKUs, barcodes, product status, and optional model-number metafield values configured by the merchant.
        </p>
        <p>
          The app also stores operational search events such as exact matches, duplicate matches, fallbacks, timeouts, and unresolved identifier-like searches. These events are used to show app health and recovery analytics to the merchant.
        </p>
      </PublicSection>
      <PublicSection title="Data the app does not use">
        <p>
          The app does not request access to customer profiles, customer email addresses, orders, payments, carts, or checkout data. It does not use customer names, personal email addresses, payment details, or order history for app functionality.
        </p>
      </PublicSection>
      <PublicSection title="Storage and deletion">
        <p>
          Store data is kept only for app functionality. If a merchant uninstalls the app, the app marks the installation inactive and removes merchant data according to the app's retention and deletion process.
        </p>
      </PublicSection>
      <PublicSection title="Support">
        <p>
          Questions about this policy or the app can be sent to <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.
        </p>
      </PublicSection>
    </PublicPage>
  );
}
