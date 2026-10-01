import type { Diagnostic } from "./services/diagnostic.server";
import type { IdentifierHealth } from "./services/health.server";
import type { RecoveryAnalytics } from "./services/analytics.server";

type HealthCounts = IdentifierHealth["counts"];
type PreviewTone = "blue" | "green" | "amber" | "red" | "orange" | "purple" | "muted";

export function AppStorePreviewShell(props: { eyebrow: string; title: string; intro: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <main className="wb-screen">
      <header className="wb-header">
        <div className="wb-brand">
          <strong>Exact Search Guard</strong>
        </div>
        <nav className="wb-nav" aria-label="Preview navigation">
          <a href="/support">Support</a>
          <a href="/about">About</a>
          <a href="/policies">Policies</a>
        </nav>
      </header>
      <section className="wb-hero">
        <div className="wb-hero-copy">
          <p className="wb-eyebrow">{props.eyebrow}</p>
          <h1>{props.title}</h1>
          <p>{props.intro}</p>
        </div>
        {props.aside}
      </section>
      {props.children}
    </main>
  );
}

export function BrowserCard(props: { title: string; children: React.ReactNode; className?: string; tones?: PreviewTone[] }) {
  const tones = props.tones ?? ["blue", "green", "amber"];
  return (
    <section className={`wb-window ${props.className ?? ""}`}>
      <div className="wb-window-bar">
        {tones.map((tone) => (
          <span key={tone} className={`wb-dot wb-tone-${tone}`} />
        ))}
        <strong>{props.title}</strong>
      </div>
      <div className="wb-window-body">{props.children}</div>
    </section>
  );
}

export function MetricCard(props: { label: string; value: string | number; note?: string; tone?: "blue" | "green" | "amber" | "red" }) {
  return (
    <article className="wb-metric">
      <div className={`wb-metric-dot wb-tone-${props.tone ?? "blue"}`} />
      <span>{props.label}</span>
      <strong>{typeof props.value === "number" ? props.value.toLocaleString() : props.value}</strong>
      {props.note && <small>{props.note}</small>}
    </article>
  );
}

export function SearchPreview() {
  return (
    <BrowserCard title="Storefront search" className="wb-search-preview" tones={["green", "blue", "muted"]}>
      <h2>Search</h2>
      <div className="wb-search-box">
        <span>BK204</span>
        <strong>Exact</strong>
      </div>
      <div className="wb-result-row">
        <div>
          <strong>BK-2049 Brake Pad Kit</strong>
          <span>SKU BK204 - direct match</span>
        </div>
        <i className="wb-status wb-tone-green" />
      </div>
      <div className="wb-result-row">
        <div>
          <strong>Brake Service Clip</strong>
          <span>Alias BK204-C - also eligible</span>
        </div>
        <i className="wb-status wb-tone-blue" />
      </div>
      <div className="wb-result-row">
        <div>
          <strong>Brake cleaner</strong>
          <span>Native search fallback</span>
        </div>
        <i className="wb-status wb-tone-muted" />
      </div>
    </BrowserCard>
  );
}

export function AppStorePreviewOverview(props: { indexed: number; counts: HealthCounts; recovered: number; unresolved: number; embedActive: boolean }) {
  return (
    <AppStorePreviewShell
      eyebrow="Exact Search Guard"
      title="Exact SKU search, without the mess."
      intro="A focused Shopify app for stores where product codes, part numbers, and SKUs need to land on the right item the first time."
      aside={<SearchPreview />}
    >
      <section className="wb-card-row wb-overview-row">
        <article className="wb-info-card wb-soft">
          <h2>One job, done well.</h2>
          <p>Private by default. Built for real merchandising work.</p>
        </article>
        <MetricCard label="Indexed variants" value={props.indexed} note="ready for exact matching" />
        <MetricCard label="Recovered" value={props.recovered} note="last 12 months" tone="green" />
        <MetricCard label="Unresolved" value={props.unresolved} note="needs review" tone="amber" />
      </section>
    </AppStorePreviewShell>
  );
}

export function AppStorePreviewSetup() {
  return (
    <AppStorePreviewShell
      eyebrow="Store setup"
      title="Turn messy codes into useful search."
      intro="Index SKUs, barcodes, handles, and aliases. Keep native search as the fallback, not the failure mode."
      aside={<SearchPreview />}
    >
      <section className="wb-feature-grid">
        <article>
          <h3>Exact identifiers</h3>
          <p>SKU, barcode, handle, and alias matching.</p>
        </article>
        <article>
          <h3>Duplicate chooser</h3>
          <p>Show the right options when a code maps to more than one product.</p>
        </article>
        <article>
          <h3>Fallback preserved</h3>
          <p>Let Shopify search handle everything else.</p>
        </article>
      </section>
    </AppStorePreviewShell>
  );
}

