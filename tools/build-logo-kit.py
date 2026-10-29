"""Telos logo kit, direction A (tau). Everything is generated from numbers so it can be rebuilt and checked.

Grid: symbols on 256 x 256, lockups with height 256. Stroke weights are shared: the symbol's bar and stem are
28 units on a 168-unit-tall mark, the wordmark's strokes are 16 on a 96-unit cap height, and 28 * (96 / 168) = 16,
so the two are the same weight when set side by side.

Palette (the app's own): teal 2A9D8A, deep teal 0F6B5E (for light grounds), chalk D8D2C4, basalt 0A0C0B.
"""
import os

TEAL, TEAL_DP, CHALK, BASALT = "#2A9D8A", "#0F6B5E", "#D8D2C4", "#0A0C0B"

def f(x):
    return ("%.2f" % x).rstrip("0").rstrip(".")

# ---------------------------------------------------------------------------------------------------- the symbol
def tau_path(t=28, bar_w=132, R=68, leg=28, stem_x=52, stem_h=140, dy=0.0):
    """A bar whose right end turns down on a quarter ring of outer radius R, plus a stem. Clockwise outline.
    Returns (path data, width, height) with the shape centred on the 256 grid; dy moves it down (optical centring)."""
    r = R - t
    w = bar_w + R
    h = max(stem_h + t, R + leg)
    x0, y0 = (256 - w) / 2.0, (256 - h) / 2.0 + dy
    X = lambda x: f(x0 + x)
    Y = lambda y: f(y0 + y)
    d = ("M%s %sH%sA%s %s 0 0 1 %s %sV%sH%sV%sA%s %s 0 0 0 %s %sH%sZ" %
         (X(0), Y(0), X(bar_w), R, R, X(bar_w + R), Y(R), Y(R + leg), X(bar_w + R - t), Y(R),
          r, r, X(bar_w), Y(t), X(0)))
    d += "M%s %sH%sV%sH%sZ" % (X(stem_x), Y(t - 6), X(stem_x + t), Y(t + stem_h), X(stem_x))
    return d, w, h

MASTER = dict(t=28, bar_w=132, R=68, leg=28, stem_x=52, stem_h=140)      # large sizes and lockups
SMALL = dict(t=44, bar_w=112, R=76, leg=44, stem_x=34, stem_h=124)       # 16-48 px: heavier, tighter, bigger on the canvas

# ---------------------------------------------------------------------------------------------------- the wordmark
H, S = 96, 16     # cap height, stroke
def rect(x, y, w, h):
    return "M%s %sH%sV%sH%sZ" % (f(x), f(y), f(x + w), f(y + h), f(x))
def letter_T(x):
    return rect(x, 0, 64, S) + rect(x + 24, 0, S, H)
def letter_E(x):
    return rect(x, 0, S, H) + rect(x, 0, 56, S) + rect(x, 40, 48, S) + rect(x, H - S, 56, S)
def letter_L(x):
    return rect(x, 0, S, H) + rect(x, H - S, 52, S)
def letter_O(x, w=64, ro=28, ri=12):
    ix, iy = x + S, S
    outer = ("M%s 0H%sA%s %s 0 0 1 %s %sV%sA%s %s 0 0 1 %s %sH%sA%s %s 0 0 1 %s %sV%sA%s %s 0 0 1 %s 0Z" %
             (f(x + ro), f(x + w - ro), ro, ro, f(x + w), ro, f(H - ro), ro, ro, f(x + w - ro), H, f(x + ro), ro, ro, f(x), f(H - ro), f(ro), ro, ro, f(x + ro)))
    iw, ih = w - 2 * S, H - 2 * S
    inner = ("M%s %sA%s %s 0 0 0 %s %sV%sA%s %s 0 0 0 %s %sH%sA%s %s 0 0 0 %s %sV%sA%s %s 0 0 0 %s %sZ" %
             (f(x + S + ri), S, ri, ri, f(x + S), f(S + ri), f(H - S - ri), ri, ri, f(x + S + ri), f(H - S), f(x + w - S - ri), ri, ri,
              f(x + w - S), f(H - S - ri), f(S + ri), ri, ri, f(x + w - S - ri), S))
    return outer + inner
def letter_S(x):
    # two stacked semicircles (centre line radius 20, stroke 16) with a short bar at each end
    top = "M%s 0H%sV%sH%sZ" % (f(x + 26), f(x + 48), S, f(x + 26))
    ring1 = "M%s 56A28 28 0 0 1 %s 0V16A12 12 0 0 0 %s 40Z" % (f(x + 28), f(x + 28), f(x + 28))
    ring2 = "M%s 40A28 28 0 0 1 %s 96V80A12 12 0 0 0 %s 56Z" % (f(x + 28), f(x + 28), f(x + 28))
    bot = "M%s 80H%sV96H%sZ" % (f(x + 8), f(x + 30), f(x + 8))
    return top + ring1 + ring2 + bot
