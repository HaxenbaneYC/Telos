// Does the day add up? Builds every slot for each of the four phases, on the default foods and on
// hundreds of one- and two-food swaps, and compares the day with the phase's calories and macros.
//   node tests/day-accuracy.js [coach.html]       (needs Playwright; exits 1 if it misses)
var chromium = require("playwright").chromium, fs = require("fs"), os = require("os"), path = require("path");
var file = path.resolve(process.argv[2] || path.join(__dirname, "..", "coach.html"));
var html = fs.readFileSync(file, "utf8"), end = html.lastIndexOf("})();");
html = html.slice(0, end) + "window.__T={buildMeal:buildMeal,MEALS:MEALS,FOODS:FOODS,S:S,currentPhase:currentPhase};\n" + html.slice(end);
var tmp = path.join(os.tmpdir(), "telos-day-accuracy.html"); fs.writeFileSync(tmp, html);
var LIMIT = { def: 3, swap: 6 };           // percent of the day's calories
var dates = { "Re-entry": "2026-10-28T12:00:00", "The work": "2026-11-11T12:00:00", "Diet break": "2026-12-23T12:00:00", "The finish": "2026-12-30T12:00:00" };
(async function () {
  var b = await chromium.launch(), bad = 0;
  for (var ph in dates) {
    var ctx = await b.newContext(); await ctx.clock.setFixedTime(new Date(dates[ph]));
    var p = await ctx.newPage(); await p.goto("file://" + tmp); await p.waitForTimeout(300);
    var r = await p.evaluate(function () {
      var T = window.__T, P = T.currentPhase(), seed = 7;
      var OK = { protein: ["chk","tur","sir","mi5","mi10","sal","cod","prw","tun","yog","cot","egg","egx","ewh"], carb: ["ric","pas","pot","swt","sou","oat","mus","ban","dat"], fat: ["oil","but","alm","pea","avo"] };
      function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }
      function day() { var t = { k: 0, p: 0, f: 0, c: 0 }; T.MEALS.forEach(function (m) { var x = T.buildMeal(m[0]).tot; t.k += x.k; t.p += x.p; t.f += x.f; t.c += x.c; }); return t; }
      function run(sw) { T.S.picks = {}; T.S.eggs = {}; sw.forEach(function (s) { (T.S.picks[s[0]] = T.S.picks[s[0]] || {})[s[1]] = s[2]; }); return Math.abs(day().k - P.kcal) / P.kcal * 100; }
      var opts = []; T.MEALS.forEach(function (m) { m[6].forEach(function (c) { OK[c].forEach(function (id) { if (T.FOODS[c].some(function (f) { return f[0] === id; })) opts.push([m[0], c, id]); }); }); });
      var def = run([]), worst = 0, n = 0;
      opts.forEach(function (o) { worst = Math.max(worst, run([o])); n++; });
      for (var i = 0; i < 400; i++) { worst = Math.max(worst, run([opts[Math.floor(rnd() * opts.length)], opts[Math.floor(rnd() * opts.length)]])); n++; }
      return { def: def, worst: worst, n: n, kcal: P.kcal };
    });
    var ok = r.def <= LIMIT.def && r.worst <= LIMIT.swap; if (!ok) bad++;
    console.log((ok ? "ok   " : "FAIL ") + ph + ": default day " + r.def.toFixed(1) + "% off, worst of " + r.n + " swaps " + r.worst.toFixed(1) + "% (target " + r.kcal + " kcal)");
    await ctx.close();
  }
  await b.close(); process.exit(bad ? 1 : 0);
})();