export function AppStorePreviewHealth(props: { health: IdentifierHealth }) {
  const c = props.health.counts;
  return (
    <AppStorePreviewShell
      eyebrow="Catalog confidence"
      title="Find the identifier problems before shoppers do."
      intro={`Safe demo data across one fictitious year: ${props.health.indexedVariants.toLocaleString()} indexed variants and ${(
        c.duplicates + c.ambiguousAliases + c.missingSku
      ).toLocaleString()} cleanup items surfaced.`}
      aside={
        <BrowserCard title="Identifier health" className="wb-health-window" tones={["orange", "purple", "red"]}>
          <h2>Catalog health</h2>
          <p>Fictitious demo store - trailing 12 months</p>
          <div className="wb-metric-grid">
            <MetricCard label="Indexed" value={props.health.indexedVariants} note="variants" />
            <MetricCard label="Products" value={props.health.indexedProducts} note="active" tone="green" />
            <MetricCard label="Issues" value={c.duplicates + c.ambiguousAliases + c.missingSku} note="to fix" tone="amber" />
          </div>
          <IssueRow label="Duplicate values" value={c.duplicates} tone="orange" />
          <IssueRow label="Ambiguous aliases" value={c.ambiguousAliases} tone="purple" />
          <IssueRow label="Variants without SKU" value={c.missingSku} tone="red" />
        </BrowserCard>
      }
    >
      <section className="wb-info-card wb-soft wb-maintenance">
        <h2>Simple maintenance loop</h2>
        <p>Review duplicates, fill missing SKUs, rerun the index, and keep exact-code search trustworthy.</p>
      </section>
    </AppStorePreviewShell>
  );
}

function IssueRow(props: { label: string; value: number; tone: "amber" | "red" | "green" | "blue" | "orange" | "purple" }) {
  return (
    <div className="wb-issue-row">
      <span className={`wb-status wb-tone-${props.tone}`} />
      <strong>{props.label}</strong>
      <b>{props.value.toLocaleString()}</b>
    </div>
  );
}

export function AppStorePreviewDiagnostic(props: { q: string; diagnostic: Diagnostic | null }) {
  const query = props.q || "BK204";
  const match = props.diagnostic?.response.matches?.[0];
  return (
    <AppStorePreviewShell
      eyebrow="Test search"
      title="Prove a product code works before it goes live."
      intro="Run exact-code checks against fictitious catalogue examples without exposing real merchant data."
      aside={
        <section className="wb-table-card">
          <h2>Recent exact-code tests</h2>
          <table>
            <thead>
              <tr>
                <th>Query</th>
                <th>Result</th>
                <th>Route</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["BK204", "BK-2049 Brake Pad Kit", "Exact"],
                ["FILTER 44", "Filter Cartridge 44", "Exact"],
                ["VALVE-9", "Service Valve", "Alias"],
                ["8801453", "Water Filter Core", "Exact"],
                ["MOUNT BLACK", "Mounting Bracket", "Chooser"],
              ].map((row) => (
                <tr key={row[0]}>
                  <td>{row[0]}</td>
                  <td>{row[1]}</td>
                  <td>
                    <strong>{row[2]}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      }
    >
      <BrowserCard title="Diagnostic result" className="wb-diagnostic-window" tones={["blue", "green", "amber"]}>
        <span className="wb-muted-label">Query</span>
        <div className="wb-diagnostic-line">
          <strong>{query}</strong>
          <b>Exact</b>
        </div>
        <p>Matched {match?.title ?? "BK-2049 Brake Pad Kit"} by normalized SKU.</p>
      </BrowserCard>
    </AppStorePreviewShell>
  );
}

export function AppStorePreviewAnalytics(props: { days: number; analytics: RecoveryAnalytics }) {
  const a = props.analytics;
  const monthValues = [238, 265, 290, 318, 301, 355, 382, 401, 426, 372, 470, 468];
  const max = Math.max(...monthValues);
  return (
    <AppStorePreviewShell
      eyebrow="One-year recovery"
      title="See where exact search is saving orders."
      intro="Fictitious trailing-year data highlights recovered searches, duplicate chooser usage, and unresolved code opportunities."
      aside={
        <BrowserCard title="Recovery analytics" className="wb-analytics-window" tones={["blue", "green", "amber"]}>
          <h2>Recovered searches</h2>
          <p>One year of safe fictitious data</p>
          <div className="wb-metric-grid">
            <MetricCard label="Recovered" value={a.recovered} note="exact or chooser" />
            <MetricCard label="Exact matches" value={a.matches} note="direct routes" tone="green" />
            <MetricCard label="Chooser" value={a.multiples} note="duplicate flows" tone="amber" />
          </div>
          <div className="wb-chart">
            {monthValues.map((value, index) => (
              <i key={index} style={{ height: `${Math.round((value / max) * 92)}px` }} />
            ))}
          </div>
          <div className="wb-chart-labels">
            <span>Oct</span>
            <span>Dec</span>
            <span>Feb</span>
            <span>Apr</span>
            <span>Jun</span>
            <span>Aug</span>
          </div>
        </BrowserCard>
      }
    >
      <section className="wb-card-row wb-analytics-cards">
        <MetricCard label="Fallbacks" value={a.fallbacks} />
        <MetricCard label="Open" value={a.unresolved} tone="amber" />
        <MetricCard label="Events" value={a.timeouts + a.errors} tone="red" />
      </section>
    </AppStorePreviewShell>
  );
}
