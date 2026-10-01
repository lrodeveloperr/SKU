from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parent
STATIC = ROOT / "static"


CSS = """
:root{--ink:#071327;--muted:#58657a;--blue:#1468f4;--sky:#edf7ff;--soft:#f7fbff;--line:#dbe5ef;--green:#168f5a;--amber:#b76b00;--red:#d33d3d}
*{box-sizing:border-box}body{margin:0;background:linear-gradient(180deg,#fff 0%,var(--soft) 100%);color:var(--ink);font-family:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}.screen{width:1600px;height:900px;overflow:hidden;background:linear-gradient(180deg,#fff 0%,var(--soft) 100%)}.header{height:72px;padding:0 78px;border-bottom:1px solid rgba(219,229,239,.92);background:#fffffff0;display:flex;align-items:center;justify-content:space-between}.brand{display:flex;align-items:baseline;gap:4px;font-size:28px;letter-spacing:-.045em}.brand strong{font-weight:800}.brand span{font-weight:400}.nav{display:flex;gap:24px}.nav span{font-size:18px;font-weight:800}.nav span:first-child{color:var(--blue)}.hero{padding:52px 80px 0;display:grid;grid-template-columns:minmax(0,.86fr) minmax(620px,1fr);gap:52px;align-items:center}.eyebrow{margin:0 0 20px;color:var(--blue);font-size:21px;font-weight:800;letter-spacing:.09em;text-transform:uppercase}h1{margin:0;max-width:720px;font-size:66px;line-height:1.03;letter-spacing:-.066em;font-weight:800}.copy>p:last-child{max-width:640px;margin:24px 0 0;color:var(--muted);font-size:27px;line-height:1.42;letter-spacing:-.025em}.window,.table-card,.info-card,.feature-grid article,.metric{background:#fff;border:1px solid #cfddea;border-radius:18px}.window{overflow:hidden;border-radius:22px;box-shadow:0 26px 0 -16px #14366029,0 34px 54px #28446214}.bar{height:58px;padding:0 26px;background:#f3f8fd;display:flex;align-items:center;gap:14px}.bar strong{margin-left:26px;font-size:19px;font-weight:800}.dot{width:14px;height:14px;border-radius:999px}.red-dot{background:#ff6b62}.yellow-dot{background:#ffbd45}.green-dot{background:#31c875}.body{padding:32px 42px}.window h2,.table-card h2,.info-card h2{margin:0;font-size:34px;line-height:1.08;letter-spacing:-.045em}.window p,.info-card p,.feature-grid p{color:var(--muted);font-size:18px;line-height:1.55}.search{width:710px}.search-box{margin-top:14px;height:64px;padding-left:24px;border:2px solid #cdd9e5;border-radius:18px;background:var(--soft);display:flex;align-items:center;justify-content:space-between}.search-box span{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:28px;font-weight:800}.search-box strong,.diag-line b{min-width:122px;height:56px;border-radius:999px;background:var(--blue);color:#fff;display:grid;place-items:center;font-size:24px;animation:pulseButton 1.8s ease-in-out infinite}.result{min-height:84px;margin-top:16px;padding:16px 20px 16px 26px;border:1px solid #cfddea;border-radius:17px;display:flex;align-items:center;justify-content:space-between}.result strong{display:block;font-size:25px}.result span{display:block;margin-top:4px;color:var(--muted);font-size:16px}.status,.metric-dot{display:inline-block;border-radius:999px;animation:pulseDot 1.8s ease-in-out infinite}.status{width:21px;height:21px}.blue{background:var(--blue)}.green{background:var(--green)}.amber{background:var(--amber)}.orange{background:#f08c18}.purple{background:#7c3aed}.red{background:var(--red)}.muted-dot{background:#5f6b7d}.card-row{margin:36px 80px 0;display:grid;grid-template-columns:1.5fr repeat(3,minmax(0,1fr));gap:20px}.soft{background:#eaf5ff}.info-card{padding:28px 34px}.info-card h2{font-size:34px}.info-card p{margin:12px 0 0;font-size:20px}.metric{min-height:162px;padding:22px 24px}.metric-dot{width:36px;height:36px;box-shadow:inset 0 0 0 11px #eaf5ff}.metric span{display:block;margin-top:-32px;margin-left:54px;color:var(--muted);font-size:18px;font-weight:800}.metric strong{display:block;margin-top:30px;font-size:44px;line-height:1}.metric small{display:block;margin-top:10px;color:var(--muted);font-size:17px}.feature-grid{margin:22px 80px 0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}.feature-grid article{min-height:168px;padding:26px 28px}.feature-grid h3{margin:0 0 12px;font-size:24px;letter-spacing:-.035em}.feature-grid p{margin:0}.health,.analytics{width:760px}.analytics{width:870px}.body>p{margin:6px 0 26px}.metric-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}.metric-grid .metric{min-height:166px}.issue{height:50px;margin-top:12px;padding:0 58px 0 22px;border:1px solid var(--line);border-radius:14px;background:var(--soft);display:grid;grid-template-columns:22px 1fr auto;align-items:center;gap:18px}.issue strong,.issue b{font-size:19px}.maintenance{width:560px;margin:38px 0 0 88px}.table-card{width:640px;padding:26px 28px 30px}.table-card table{width:100%;margin-top:18px;border-collapse:collapse}.table-card th,.table-card td{padding:13px 0;border-bottom:1px solid var(--line);text-align:left;font-size:17px}.table-card th{color:var(--muted);font-size:16px;letter-spacing:.04em}.table-card td strong{color:var(--blue)}.diag{width:604px;margin:10px 0 0 88px}.label{color:var(--muted);font-size:18px;font-weight:800}.diag-line{margin:20px 0;display:flex;align-items:center;justify-content:space-between}.diag-line>strong{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:48px}.chart{height:146px;margin-top:34px;padding:20px 36px 16px;border:1px solid var(--line);border-radius:17px;background:var(--soft);display:flex;align-items:end;gap:12px}.chart i{flex:1;min-height:44px;border-radius:10px;background:linear-gradient(180deg,#5f9cf5 0%,var(--blue) 100%)}.chart-labels{margin:8px 42px 0;color:var(--muted);font-size:14px;display:flex;justify-content:space-between}.analytics-cards{grid-template-columns:repeat(3,178px);align-items:stretch;margin-top:26px}.analytics-cards .metric{height:162px}.overview-row{margin-top:24px}@keyframes pulseButton{0%,100%{box-shadow:0 0 0 rgba(20,104,244,0);transform:scale(1)}50%{box-shadow:0 0 0 7px rgba(20,104,244,.12);transform:scale(1.015)}}@keyframes pulseDot{0%,100%{opacity:.72;transform:scale(.94)}50%{opacity:1;transform:scale(1.08)}}@media(prefers-reduced-motion:reduce){.search-box strong,.diag-line b,.status,.metric-dot{animation:none}}
"""

