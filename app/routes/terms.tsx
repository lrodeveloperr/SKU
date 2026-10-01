import { PublicPage, PublicSection, supportEmail } from "../public-pages";

export const meta = () => [
  { title: "Exact Search Guard Terms" },
  {
    name: "description",
    content: "Terms of use for Exact Search Guard.",
  },
];

export default function Terms() {
  return (
    <PublicPage eyebrow="Terms" title="Exact Search Guard terms of use.">
      <p>Effective date: October 1, 2026</p>
      <PublicSection title="Service">
        <p>
          Exact Search Guard is a Shopify app that helps merchants route exact product-identifier searches and review identifier health. The merchant remains responsible for product data accuracy, storefront content, and final operational decisions.
        </p>
      </PublicSection>
      <PublicSection title="Merchant data">
        <p>
          The app uses product and variant data needed for exact-code lookup and merchant-facing diagnostics. It does not request customer, order, payment, cart, or checkout data. See the Privacy Policy for more detail.
        </p>
      </PublicSection>
      <PublicSection title="Availability">
        <p>
          The app is provided for normal commercial use through Shopify. Temporary downtime, platform outages, theme conflicts, catalog changes, or third-party service interruptions may affect availability.
        </p>
      </PublicSection>
      <PublicSection title="Support">
        <p>
          Questions about these terms or the app can be sent to <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.
        </p>
      </PublicSection>
    </PublicPage>
  );
}
