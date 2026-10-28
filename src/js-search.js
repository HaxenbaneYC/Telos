
  // ── Food search: the USDA table that ships inside this file. Offline, exact, no Claude needed. ──
  var DBR = null;
  function dbLoad() {
    if (DBR) return DBR;
    var el = document.getElementById("foodsDB"), out = [];
    (el ? el.textContent : "").split("\n").forEach(function (ln) {
      var a = ln.split("\t");
      if (a.length < 6) return;
      out.push({ id: a[0], d: a[1], dl: a[1].toLowerCase(), k: +a[2], p: +a[3], f: +a[4], c: +a[5], por: a[6] || "" });
    });
    DBR = out;
    return out;
  }
  function wordAt(dl, tok) {
    var p = dl.indexOf(tok);
    while (p >= 0) {
      if (p === 0 || !/[a-z0-9]/.test(dl.charAt(p - 1))) return p;
      p = dl.indexOf(tok, p + 1);
    }
    return -1;
  }
  // Every word must start a word in the description. Plain, short, raw entries rank first.
  function searchFoods(q) {
    var toks = q.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    if (!toks.length) return [];
    var db = dbLoad(), res = [], i, j;
    for (i = 0; i < db.length; i++) {
      var r = db[i], dl = r.dl, ok = true, score = 0;
      for (j = 0; j < toks.length; j++) {
        var pos = wordAt(dl, toks[j]);
        if (pos < 0) { ok = false; break; }
        score += pos === 0 ? 0 : 14 + Math.min(pos, 60) / 4;
        var after = dl.charAt(pos + toks[j].length), after2 = dl.charAt(pos + toks[j].length + 1);
        var whole = !/[a-z0-9]/.test(after) || (after === "s" && !/[a-z0-9]/.test(after2));
        if (whole) score -= 14;                                    // "egg" is Egg, not Eggplant
      }
      if (!ok) continue;
      score += dl.length / 4 + (dl.split(",").length - 1) * 3;
      if (dl.indexOf(toks[0] + ",") === 0) score -= 8;
      if (dl.indexOf(", " + toks[0] + ",") >= 0) score -= 8;                // "Fish, salmon, ..." counts as salmon
      if (/, whole\b/.test(dl)) score -= 3;               // "Rice, white..." before "Rice noodles"
      if (/, raw\b|, fresh\b/.test(dl)) score -= 12;
      if (!/dry|dried|powder|canned|evaporated|condensed|frozen/.test(q.toLowerCase()) && /\b(dry|dried|powder|evaporated|condensed|canned)\b/.test(dl)) score += 10;
      if (/\bcooked\b|\broasted\b|\bboiled\b/.test(dl)) score -= 4;
      if (/^[A-Z0-9'&-]{3,}\b/.test(r.d)) score += 10;                          // a brand name first
      res.push([score, i]);
    }
    res.sort(function (a, b) { return a[0] - b[0]; });
    return res.slice(0, 12).map(function (x) { return db[x[1]]; });
  }
  function cleanName(d) { return d.replace(/\s*\([^)]*\)/g, "").replace(/\s+/g, " ").trim(); }
  function hitsHtml() {
    if (!sh.q || !sh.q.trim()) return '<p class="aihint" style="margin-top:12px">Type a food, like orange juice or chicken breast. Values are USDA, per 100 g.</p>';
    if (!sh.hits.length) return '<p class="aihint" style="margin-top:12px">Nothing matches that. Try fewer words, or use Describe or Label.</p>';
    return '<div class="fgroup" style="margin-top:12px">' + sh.hits.map(function (r, i) {
      return '<button class="opt" data-hit="' + i + '"><span class="ob"><span class="on1">' + esc(cleanName(r.d)) + '</span><span class="on2">per 100 g · ' + r.k + " kcal · " + r.p + "P " + r.f + "F " + r.c + "C</span></span></button>";
    }).join("") + "</div>";
  }
  // The portions a food comes with: cup, tbsp, slice and so on, each as grams for one.
  function unitsOf(r) {
    var u = [{ v: "g", l: "g", g: 1 }], flOz = 0;
    r.por.split("|").forEach(function (x) {
      var a = x.split("~");
      if (a.length < 3) return;
      var amt = +a[0], mod = a[1], g = +a[2];
      if (!(amt > 0) || !(g > 0)) return;
      var per = g / amt;
      if (mod === "fl oz") flOz = per;
      var lab = mod.length > 30 ? mod.slice(0, 28) + "…" : mod;
      u.push({ v: "p" + u.length, l: lab + " (" + Math.round(per) + " g)", g: per });
    });
    if (flOz) u.splice(1, 0, { v: "ml", l: "ml", g: flOz / 29.5735 });
    return u;
  }
  function findBlock() {
    var q = '<label class="flabel" for="qIn">Search foods</label>' +
      '<input id="qIn" type="search" autocomplete="off" enterkeyhint="search" placeholder="Orange juice, chicken breast, oats…" value="' + esc(sh.q || "") + '">';
    if (sh.pick) {
      var r = sh.pick;
      return '<div class="lblhead"><b>' + esc(cleanName(r.d)) + '</b><span>USDA per 100 g · ' + r.k + " kcal · " + r.p + "P " + r.f + "F " + r.c + 'C</span></div>' +
        '<button class="sbtn" style="margin-top:10px;flex:none;width:100%" data-unpick>Search for something else</button>';
    }
    return q + '<div id="qRes">' + hitsHtml() + "</div>";
  }
  function pickFood(i) {
    var r = sh.hits[i]; if (!r) return;
    sh.pick = r; sh.units = unitsOf(r); sh.err = "";
    var liquid = sh.units.some(function (u) { return u.v === "ml"; });
    sh.amt = liquid ? { n: 250, u: "ml" } : { n: 100, u: "g" };
    sh.draft = { name: "", k: "", p: "", f: "", c: "", src: "database" };
    sh.note = ""; sh.ready = true; foodCalc(); paintSheet(); toForm();
  }
  // grams eaten -> macros, from the per-100 g row
  function foodCalc() {
    var r = sh.pick, a = sh.amt; if (!r || !a || !(a.n > 0)) return;
    var un = null;
    sh.units.forEach(function (u) { if (u.v === a.u) un = u; });
    if (!un) return;
    var g = a.n * un.g, f = g / 100;
    sh.draft.k = String(Math.round(r.k * f)); sh.draft.p = String(r1(r.p * f)); sh.draft.f = String(r1(r.f * f)); sh.draft.c = String(r1(r.c * f));
    var amtText = a.u === "g" ? Math.round(g) + " g" : (a.u === "ml" ? a.n + " ml" : a.n + " × " + un.l.replace(/ \(.*$/, ""));
    var short = cleanName(r.d).split(",").slice(0, 2).join(",").trim();
    sh.draft.name = (short + " (" + amtText + ")").slice(0, 60);
    sh.note = "About " + Math.round(g) + " g from the USDA table." + (a.u === "ml" ? " Millilitres use this food’s own density." : "");
  }
  function calcAmount() { if (sh.tab === "find") foodCalc(); else labelCalc(); }
