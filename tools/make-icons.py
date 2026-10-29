#!/usr/bin/env python3
"""Draws the app icons from the Telos mark: the tau, small-size cut, basalt on teal.
    python3 tools/make-icons.py     -> docs/icons/*.png
Needs Pillow. The mark is the one path in CLAUDE.md (small cut, 256 grid)."""
import pathlib
from PIL import Image, ImageDraw
out = pathlib.Path(__file__).resolve().parent.parent / "docs" / "icons"
out.mkdir(parents=True, exist_ok=True)
TEAL, BASALT = (42, 157, 138, 255), (10, 12, 11, 255)
SS = 4   # supersample, then shrink, for clean edges
# small cut: bar 34..146 x 50..94, quarter ring centred (146,126) radii 76/32, leg 178..222 x 126..170, stem 68..112 x 88..218
CX, CY = 128, 134      # centre of the mark's box (x 34..222, y 50..218)

def icon(size, mark_scale, radius_frac):
    n = size * SS
    img = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = int(n * radius_frac)
    if r: d.rounded_rectangle([0, 0, n - 1, n - 1], radius=r, fill=TEAL)
    else: d.rectangle([0, 0, n, n], fill=TEAL)
    s = n / 256 * mark_scale
    P = lambda x, y: (n / 2 + (x - CX) * s, n / 2 + (y - CY) * s)
    box = lambda cx, cy, rad: [P(cx - rad, cy - rad), P(cx + rad, cy + rad)]
    d.rectangle([P(34, 50), P(146, 94)], fill=BASALT)
    d.pieslice(box(146, 126, 76), 270, 360, fill=BASALT)
    d.pieslice(box(146, 126, 32), 270, 360, fill=TEAL)
    d.rectangle([P(178, 126), P(222, 170)], fill=BASALT)
    d.rectangle([P(68, 88), P(112, 218)], fill=BASALT)
    return img.resize((size, size), Image.LANCZOS)

icon(192, 0.84, 56 / 256).save(out / "icon-192.png")
icon(512, 0.84, 56 / 256).save(out / "icon-512.png")
icon(512, 0.66, 0).save(out / "icon-maskable-512.png")       # full bleed, mark inside the safe zone
icon(180, 0.84, 0).save(out / "apple-touch-icon.png")       # iOS rounds it itself
print("wrote", ", ".join(sorted(p.name for p in out.glob("*.png"))))