CSS += ".analytics-cards{margin-top:14px}.analytics-cards .metric{min-height:136px;height:136px;padding:18px 24px}.analytics-cards .metric strong{margin-top:24px;font-size:42px}.analytics-cards .metric small{margin-top:8px}"


def metric(label: str, value: str, note: str = "", tone: str = "blue") -> str:
    return f'<article class="metric"><i class="metric-dot {tone}"></i><span>{label}</span><strong>{value}</strong>{f"<small>{note}</small>" if note else ""}</article>'


def shell(eyebrow: str, title: str, intro: str, aside: str, body: str) -> str:
    return f"""<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=1600,initial-scale=1"><title>{eyebrow}</title><style>{CSS}</style></head><body><main class="screen"><header class="header"><div class="brand"><strong>Exact Search Guard</strong></div><nav class="nav"><span>Support</span><span>About</span><span>Privacy</span><span>Terms</span></nav></header><section class="hero"><div class="copy"><p class="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{intro}</p></div>{aside}</section>{body}</main></body></html>"""


def browser(title: str, body: str, cls: str = "") -> str:
    return f'<section class="window {cls}"><div class="bar"><i class="dot red-dot"></i><i class="dot yellow-dot"></i><i class="dot green-dot"></i><strong>{title}</strong></div><div class="body">{body}</div></section>'


def search_preview() -> str:
    rows = [
        ("BK-2049 Brake Pad Kit", "SKU BK204 - direct match", "green"),
        ("Brake Service Clip", "Alias BK204-C - also eligible", "blue"),
        ("Brake cleaner", "Native search fallback", "muted-dot"),
    ]
    body = '<h2>Search</h2><div class="search-box"><span>BK204</span><strong>Exact</strong></div>'
    for title, meta, tone in rows:
        body += f'<div class="result"><div><strong>{title}</strong><span>{meta}</span></div><i class="status {tone}"></i></div>'
    return browser("Storefront search", body, "search")


