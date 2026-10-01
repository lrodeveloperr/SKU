from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parent
BASE_SIZE = 1200
SCALE = 4


def lerp(a: int, b: int, t: float) -> int:
    return round(a + (b - a) * t)


def mix(c1: tuple[int, int, int], c2: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return tuple(lerp(a, b, t) for a, b in zip(c1, c2))


def pt(value: int | float) -> int:
    return round(value * SCALE)


def box(values: tuple[int | float, int | float, int | float, int | float]) -> tuple[int, int, int, int]:
    return tuple(pt(v) for v in values)


def draw_capsule_line(
    draw: ImageDraw.ImageDraw,
    start: tuple[int, int],
    end: tuple[int, int],
    width: int,
    fill: tuple[int, int, int, int],
) -> None:
    sx, sy = start
    ex, ey = end
    radius = width // 2
    draw.line((sx, sy, ex, ey), fill=fill, width=width)
    draw.ellipse((sx - radius, sy - radius, sx + radius, sy + radius), fill=fill)
    draw.ellipse((ex - radius, ey - radius, ex + radius, ey + radius), fill=fill)


def draw_search_mark(
    image: Image.Image,
    fill: tuple[int, int, int, int],
    offset: tuple[int, int] = (0, 0),
) -> None:
    draw = ImageDraw.Draw(image)
    ox, oy = offset
    draw_capsule_line(
        draw,
        (pt(708) + ox, pt(716) + oy),
        (pt(897) + ox, pt(905) + oy),
        pt(122),
        fill,
    )
    draw.ellipse(
        (
            pt(507 - 286) + ox,
            pt(503 - 286) + oy,
            pt(507 + 286) + ox,
            pt(503 + 286) + oy,
        ),
        outline=fill,
        width=pt(104),
    )


def render() -> Image.Image:
    size = BASE_SIZE * SCALE
    image = Image.new("RGBA", (size, size), "#1468f4")
    draw = ImageDraw.Draw(image)

    top = (31, 122, 255)
    mid = (20, 104, 244)
    bottom = (10, 63, 158)
    for y in range(size):
        t = y / (size - 1)
        color = mix(top, mid, t / 0.52) if t <= 0.52 else mix(mid, bottom, (t - 0.52) / 0.48)
        draw.line((0, y, size, y), fill=color + (255,))

    shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw_search_mark(shadow, (7, 19, 39, 58), offset=(0, pt(34)))
    shadow = shadow.filter(ImageFilter.GaussianBlur(pt(34)))
    image.alpha_composite(shadow)
    draw_search_mark(image, (247, 251, 255, 255))

    draw = ImageDraw.Draw(image)
    bars = [
        ((360, 374, 406, 634), 23, (247, 251, 255, 255)),
        ((431, 374, 461, 634), 15, (216, 235, 255, 255)),
        ((491, 374, 561, 634), 28, (247, 251, 255, 255)),
        ((592, 374, 624, 634), 16, (216, 235, 255, 255)),
        ((653, 374, 698, 634), 23, (247, 251, 255, 255)),
    ]
    for coords, radius, fill in bars:
        draw.rounded_rectangle(box(coords), radius=pt(radius), fill=fill)

    badge_shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    badge_draw = ImageDraw.Draw(badge_shadow)
    badge_draw.ellipse(box((643, 593, 907, 857)), fill=(7, 19, 39, 55))
    badge_shadow = badge_shadow.filter(ImageFilter.GaussianBlur(pt(32)))
    image.alpha_composite(badge_shadow)

    draw = ImageDraw.Draw(image)
    draw.ellipse(box((643, 593, 907, 857)), fill=(22, 143, 90, 255), outline=(247, 251, 255, 255), width=pt(42))
    draw.line(
        (pt(714), pt(724), pt(758), pt(768), pt(838), pt(670)),
        fill=(255, 255, 255, 255),
        width=pt(48),
        joint="curve",
    )

    return image.resize((BASE_SIZE, BASE_SIZE), Image.Resampling.LANCZOS).convert("RGB")


def main() -> None:
    icon = render()
    outputs = {
        "exact-search-guard-icon-1200.png": (1200, 1200),
        "exact-search-guard-icon-512.png": (512, 512),
        "exact-search-guard-icon-256.png": (256, 256),
        "exact-search-guard-icon-64.png": (64, 64),
        "exact-search-guard-icon-48.png": (48, 48),
    }
    for filename, size in outputs.items():
        out = icon if size == (1200, 1200) else icon.resize(size, Image.Resampling.LANCZOS)
        out.save(ROOT / filename, compress_level=6)

    preview = Image.new("RGB", (1200, 360), "#f7fbff")
    x = 64
    for size in (256, 128, 64, 48):
        sample = icon.resize((size, size), Image.Resampling.LANCZOS)
        preview.paste(sample, (x, 68))
        x += size + 110
    preview.save(ROOT / "exact-search-guard-icon-preview.png", optimize=True)


if __name__ == "__main__":
    main()