GAPS = (22, 28, 22, 26)      # optical: the T's bar and the L's open side need less
def wordmark_path():
    parts, x = [], 0
    for fn, wd, gp in ((letter_T, 64, GAPS[0]), (letter_E, 56, GAPS[1]), (letter_L, 52, GAPS[2]), (letter_O, 64, GAPS[3]), (letter_S, 56, 0)):
        parts.append(fn(x)); x += wd + gp
    return "".join(parts), x - 0     # (data, width)
WM_D, WM_W = wordmark_path()

# ---------------------------------------------------------------------------------------------------- assembling files
def svg(vb_w, vb_h, body, title, bg=None):
    r = '<rect width="%s" height="%s" fill="%s"/>' % (vb_w, vb_h, bg) if bg else ""
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %s %s" width="%s" height="%s" role="img" aria-labelledby="t">'
            '<title id="t">%s</title>%s%s</svg>\n' % (vb_w, vb_h, vb_w, vb_h, title, r, body))
def path(d, fill):
    return '<path fill="%s" d="%s"/>' % (fill, d)

SYM_D, SYM_W, SYM_H = tau_path(dy=10, **MASTER)          # optical: mass centre sits ~16 above the middle
SML_D, SML_W, SML_H = tau_path(dy=6, **SMALL)

def horizontal(sym_fill, wm_fill, small=False):
    """Symbol height = cap height; the stem's foot sits on the baseline. 256 tall canvas, content centred."""
    d, w, h = tau_path(dy=0, **MASTER)
    sc = H / float(h)
    gap = 44
    total = w * sc + gap + WM_W
    pad = 40
    W = int(round(total + 2 * pad))
    top = (256 - H) / 2.0
    # symbol: tau_path is centred on the 256 grid, so move its box to (pad, top)
    x_off = pad - ((256 - w) / 2.0) * sc
    y_off = top - ((256 - h) / 2.0) * sc
    sym = '<g transform="translate(%s %s) scale(%s)">%s</g>' % (f(x_off), f(y_off), f(sc), path(d, sym_fill))
    wm = '<g transform="translate(%s %s)">%s</g>' % (f(pad + w * sc + gap), f(top), path(WM_D, wm_fill))
    return sym + wm, W

def stacked(sym_fill, wm_fill):
    d, w, h = tau_path(dy=0, **MASTER)
    W, pad, gap, wsc = 400, 30, 52, 0.78
    # the symbol's own box sits centred on a 256 grid: move its top-left to (centre - w/2, pad)
    sym = '<g transform="translate(%s %s)">%s</g>' % (f((W - 256) / 2.0), f(pad - (256 - h) / 2.0), path(d, sym_fill))
    wm = '<g transform="translate(%s %s) scale(%s)">%s</g>' % (f((W - WM_W * wsc) / 2.0), f(pad + h + gap), f(wsc), path(WM_D, wm_fill))
    return sym + wm, W, int(pad + h + gap + H * wsc + pad)

def main(out="brand-build"):
    os.makedirs(out + "/svg", exist_ok=True)
    w = lambda name, text: open("%s/svg/%s" % (out, name), "w").write(text)
    # symbol
    for tag, fill in (("color", TEAL), ("color-light", TEAL_DP), ("black", "#000000"), ("white", "#FFFFFF")):
        w("telos-symbol-%s.svg" % tag, svg(256, 256, path(SYM_D, fill), "Telos symbol"))
    w("telos-symbol-small.svg", svg(256, 256, path(SML_D, "#000000"), "Telos symbol, small-size cut"))
    # wordmark
    for tag, fill in (("black", "#000000"), ("white", "#FFFFFF"), ("chalk", CHALK), ("basalt", BASALT)):
        w("telos-wordmark-%s.svg" % tag, svg(int(WM_W), H, path(WM_D, fill), "Telos wordmark"))
    # lockups
    for tag, (sf, mf) in (("on-dark", (TEAL, CHALK)), ("on-light", (TEAL_DP, BASALT)), ("black", ("#000000", "#000000")), ("white", ("#FFFFFF", "#FFFFFF"))):
        body, W = horizontal(sf, mf)
        w("telos-horizontal-%s.svg" % tag, svg(W, 256, body, "Telos"))
        body, W, Hh = stacked(sf, mf)
        w("telos-stacked-%s.svg" % tag, svg(W, Hh, body, "Telos"))
    print("kit/svg written; wordmark width", WM_W)

if __name__ == "__main__":
    main()
