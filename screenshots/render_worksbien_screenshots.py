from __future__ import annotations

import math
import zipfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
OUT = ROOT / "app-store-worksbien"
ZIP_PATH = ROOT / "exact-search-guard-worksbien-screenshots.zip"

W, H = 1600, 900

INK = "#071327"
MUTED = "#58657a"
BLUE = "#1468f4"
BLUE_DARK = "#0b51c9"
SKY = "#edf7ff"
SOFT = "#f7fbff"
LINE = "#dbe5ef"
WHITE = "#ffffff"
GREEN = "#1b8f5a"
AMBER = "#b76b00"
RED = "#c93a3a"

FONT_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
FONT_MONO_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"


def font(size: int, bold: bool = False, mono: bool = False) -> ImageFont.FreeTypeFont:
    path = FONT_MONO_BOLD if mono and bold else FONT_MONO if mono else FONT_BOLD if bold else FONT_REG
    return ImageFont.truetype(path, size=size)


def hex_to_rgb(value: str) -> tuple[int, int, int]:
    value = value.lstrip("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))


def blend(c1: str, c2: str, t: float) -> tuple[int, int, int]:
    a = hex_to_rgb(c1)
    b = hex_to_rgb(c2)
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def canvas() -> Image.Image:
    img = Image.new("RGB", (W, H), WHITE)
    draw = ImageDraw.Draw(img)
    for y in range(H):
        t = y / H
        draw.line([(0, y), (W, y)], fill=blend("#ffffff", SOFT, t))
    return img


def shadowed_round(draw: ImageDraw.ImageDraw, box, radius=22, fill=WHITE, outline=LINE, shadow=True):
    x1, y1, x2, y2 = box
    if shadow:
        for i, alpha in enumerate([18, 12, 8, 5]):
            offset = 10 + i * 5
            draw.rounded_rectangle(
                (x1, y1 + offset, x2, y2 + offset),
                radius=radius,
                fill=(20, 54, 96, alpha),
            )
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=2)


def text_size(draw: ImageDraw.ImageDraw, txt: str, fnt) -> tuple[int, int]:
    b = draw.textbbox((0, 0), txt, font=fnt)
    return b[2] - b[0], b[3] - b[1]


def draw_text(draw, xy, txt, fnt, fill=INK, max_width=None, line_gap=8):
    x, y = xy
    ascent, descent = fnt.getmetrics()
    line_height = int((ascent + descent) * 0.9) + line_gap
    if max_width is None:
        for line in txt.splitlines():
            draw.text((x, y), line, font=fnt, fill=fill)
            y += line_height
        return y

    lines: list[str] = []
    for para in txt.splitlines():
        words = para.split()
        cur = ""
        for word in words:
            candidate = word if not cur else f"{cur} {word}"
            if text_size(draw, candidate, fnt)[0] <= max_width:
                cur = candidate
            else:
                if cur:
                    lines.append(cur)
                cur = word
        if cur:
            lines.append(cur)
    for line in lines:
        draw.text((x, y), line, font=fnt, fill=fill)
        y += line_height
    return y


def eyebrow(draw, x, y, txt):
    draw.text((x, y), txt.upper(), font=font(19, bold=True), fill=BLUE)


def pill(draw, x, y, txt, fill=BLUE, fg=WHITE, outline=None):
    f = font(23, bold=True)
    tw, th = text_size(draw, txt, f)
    box = (x, y, x + tw + 48, y + 56)
    draw.rounded_rectangle(box, radius=28, fill=fill, outline=outline)
    draw.text((x + 24, y + 14), txt, font=f, fill=fg)
    return box


def header(draw):
    draw.rectangle((0, 0, W, 72), fill="#fffffff0", outline=LINE)
    draw.text((78, 24), "WorksBien", font=font(27, bold=True), fill=INK)
    draw.text((242, 24), "Studios", font=font(27), fill=INK)
    for i, item in enumerate(["Apps", "Support", "About"]):
        draw.text((1210 + i * 105, 27), item, font=font(19, bold=True), fill=INK if item != "Apps" else BLUE)


