import { PublicPage, PublicSection, supportEmail } from "../public-pages";

export const meta = () => [
  { title: "Exact Search Guard Help" },
  {
    name: "description",
    content: "Help for Exact Search Guard setup, indexing, diagnostics, and storefront checks.",
  },
];

export default function Support() {
  return (
    <PublicPage eyebrow="Help" title="Get help with setup and diagnostics.">
      <p>
        For setup, theme app embed activation, catalog indexing, duplicate identifiers, or exact-search diagnostics, use the contact details below.
      </p>
      <PublicSection title="Contact">
        <p>
          Email <a href={`mailto:${supportEmail}`}>{supportEmail}</a>. Include your store domain, the query you tested, and a short description of what you expected to happen.
        </p>
      </PublicSection>
      <PublicSection title="Before you write">
        <p>
          Confirm that the catalog index has completed, the theme app embed is active, and the app is in Live mode if you are testing on the storefront without preview parameters.
        </p>
      </PublicSection>
    </PublicPage>
  );
}
