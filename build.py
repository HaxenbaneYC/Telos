#!/usr/bin/env python3
"""Builds the single-file app from src/.

    python3 build.py                 -> coach.html          (live: real storage key, no sample data)
    python3 build.py --preview       -> coach-preview.html  (sample data, separate storage key)

The plain build also writes the installable phone app into docs/ (index.html, sw.js): the same app in a
complete page with a manifest, icons and an offline service worker. Serve docs/ over https (GitHub Pages
from main /docs, or any static host) and "Add to Home Screen" gives a full-screen app.

The food table in data/foods.tsv is embedded in the file, so the app stays one file that opens
offline. Regenerate it from the USDA database with data/build-foods.py."""
import sys, pathlib, hashlib
root = pathlib.Path(__file__).resolve().parent
read = lambda p: p.read_text(encoding="utf-8")
head = read(root / "src" / "head.html")
marker = "<script>\n(function () {"
assert head.count(marker) == 1, "script marker not found in src/head.html"
blob = read(root / "data" / "foods.tsv")
assert "</script" not in blob.lower()
head = head.replace(marker, '<script type="text/plain" id="foodsDB">' + blob + "</script>\n" + marker)
out = head + read(root / "src" / "js-data.js")
for name in ("js-today.js", "js-search.js", "js-tabs.js", "js-init.js"):
    out += read(root / "src" / name)
preview = "--preview" in sys.argv
if not preview:
    out = out.replace("var PREVIEW = true;", "var PREVIEW = false;", 1).replace("<title>Telos Redesign</title>", "<title>Telos</title>", 1)
dest = root / ("coach-preview.html" if preview else "coach.html")
dest.write_text(out, encoding="utf-8")
print("wrote", dest.name, round(len(out) / 1024), "KB")

if not preview:
    site = root / "docs"
    (site / "icons").mkdir(parents=True, exist_ok=True)
    page_head = (
        '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        '<meta name="theme-color" content="#0A0C0B" media="(prefers-color-scheme: dark)">\n'
        '<meta name="theme-color" content="#F0EFEB" media="(prefers-color-scheme: light)">\n'
        '<link rel="manifest" href="manifest.webmanifest">\n'
        '<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">\n'
        '<meta name="apple-mobile-web-app-capable" content="yes">\n'
        '<meta name="mobile-web-app-capable" content="yes">\n'
        '<meta name="apple-mobile-web-app-title" content="Telos">\n'
        '<meta name="apple-mobile-web-app-status-bar-style" content="black">\n'
    )
    register = ('<script>if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {'
                ' window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); }); }</script>\n')
    page = page_head + out + "\n" + register
    (site / "index.html").write_text(page, encoding="utf-8")
    version = hashlib.sha1(page.encode("utf-8")).hexdigest()[:10]
    (site / "sw.js").write_text(read(root / "src" / "sw.js").replace("__VERSION__", version), encoding="utf-8")
    print("wrote docs/index.html + docs/sw.js", version)
