# Telos: logo guide (one page)

## 1. The logo
- **Idea**: the Greek tau, first letter of *telos*. A bar whose right end turns down where the path arrives: the end a thing is aimed at.
- **Versions**: horizontal lockup (default) · stacked lockup · symbol · wordmark · small-size symbol.
- **The wordmark is drawn, not typed.** TELOS is outlined shapes in the same stroke weight as the symbol. Never retype it in a font. (The app header keeps live text in IBM Plex Mono for the page; the logo files are the logo.)

## 2. Files
| File (in `svg/`) | Use |
|---|---|
| `telos-horizontal-on-dark.svg` | Dark grounds. Teal symbol, chalk wordmark. |
| `telos-horizontal-on-light.svg` | Light grounds. Deep-teal symbol, basalt wordmark. |
| `telos-stacked-on-dark/-on-light.svg` | Square-ish spaces, posters, splash. |
| `telos-symbol-color.svg` / `-color-light.svg` | Symbol alone, on dark / on light. |
| `telos-symbol-small.svg` | **Below 48 px.** Heavier, tighter. Black; recolour freely. |
| `telos-*-black.svg` / `-white.svg` | One colour: stamps, engraving, print, reversed on a photo. |
| `web/` | favicon.ico/svg, app icons 192/512, maskable, apple-touch, manifest and head snippet. |

## 3. Clear space and minimum size
Keep **half the cap height of TELOS** free on all sides (for the symbol alone: one bar thickness, 1/6 of its height). It scales with the logo.

| Version | Screen | Print |
|---|---|---|
| Horizontal | 96 px wide | 25 mm wide |
| Stacked | 64 px wide | 18 mm wide |
| Symbol | 24 px (full) · 16 px (small cut) | 6 mm (small cut) |

## 4. Colour
| Name | Role | HEX | RGB | CMYK (approx.) |
|---|---|---|---|---|
| Teal | Symbol on dark; icon tile | #2A9D8A | 42 157 138 | 73 0 12 38 |
| Deep teal | Symbol on light | #0F6B5E | 15 107 94 | 86 0 12 58 |
| Chalk | Wordmark on dark | #D8D2C4 | 216 210 196 | 0 3 9 15 |
| Basalt | Wordmark on light; mark on teal | #0A0C0B | 10 12 11 | 17 0 8 95 |

Approved pairs and contrast: teal on basalt **5.9:1** · chalk on basalt **13:1** · deep teal on off-white (#F0EFEB) **5.6:1** · basalt on teal (the app icon) **5.9:1**.
Not approved: chalk on teal (2.2:1) and white on teal (3.3:1) for anything that must be read at small size. Red (#FF5C45) is never part of the logo: in the app it means "over target" and nothing else.

## 5. App icon
Teal tile, basalt small-cut tau, no wordmark. The OS rounds the corners. Maskable version keeps the mark inside the safe circle.

## 6. Don'ts
Don't stretch or rotate · don't recolour outside the palette · don't add shadows, outlines or gradients · don't use the full symbol under 48 px (use the small cut) · don't separate or re-space the lockup · don't retype the wordmark · don't put the teal symbol on a busy photo (use white or black one-colour).

## 7. Handover notes
- Everything is generated from numbers (`build_kit.py`): stroke 28 on a 168-unit symbol = 16 on the 96-unit wordmark, so the weights match side by side. Change the numbers, rebuild, re-audit.
- SVG audit: 100/100 on lockups and wordmark, 99/100 on the symbols (the one note is the deliberate optical offset).
- Not trademark-searched. The tau is common in Greek-letter marks; if Telos ever becomes a product, run a search first.
