import { PublicPage, PublicSection, supportEmail } from "../public-pages";

export const meta = () => [
  { title: "Exact Search Guard Policies" },
  {
    name: "description",
    content: "Privacy and terms for Exact Search Guard.",
  },
];

export default function Policies() {
  return (
    <PublicPage eyebrow="Policies" title="Privacy and terms for Exact Search Guard.">
      <p>Effective date: October 1, 2026</p>
      <PublicSection title="Data the app uses">
        <p>
          Exact Search Guard reads product and variant information needed for exact-code lookup, including product IDs, handles, titles, variant IDs, SKUs, barcodes, product status, and optional model-number metafield values configured by the merchant.
        </p>
        <p>
          The app also stores operational search events such as exact matches, duplicate matches, fallbacks, timeouts, and unresolved identifier-like searches so merchants can review health and recovery analytics.
        </p>
      </PublicSection>
      <PublicSection title="Data the app does not use">
        <p>
          The app does not request access to customer profiles, customer email addresses, orders, payments, carts, or checkout data. It does not use customer names, personal email addresses, payment details, or order history for app functionality.
        </p>
      </PublicSection>
      <PublicSection title="Storage and deletion">
        <p>
          Store data is kept only for app functionality. If a merchant uninstalls the app, the app marks the installation inactive and removes merchant data according to the app&apos;s retention and deletion process.
        </p>
      </PublicSection>
      <PublicSection title="Service terms">
        <p>
          Exact Search Guard helps merchants route exact product-identifier searches and review identifier health. The merchant remains responsible for product data accuracy, storefront content, and final operational decisions.
        </p>
      </PublicSection>
      <PublicSection title="Availability">
        <p>
          The app is provided for normal commercial use through Shopify. Temporary downtime, platform outages, theme conflicts, catalog changes, or third-party service interruptions may affect availability.
        </p>
      </PublicSection>
      <PublicSection title="Contact">
        <p>
          Questions about these policies can be sent to <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.
        </p>
      </PublicSection>
    </PublicPage>
  );
}
