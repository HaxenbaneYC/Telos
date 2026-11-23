// Does the day add up? Builds every day of the 13 weeks from the menu (lunch is the box from the night before)
// and compares the day with its phase's calories and protein. Also checks that lunch is yesterday's dinner dish.
//   node tests/day-accuracy.js [coach.html]       (needs Playwright; exits 1 if it misses)
var chromium = require("playwright").chromium, fs = require("fs"), os = require("os"), path = require("path");
var file = path.resolve(process.argv[2] || path.join(__dirname, "..", "coach.html"));
var html = fs.readFileSync(file, "utf8"), end = html.lastIndexOf("})();");
html = html.slice(0, end) + "window.__T={planOn:planOn,phaseOn:phaseOn,shift:shift,MEALS:MEALS,START:START};\n" + html.slice(end);
var tmp = path.join(os.tmpdir(), "telos-day-accuracy.html"); fs.writeFileSync(tmp, html);
var LIMIT = { day: 6, protein: 3 };   // percent
(async function () {
  var b = await chromium.launch(), bad = 0;
  var p = await b.newPage(); await p.goto("file://" + tmp); await p.waitForTimeout(300);
  var rows = await p.evaluate(function () {
    var T = window.__T, out = [], d = T.START;
    for (var i = 0; i < 91; i++) {
      var pl = T.planOn(d).out, ph = T.phaseOn(d), t = { k: 0, p: 0 };
      T.MEALS.forEach(function (m) { t.k += pl[m[0]].tot.k; t.p += pl[m[0]].tot.p; });
      var box = T.planOn(T.shift(d, -1)).out.m5, names = function (m) { return m.parts.map(function (x) { return x.name; }).join("+"); };
      var carbs = pl.m5.parts.filter(function (x) { return x.cat === "carb" && !x.noun && /Rice|Pasta|Potato/.test(x.name); }).map(function (x) { return Math.round(x.t.k); });
      out.push({ d: d, n: ph.n, err: (t.k - ph.kcal) / ph.kcal * 100, perr: (t.p - ph.p) / ph.p * 100,
                 same: names(pl.m2) === names(box), carb: carbs.length ? Math.min.apply(null, carbs) : 999 });
      d = T.shift(d, 1);
    }
    return out;
  });
  var worst = 0, worstP = 0;
  rows.forEach(function (r) {
    var lim = LIMIT.day, ok = Math.abs(r.err) <= lim && Math.abs(r.perr) <= LIMIT.protein && r.same && r.carb >= 100;
    worst = Math.max(worst, Math.abs(r.err));
    worstP = Math.max(worstP, Math.abs(r.perr));
    if (!ok) { bad++; console.log("FAIL " + r.d + " " + r.n + ": " + r.err.toFixed(1) + "% kcal, " + r.perr.toFixed(1) + "% protein, lunch is last night's dish: " + r.same + ", smallest carb portion " + r.carb + " kcal"); }
  });
  console.log((bad ? "FAIL " : "ok   ") + rows.length + " days: worst " + worst.toFixed(1) + "% off the calories, worst protein " + worstP.toFixed(1) + "%, lunch always the same dish as last night's dinner");
  await b.close(); process.exit(bad ? 1 : 0);
})();
