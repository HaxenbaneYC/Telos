#!/usr/bin/env python3
"""Builds the single-file app from src/.

    python3 build.py                 -> coach.html          (live: real storage key, no sample data)
    python3 build.py --preview       -> coach-preview.html  (sample data, separate storage key)

The food table in data/foods.tsv is embedded in the file, so the app stays one file that opens
offline. Regenerate it from the USDA database with data/build-foods.py."""
import sys, pathlib
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
