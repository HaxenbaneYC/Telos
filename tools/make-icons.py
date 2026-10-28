#!/usr/bin/env python3
"""Draws the app icons from the Telos mark (stem on a base bar, chalk on teal).
    python3 tools/make-icons.py     -> docs/icons/*.png
Needs Pillow. The mark is the one path in CLAUDE.md: M102 26H154L147 180H109Z M22 180h212v46H22Z"""
import pathlib
from PIL import Image, ImageDraw
out = pathlib.Path(__file__).resolve().parent.parent / "docs" / "icons"
out.mkdir(parents=True, exist_ok=True)
TEAL, CHALK = (42, 157, 138, 255), (216, 210, 196, 255)
SS = 4   # supersample, then shrink, for clean edges

def icon(size, mark_scale, radius_frac):
    n = size * SS
    img = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = int(n * radius_frac)
    if r: d.rounded_rectangle([0, 0, n - 1, n - 1], radius=r, fill=TEAL)
    else: d.rectangle([0, 0, n, n], fill=TEAL)
    s = n / 256 * mark_scale
    off = (n - 256 * s) / 2
    P = lambda x, y: (off + x * s, off + y * s)
    d.polygon([P(102, 26), P(154, 26), P(147, 180), P(109, 180)], fill=CHALK)
    d.rectangle([P(22, 180), P(234, 226)], fill=CHALK)
    return img.resize((size, size), Image.LANCZOS)

icon(192, 1.0, 56 / 256).save(out / "icon-192.png")
icon(512, 1.0, 56 / 256).save(out / "icon-512.png")
icon(512, 0.68, 0).save(out / "icon-maskable-512.png")      # full bleed, mark inside the safe zone
icon(180, 0.78, 0).save(out / "apple-touch-icon.png")        # iOS rounds it itself
print("wrote", ", ".join(sorted(p.name for p in out.glob("*.png"))))
