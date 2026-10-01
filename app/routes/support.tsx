import { PublicPage, PublicSection, supportEmail } from "../public-pages";

export const meta = () => [
  { title: "Exact Search Guard Support" },
  {
    name: "description",
    content: "Support for Exact Search Guard merchants.",
  },
];

export default function Support() {
  return (
    <PublicPage eyebrow="Support" title="Support for Exact Search Guard.">
      <p>
        For help with setup, theme app embed activation, catalog indexing, duplicate identifiers, or exact-search diagnostics, contact the support address below.
      </p>
      <PublicSection title="Contact">
        <p>
          Email <a href={`mailto:${supportEmail}`}>{supportEmail}</a>. Include your store domain, the query you tested, and a short description of what you expected to happen.
        </p>
      </PublicSection>
      <PublicSection title="Useful checks">
        <p>
          Before contacting support, confirm that the catalog index has completed, the theme app embed is active, and the app is in Live mode if you are testing on the storefront without preview parameters.
        </p>
      </PublicSection>
    </PublicPage>
  );
}
