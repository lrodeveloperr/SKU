import { PublicPage, PublicSection } from "../public-pages";

export const meta = () => [
  { title: "About Exact Search Guard" },
  {
    name: "description",
    content: "About Exact Search Guard, a focused Shopify app for exact SKU, barcode, model-number, and alias search.",
  },
];

export default function About() {
  return (
    <PublicPage eyebrow="About" title="A focused search guardrail for product-code stores.">
      <p>
        Exact Search Guard is built for Shopify merchants whose shoppers search by SKU, barcode, model number, part number, or another exact product identifier.
      </p>
      <PublicSection title="What it does">
        <p>
          The app creates a product identifier index, checks exact-code queries before native search, routes clear matches to the right product, and surfaces duplicate or missing identifiers for cleanup.
        </p>
      </PublicSection>
      <PublicSection title="What it avoids">
        <p>
          It does not replace the storefront search system, modify theme files directly, or request customer, order, payment, cart, or checkout data.
        </p>
      </PublicSection>
    </PublicPage>
  );
}
