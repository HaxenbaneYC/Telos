"""Compact export of the USDA subset for the Telos app.
Reads offline_nutrition.db (read-only), writes one line per food:
  id \t description \t kcal \t protein \t fat \t carbs \t portions
portions = amount~modifier~grams joined by |   (grams for that amount)
All nutrient values are per 100 g."""
import sqlite3, sys, re
src, dst = sys.argv[1], sys.argv[2]
c = sqlite3.connect("file:%s?mode=ro" % src, uri=True)
SKIP = ("babyfood", "infant formula")
foods, seen = [], set()
for fid, d, k, c_, f, p in c.execute("select fdc_id, description, calories, carbs_g, fat_g, protein_g from foods order by fdc_id"):
    dl = d.lower()
    if dl.startswith(SKIP): continue
    key = (d, round(k), round(p, 1), round(f, 1), round(c_, 1))
    if key in seen: continue
    seen.add(key)
    foods.append((int(fid), d.replace("\t", " ").replace("\n", " "), k, p, f, c_))
ids = {x[0] for x in foods}
por = {}
for fid, amt, mod, g in c.execute("select fdc_id, amount, modifier, gram_weight from portions"):
    fid = int(fid)
    if fid not in ids or not g or g <= 0 or not amt or amt <= 0: continue
    m = (mod or "").strip()
    if m in ("oz", "lb", "") or "yield" in m or "refuse" in m: continue     # weights are what grams already are
    por.setdefault(fid, []).append((amt, m[:48], g))
def prio(m):
    m = m[1]
    for i, w in enumerate(("fl oz", "cup", "tbsp", "tsp", "slice", "medium", "large", "small", "piece", "serving", "bar", "egg")):
        if m.startswith(w): return i
    return 99
lines = []
for fid, d, k, p, f, c_ in foods:
    ps = sorted(set(por.get(fid, [])), key=lambda x: (prio(x), x[1]))[:6]
    lines.append("\t".join([str(fid), d, str(int(round(k))), "%g" % round(p, 1), "%g" % round(f, 1), "%g" % round(c_, 1),
                            "|".join("%g~%s~%g" % (round(a, 2), m, round(g, 1)) for a, m, g in ps)]))
open(dst, "w", encoding="utf-8").write("\n".join(lines))
print(len(foods), "foods,", sum(1 for x in foods if x[0] in por), "with portions,", len("\n".join(lines)) // 1024, "KB")