def overview() -> str:
    body = f'<section class="card-row overview-row"><article class="info-card soft"><h2>One job, done well.</h2><p>Private by default. Built for real merchandising work.</p></article>{metric("Indexed variants","24,618","ready for exact matching")}{metric("Recovered","4,286","last 12 months","green")}{metric("Unresolved","738","needs review","amber")}</section>'
    body += '<section class="feature-grid"><article><h3>Exact identifiers</h3><p>SKU, barcode, handle, and alias matching.</p></article><article><h3>Duplicate chooser</h3><p>8 duplicate values are surfaced before they confuse shoppers.</p></article><article><h3>Theme embed</h3><p>Active and ready for storefront testing.</p></article></section>'
    return shell("Exact Search Guard", "Exact SKU search, without the mess.", "A focused Shopify app for stores where product codes, part numbers, and SKUs need to land on the right item the first time.", search_preview(), body)


def health() -> str:
    issue_rows = "".join([f'<div class="issue"><i class="status {tone}"></i><strong>{label}</strong><b>{value}</b></div>' for label, value, tone in [("Duplicate values", "8", "orange"), ("Ambiguous aliases", "5", "purple"), ("Variants without SKU", "164", "red")]])
    aside = browser("Identifier health", f'<h2>Catalog health</h2><p>Fictitious demo store - trailing 12 months</p><div class="metric-grid">{metric("Indexed","24,618","variants")}{metric("Products","7,942","active","green")}{metric("Issues","177","to fix","amber")}</div>{issue_rows}', "health")
    body = '<section class="info-card soft maintenance"><h2>Simple maintenance loop</h2><p>Review duplicates, fill missing SKUs, rerun the index, and keep exact-code search trustworthy.</p></section>'
    return shell("Catalog confidence", "Find the identifier problems before shoppers do.", "Safe demo data across one fictitious year: 24,618 indexed variants and 177 cleanup items surfaced.", aside, body)


def diagnostic() -> str:
    rows = [("BK204", "BK-2049 Brake Pad Kit", "Exact"), ("FILTER 44", "Filter Cartridge 44", "Exact"), ("VALVE-9", "Service Valve", "Alias"), ("8801453", "Water Filter Core", "Exact"), ("MOUNT BLACK", "Mounting Bracket", "Chooser")]
    trs = "".join([f"<tr><td>{a}</td><td>{b}</td><td><strong>{c}</strong></td></tr>" for a, b, c in rows])
    aside = f'<section class="table-card"><h2>Recent exact-code tests</h2><table><thead><tr><th>Query</th><th>Result</th><th>Route</th></tr></thead><tbody>{trs}</tbody></table></section>'
    body = browser("Diagnostic result", '<span class="label">Query</span><div class="diag-line"><strong>BK204</strong><b>Exact</b></div><p>Matched BK-2049 Brake Pad Kit by normalized SKU.</p>', "diag")
    return shell("Test search", "Prove a product code works before it goes live.", "Run exact-code checks against fictitious catalogue examples without exposing real merchant data.", aside, body)


def analytics() -> str:
    bars = "".join([f'<i style="height:{h}px"></i>' for h in [47, 53, 58, 62, 59, 70, 75, 79, 84, 73, 92, 92]])
    aside = browser("Recovery analytics", f'<h2>Recovered searches</h2><p>One year of safe fictitious data</p><div class="metric-grid">{metric("Recovered","4,286","exact or chooser")}{metric("Exact matches","3,874","direct routes","green")}{metric("Chooser","412","duplicate flows","amber")}</div><div class="chart">{bars}</div><div class="chart-labels"><span>Oct</span><span>Dec</span><span>Feb</span><span>Apr</span><span>Jun</span><span>Aug</span></div>', "analytics")
    body = f'<section class="card-row analytics-cards">{metric("Fallbacks","9,814")}{metric("Unresolved","738","","amber")}{metric("Events","19","","red")}</section>'
    return shell("One-year recovery", "See where exact search is saving orders.", "Fictitious trailing-year data highlights recovered searches, duplicate chooser usage, and unresolved code opportunities.", aside, body)


def main() -> None:
    STATIC.mkdir(parents=True, exist_ok=True)
    pages = {
        "index.html": overview(),
        "health.html": health(),
        "diagnostic.html": diagnostic(),
        "analytics.html": analytics(),
    }
    for name, content in pages.items():
        (STATIC / name).write_text(content, encoding="utf-8")


if __name__ == "__main__":
    main()