def app_badge(draw, x, y, size=186):
    draw.rounded_rectangle((x, y, x + size, y + size), radius=38, fill="#ddecff")
    pad = 22
    draw.rounded_rectangle((x + pad, y + pad, x + size - pad, y + size - pad), radius=27, fill=BLUE)
    cx, cy = x + size // 2, y + size // 2
    f = font(size // 3, bold=True)
    draw.text((cx - 45, cy - 43), "SKU", font=f, fill=WHITE)
    draw.rounded_rectangle((x + 50, y + 128, x + size - 50, y + 142), radius=7, fill="#bfe0ff")


def metric_card(draw, box, label, value, note="", accent=BLUE):
    shadowed_round(draw, box, radius=17, shadow=False)
    x1, y1, x2, y2 = box
    draw.rounded_rectangle((x1 + 22, y1 + 22, x1 + 58, y1 + 58), radius=10, fill="#eaf5ff")
    draw.ellipse((x1 + 33, y1 + 33, x1 + 47, y1 + 47), fill=accent)
    draw.text((x1 + 76, y1 + 23), label, font=font(17, bold=True), fill=MUTED)
    draw.text((x1 + 24, y1 + 74), value, font=font(42, bold=True), fill=INK)
    if note:
        draw.text((x1 + 26, y1 + 126), note, font=font(16), fill=MUTED)


def browser_frame(draw, box, title="Exact Search Guard"):
    x1, y1, x2, y2 = box
    shadowed_round(draw, box, radius=22)
    draw.rounded_rectangle((x1, y1, x2, y1 + 58), radius=22, fill=SOFT, outline=LINE, width=2)
    draw.rectangle((x1, y1 + 30, x2, y1 + 58), fill=SOFT)
    for i, color in enumerate(["#ff6b62", "#ffbd45", "#31c875"]):
        draw.ellipse((x1 + 26 + i * 28, y1 + 22, x1 + 40 + i * 28, y1 + 36), fill=color)
    draw.text((x1 + 130, y1 + 20), title, font=font(17, bold=True), fill=INK)


def search_panel(draw, x, y):
    browser_frame(draw, (x, y, x + 710, y + 520), "Storefront search")
    draw.text((x + 42, y + 86), "Search", font=font(24, bold=True), fill=INK)
    draw.rounded_rectangle((x + 42, y + 124, x + 668, y + 186), radius=17, fill="#f7fbff", outline="#cdd9e5", width=2)
    draw.text((x + 66, y + 142), "BK204", font=font(27, mono=True, bold=True), fill=INK)
    pill(draw, x + 544, y + 127, "Exact", fill=BLUE)
    rows = [
        ("BK-2049 Brake Pad Kit", "SKU BK204 - direct match", GREEN),
        ("Brake Service Clip", "Alias BK204-C - also eligible", BLUE),
        ("Brake cleaner", "Native search fallback", MUTED),
    ]
    yy = y + 220
    for name, meta, color in rows:
        draw.rounded_rectangle((x + 42, yy, x + 668, yy + 82), radius=16, fill=WHITE, outline=LINE, width=2)
        draw.text((x + 68, yy + 18), name, font=font(23, bold=True), fill=INK)
        draw.text((x + 68, yy + 49), meta, font=font(16), fill=MUTED)
        draw.ellipse((x + 626, yy + 29, x + 646, yy + 49), fill=color)
        yy += 96


def health_panel(draw, x, y):
    browser_frame(draw, (x, y, x + 760, y + 545), "Identifier health")
    draw.text((x + 42, y + 88), "Catalog health", font=font(32, bold=True), fill=INK)
    draw.text((x + 42, y + 130), "Fictitious demo store - trailing 12 months", font=font(18), fill=MUTED)
    metric_card(draw, (x + 42, y + 178, x + 268, y + 344), "Indexed", "24,618", "variants", BLUE)
    metric_card(draw, (x + 288, y + 178, x + 514, y + 344), "Products", "7,942", "active", GREEN)
    metric_card(draw, (x + 534, y + 178, x + 718, y + 344), "Issues", "177", "to fix", AMBER)
    issues = [("Duplicate values", "8", AMBER), ("Ambiguous aliases", "5", AMBER), ("Variants without SKU", "164", RED)]
    yy = y + 378
    for label, count, color in issues:
        draw.rounded_rectangle((x + 42, yy, x + 718, yy + 48), radius=14, fill="#f7fbff", outline=LINE)
        draw.ellipse((x + 62, yy + 17, x + 76, yy + 31), fill=color)
        draw.text((x + 92, yy + 13), label, font=font(17, bold=True), fill=INK)
        draw.text((x + 650, yy + 13), count, font=font(17, bold=True), fill=INK)
        yy += 58


def bar_chart(draw, box, values, labels, color=BLUE):
    x1, y1, x2, y2 = box
    max_v = max(values)
    count = len(values)
    gap = 12
    bw = (x2 - x1 - gap * (count - 1)) / count
    for i, value in enumerate(values):
        h = (y2 - y1) * value / max_v
        bx = x1 + i * (bw + gap)
        draw.rounded_rectangle((bx, y2 - h, bx + bw, y2), radius=9, fill=blend("#bfe0ff", color, value / max_v))
    for i, lab in enumerate(labels):
        if i % 2 == 0:
            bx = x1 + i * (bw + gap)
            draw.text((bx, y2 + 12), lab, font=font(13), fill=MUTED)


def analytics_panel(draw, x, y):
    browser_frame(draw, (x, y, x + 870, y + 575), "Recovery analytics")
    draw.text((x + 42, y + 88), "Recovered searches", font=font(34, bold=True), fill=INK)
    draw.text((x + 42, y + 132), "One year of safe fictitious data", font=font(18), fill=MUTED)
    metric_card(draw, (x + 42, y + 178, x + 290, y + 340), "Recovered", "4,286", "exact or chooser", BLUE)
    metric_card(draw, (x + 312, y + 178, x + 560, y + 340), "Exact matches", "3,874", "direct routes", GREEN)
    metric_card(draw, (x + 582, y + 178, x + 828, y + 340), "Chooser", "412", "duplicate flows", AMBER)
    draw.rounded_rectangle((x + 42, y + 374, x + 828, y + 532), radius=17, fill="#f7fbff", outline=LINE, width=2)
    vals = [238, 265, 290, 318, 301, 355, 382, 401, 426, 372, 470, 468]
    labs = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"]
    bar_chart(draw, (x + 78, y + 410, x + 792, y + 493), vals, labs)


def query_table(draw, x, y, w=680):
    draw.rounded_rectangle((x, y, x + w, y + 390), radius=18, fill=WHITE, outline=LINE, width=2)
    draw.text((x + 28, y + 26), "Recent exact-code tests", font=font(24, bold=True), fill=INK)
    headers = ["Query", "Result", "Route"]
    cols = [x + 28, x + 210, x + 485]
    for c, h in zip(cols, headers):
        draw.text((c, y + 78), h, font=font(15, bold=True), fill=MUTED)
    rows = [
        ("BK204", "BK-2049 Brake Pad Kit", "Exact"),
        ("FILTER 44", "Filter Cartridge 44", "Exact"),
        ("VALVE-9", "Service Valve", "Alias"),
        ("8801453", "Water Filter Core", "Exact"),
        ("MOUNT BLACK", "Mounting Bracket", "Chooser"),
    ]
    yy = y + 112
    for i, row in enumerate(rows):
        draw.line((x + 28, yy - 14, x + w - 28, yy - 14), fill=LINE, width=1)
        for c, item in zip(cols, row):
            fill = BLUE if item in {"Exact", "Alias", "Chooser"} else INK
            draw.text((c, yy), item, font=font(16, bold=item in {"Exact", "Alias", "Chooser"}), fill=fill)
        yy += 52


def slide_feature():
    img = canvas()
    draw = ImageDraw.Draw(img, "RGBA")
    header(draw)
    eyebrow(draw, 86, 126, "Exact Search Guard")
    title_bottom = draw_text(draw, (84, 162), "Exact SKU search,\nwithout the mess.", font(72, bold=True), fill=INK, line_gap=0)
    draw_text(
        draw,
        (88, title_bottom + 20),
        "A focused Shopify app for stores where product codes, part numbers, and SKUs need to land on the right item the first time.",
        font(26),
        fill=MUTED,
        max_width=650,
        line_gap=10,
    )
    pill(draw, 88, 490, "Recovery analytics")
    pill(draw, 390, 490, "Identifier health", fill=WHITE, fg=INK, outline="#cfddea")
    app_badge(draw, 1138, 128, 242)
    search_panel(draw, 770, 300)
    draw.rounded_rectangle((86, 668, 690, 812), radius=22, fill=SKY, outline=LINE)
    draw.text((122, 700), "One job, done well.", font=font(34, bold=True), fill=INK)
    draw.text((122, 750), "Private by default. Built for real merchandising work.", font=font(20), fill=MUTED)
    return img


def slide_overview():
    img = canvas()
    draw = ImageDraw.Draw(img, "RGBA")
    header(draw)
    eyebrow(draw, 86, 126, "Store setup")
    title_bottom = draw_text(draw, (84, 162), "Turn messy codes into useful search.", font(62, bold=True), fill=INK, max_width=680, line_gap=2)
    draw_text(draw, (88, title_bottom + 18), "Index SKUs, barcodes, handles, and aliases. Keep native search as the fallback, not the failure mode.", font(24), fill=MUTED, max_width=620)
    cards = [
        ("Exact identifiers", "SKU, barcode, handle, and alias matching."),
        ("Duplicate chooser", "Show the right options when a code maps to more than one product."),
        ("Fallback preserved", "Let Shopify search handle everything else."),
    ]
    yy = 450
    for title, copy in cards:
        draw.rounded_rectangle((88, yy, 636, yy + 96), radius=17, fill=WHITE, outline=LINE, width=2)
        draw.ellipse((118, yy + 33, 148, yy + 63), fill=BLUE)
        draw.text((170, yy + 22), title, font=font(23, bold=True), fill=INK)
        draw.text((170, yy + 55), copy, font=font(16), fill=MUTED)
        yy += 116
    search_panel(draw, 760, 188)
    return img


def slide_health():
    img = canvas()
    draw = ImageDraw.Draw(img, "RGBA")
    header(draw)
    eyebrow(draw, 86, 126, "Catalog confidence")
    title_bottom = draw_text(draw, (84, 162), "Find the identifier problems before shoppers do.", font(62, bold=True), fill=INK, max_width=700, line_gap=2)
    draw_text(draw, (88, title_bottom + 22), "Safe demo data across one fictitious year: 24,618 indexed variants and 177 cleanup items surfaced.", font(24), fill=MUTED, max_width=660)
    health_panel(draw, 760, 175)
    draw.rounded_rectangle((88, 520, 640, 730), radius=22, fill="#eaf5ff", outline=LINE)
    draw.text((124, 558), "Simple maintenance loop", font=font(30, bold=True), fill=INK)
    draw_text(draw, (124, 608), "Review duplicates, fill missing SKUs, rerun the index, and keep exact-code search trustworthy.", font(20), fill=MUTED, max_width=455, line_gap=8)
    return img


def slide_test_search():
    img = canvas()
    draw = ImageDraw.Draw(img, "RGBA")
    header(draw)
    eyebrow(draw, 86, 126, "Test search")
    title_bottom = draw_text(draw, (84, 162), "Prove a product code works before it goes live.", font(62, bold=True), fill=INK, max_width=700, line_gap=2)
    draw_text(draw, (88, title_bottom + 22), "Run exact-code checks against fictitious catalogue examples without exposing real merchant data.", font(24), fill=MUTED, max_width=660)
    query_table(draw, 820, 172, 640)
    browser_frame(draw, (88, 470, 690, 760), "Diagnostic result")
    draw.text((130, 548), "Query", font=font(17, bold=True), fill=MUTED)
    draw.text((130, 585), "BK204", font=font(48, mono=True, bold=True), fill=INK)
    draw.text((130, 660), "Matched BK-2049 Brake Pad Kit by normalized SKU.", font=font(22), fill=MUTED)
    pill(draw, 480, 580, "Exact")
    return img


def slide_analytics():
    img = canvas()
    draw = ImageDraw.Draw(img, "RGBA")
    header(draw)
    eyebrow(draw, 86, 126, "One-year recovery")
    title_bottom = draw_text(draw, (84, 162), "See where exact search is saving orders.", font(62, bold=True), fill=INK, max_width=650, line_gap=2)
    draw_text(draw, (88, title_bottom + 22), "Fictitious trailing-year data highlights recovered searches, duplicate chooser usage, and unresolved code opportunities.", font(24), fill=MUTED, max_width=550)
    analytics_panel(draw, 710, 158)
    stats = [("9,814", "Fallbacks"), ("738", "Unresolved"), ("19", "Events")]
    x = 88
    for value, label in stats:
        metric_card(draw, (x, 510, x + 178, 672), label.title(), value, "", BLUE if value == "9,814" else AMBER if value == "738" else RED)
        x += 200
    return img


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    slides = [
        ("00-feature-media.png", slide_feature()),
        ("01-overview-setup.png", slide_overview()),
        ("02-identifier-health.png", slide_health()),
        ("03-test-search.png", slide_test_search()),
        ("04-recovery-analytics-1-year.png", slide_analytics()),
    ]
    for name, img in slides:
        img.save(OUT / name, optimize=True)

    with zipfile.ZipFile(ZIP_PATH, "w", zipfile.ZIP_DEFLATED) as zf:
        for path in sorted(OUT.glob("*.png")):
            zf.write(path, path.name)


if __name__ == "__main__":
    main()
