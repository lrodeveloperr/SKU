import type { ReactNode } from "react";

const nav = [
  ["Support", "/support"],
  ["About", "/about"],
  ["Privacy", "/privacy"],
  ["Terms", "/terms"],
] as const;

export function PublicPage(props: { title: string; eyebrow?: string; children: ReactNode }) {
  return (
    <main style={{ minHeight: "100vh", background: "linear-gradient(180deg,#fff 0%,#f7fbff 100%)", color: "#071327", fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <header style={{ height: 72, padding: "0 48px", borderBottom: "1px solid #dbe5ef", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,.94)" }}>
        <a href="/" style={{ color: "#071327", fontSize: 26, fontWeight: 800, letterSpacing: "-.04em", textDecoration: "none" }}>
          Exact Search Guard
        </a>
        <nav style={{ display: "flex", gap: 24 }} aria-label="Main navigation">
          {nav.map(([label, href]) => (
            <a key={href} href={href} style={{ color: label === "Support" ? "#1468f4" : "#071327", fontSize: 17, fontWeight: 800, textDecoration: "none" }}>
              {label}
            </a>
          ))}
        </nav>
      </header>
      <section style={{ maxWidth: 920, margin: "0 auto", padding: "64px 24px" }}>
        {props.eyebrow && <p style={{ margin: "0 0 16px", color: "#1468f4", fontSize: 15, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>{props.eyebrow}</p>}
        <h1 style={{ margin: 0, fontSize: 52, lineHeight: 1.05, letterSpacing: "-.055em" }}>{props.title}</h1>
        <div style={{ marginTop: 28, color: "#46546a", fontSize: 19, lineHeight: 1.65 }}>{props.children}</div>
      </section>
    </main>
  );
}

export function PublicSection(props: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginTop: 34 }}>
      <h2 style={{ margin: "0 0 10px", color: "#071327", fontSize: 26, letterSpacing: "-.035em" }}>{props.title}</h2>
      {props.children}
    </section>
  );
}

export const supportEmail = "info@worksbienstudios.com";
