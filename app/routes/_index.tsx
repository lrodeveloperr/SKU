import { redirect, type LoaderFunctionArgs } from "react-router";
import { PublicPage, PublicSection } from "../public-pages";

export const meta = () => [
  { title: "Exact Search Guard" },
  {
    name: "description",
    content: "A focused Shopify app for exact SKU, barcode, model-number, and alias search recovery.",
  },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  if (url.searchParams.get("shop")) throw redirect(`/app?${url.searchParams.toString()}`);
  return null;
};

export default function Index() {
  return (
    <PublicPage eyebrow="Shopify exact-code search" title="Exact SKU search, without replacing your store search.">
      <p>
        Exact Search Guard routes identifier-shaped searches, such as SKUs, barcodes, handles, model numbers, and aliases, to the right product while leaving ordinary Shopify search behavior intact.
      </p>
      <PublicSection title="Built for merchandising teams">
        <p>
          The app indexes product identifiers, highlights duplicate or missing values, provides a test-search diagnostic, and keeps native search as the fallback when a query is not an exact product code.
        </p>
      </PublicSection>
      <PublicSection title="Private by design">
        <p>
          Exact Search Guard does not request customer, order, payment, cart, or checkout data. It uses product and variant information needed to deliver exact-code search behavior and merchant-facing diagnostics.
        </p>
      </PublicSection>
    </PublicPage>
  );
}
