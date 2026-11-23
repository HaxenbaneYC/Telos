  var START = "2026-11-22", TARGET = 69;

  var PHASES = [
    { n: "Re-entry",   w: [1, 2],   kcal: 2350, p: 185, f: 78, c: 215,
      d: "Steps 5k to 8k. 3–4 reps in reserve. Small deficit on purpose." },
    { n: "The work",   w: [3, 4],   kcal: 2240, p: 191, f: 74, c: 200,
      d: "Steps 10k. Full intensity. One run or ride weekly." },
    { n: "Diet break", w: [5, 5],   kcal: 2700, p: 185, f: 85, c: 285,
      d: "Maintenance over Christmas, on purpose. Resets hormones and appetite." },
    { n: "The work",   w: [6, 9],   kcal: 2240, p: 191, f: 74, c: 200,
      d: "Back to the deficit. Steps 10k, full intensity, one run or ride weekly." },
    { n: "The finish", w: [10, 13], kcal: 2150, p: 195, f: 70, c: 185,
      d: "Steps 10–12k. Hold volume. Keep the incline walks easy, add nothing harder. Abs show here." }
  ];

  // per 100 g before cooking (raw meat, dry rice and pasta): [id, name, kcal, P, F, C]
  var FOODS = {
    protein: [
      ["chk",  "Chicken breast",         165, 31,   3.6, 0],
      ["thi",  "Chicken thigh, skinless",177, 24,   8.5, 0],
      ["tur",  "Turkey breast",          163, 29,   4,   0],
      ["sir",  "Sirloin, trimmed",       180, 27,   8,   0],
      ["rib",  "Ribeye",                 250, 23,  17,   0],
      ["lam",  "Lamb leg",               250, 24,  17,   0],
      ["mi5",  "Lean mince 5%",          137, 21,   5,   0],
      ["mi10", "Lean mince 10%",         176, 20,  10,   0],
      ["sal",  "Salmon",                 208, 20,  13,   0],
      ["cod",  "Cod or white fish",       82, 18,   0.7, 0],
      ["prw",  "Prawns",                  85, 20,   0.5, 0],
      ["tun",  "Tuna, drained",          110, 25,   1,   0],
      ["yog",  "Greek yogurt",            63, 10,   0.5, 4.5],
      ["cot",  "Cottage cheese",          98, 11,   4.3, 3.4],
      ["egg",  "Whole eggs",             143, 12.6, 9.5, 0.7],
      ["egx",  "Eggs — mixed",         143, 12.6, 9.5, 0.7],
      ["ewh",  "Egg whites",              52, 11,   0.2, 0.7],
      ["whe",  "Whey powder",            400, 80,   7,   8]
    ],
    carb: [
      ["ric", "Rice, dry",          365,  7.1, 0.7, 80],
      ["pas", "Pasta, dry",         371, 13,   1.5, 75],
      ["pot", "Potato, raw",         77,  2,   0.1, 17],
      ["swt", "Sweet potato, raw",   86,  1.6, 0.1, 20],
      ["sou", "Sourdough",          270,  9,   2,   52],
      ["oat", "Oats, dry",          379, 13,   7,   67],
      ["mus", "Muesli",             360, 10,   6,   65],
      ["tor", "Flour wrap",         297,  8,   7.6, 49.3],
      ["ban", "Banana",              89,  1.1, 0.3, 23],
      ["dat", "Dates",              277,  1.8, 0.2, 75]
    ],
    fat: [
      ["oil", "Olive oil",  884,  0,   100, 0],
      ["but", "Butter",     717,  0.9,  81, 0.1],
      ["alm", "Almonds",    579, 21,    50, 22],
      ["pea", "Peanuts",    567, 26,    49, 16],
      ["avo", "Avocado",    160,  2,    15, 9]
    ]
  };
  function hasFood(cat, id) {
    var a = FOODS[cat];
    if (!a) return false;
    for (var i = 0; i < a.length; i++) if (a[i][0] === id) return true;
    return false;
  }
  function food(cat, id) {
    var a = FOODS[cat];
    for (var i = 0; i < a.length; i++) if (a[i][0] === id) return a[i];
    return a[0];
  }

  // Things you count rather than weigh. g = one piece, so the scale
  // is still right underneath, but the number you read is pieces.
  var PIECE = {
    egg: { g: 50,  one: "whole egg",       many: "whole eggs" },
    ewh: { g: 33,  one: "egg white",       many: "egg whites" },
    sou: { g: 55,  one: "slice sourdough", many: "slices sourdough" },
    tor: { g: 49,  one: "wrap",            many: "wraps" },
    ban: { g: 118, one: "banana",          many: "bananas" },
    dat: { g: 8,   one: "date",            many: "dates" }
  };
  function round5(x) { return Math.max(0, Math.round(x / 5) * 5); }
  function pieces(id, n) {
    var pc = PIECE[id];
    return { g: n * pc.g, n: n, noun: (n === 1 ? pc.one : pc.many), sub: (n * pc.g) + " g" };
  }
  // Rounds a portion the way it is actually served: to the piece if it
  // has pieces, to 5 g if it does not.
  function qty(id, g) {
    var pc = PIECE[id];
    if (!pc) { var r = round5(g); return { g: r }; }
    return pieces(id, Math.max(1, Math.round(g / pc.g)));
  }
  // How many of the eggs are whole when the mix is chosen. The rest are whites.
  function wholeEggs(mealId) {
    var v = S.eggs && S.eggs[mealId];
    return (v == null) ? 3 : v;
  }

  // [id, time, name, share of day's P / F / C, categories asked for, defaults]
  // Shares sum to 1.00 on each macro, so every slot scales with the phase target.
  // No choosing: breakfast, snack and pre-gym are always the same, lunch and dinner come from MENU.
  // Lunch and dinner have the same share because lunch is yesterday's dinner, cooked twice.
  var MEALS = [
    ["m1", "09:00", "Breakfast",     0.22, 0.34, 0.27,  ["protein","carb"],       { protein:"egg", carb:"sou" }],
    ["m2", "13:00", "Lunch at work", 0.28, 0.20, 0.24,  ["protein","carb","fat"], { protein:"chk", carb:"ric", fat:"oil" }],
    ["m3", "16:30", "Snack",         0.22, 0.26, 0.11,  ["protein","fat"],        { protein:"yog", fat:"pea" }],
    ["m4", "19:30", "Pre-gym",       0.00, 0.00, 0.14,  ["carb"],                 { carb:"ban" }],
    ["m5", "21:30", "Dinner",        0.28, 0.20, 0.24,  ["protein","carb","fat"], { protein:"chk", carb:"ric", fat:"oil" }]
  ];

  // Milk for the day's coffee rides with breakfast, so ticking breakfast counts it. Semi-skimmed, per 100 ml.
  var MILK = { ml: 360, k: 46, p: 3.5, f: 1.7, c: 4.7 };   // three cappuccinos

  // Seven dinners on a loop. Each one is cooked for two: half that night, half boxed for the next day's lunch.
  // veg = [name, grams per portion, kcal, P, F, C per 100 g, what it is made of for the shopping list].
  // All weights are before cooking. Methods in our own words.
  var MENU_START = "2026-11-23";
  var MENU = [
    { n: "Chicken, rice and broccoli", p: "chk", c: "ric", veg: ["Broccoli", 150, 34, 2.8, 0.4, 6.6, [["Broccoli", 1]]], t: 25,
      s: ["Rice on first, enough for both portions.",
          "Chicken in strips, salt, paprika and garlic powder, tossed in the oil.",
          "Air fryer 200°C, 12–14 min, shake halfway. Cut the thickest piece: no pink, done.",
          "Broccoli into the air fryer for the last 6 min, or 4 min in the microwave with a splash of water.",
          "Split in two. Box tomorrow’s half once it stops steaming and put it straight in the fridge."] },
    { n: "Steak, air-fryer potatoes and green beans", p: "sir", c: "pot", veg: ["Green beans", 150, 31, 1.8, 0.2, 7, [["Green beans", 1]]], t: 35,
      s: ["Potatoes in 2 cm cubes, the oil and salt, air fryer 200°C for 20–22 min, shake twice.",
          "Steak out of the fridge when the potatoes go in, salted both sides.",
          "Very hot dry pan, 2–3 min a side for medium-rare at 2 cm. Rest 5 min before cutting.",
          "Green beans: 4 min in boiling water or the microwave.",
          "Slice tomorrow’s steak cold for the box. It eats fine cold or with 60 s in the microwave."] },
    { n: "Chicken thighs, sweet potato fries and courgette", p: "thi", c: "swt", veg: ["Courgette", 150, 17, 1.2, 0.3, 3.1, [["Courgette", 1]]], t: 30,
      s: ["Sweet potato in fries, half the oil and salt, air fryer 200°C for 15–18 min, shake halfway.",
          "Thighs with paprika, garlic powder and salt. Air fryer or pan, 12–15 min until the juice runs clear.",
          "Courgette in half-moons, the rest of the oil, 5 min in a hot pan.",
          "Box tomorrow’s half. The fries soften in the fridge; 3 min back in the air fryer fixes them."] },
    { n: "Beef mince pasta with tomato and spinach", p: "mi5", c: "pas", veg: ["Tinned tomatoes, onion, spinach", 200, 24, 1.4, 0.2, 5, [["Tinned chopped tomatoes", 0.5], ["Onion", 0.25], ["Spinach", 0.25]]], t: 25,
      s: ["Pasta into well-salted boiling water.",
          "Mince into a hot pan with the oil. Leave it alone 3 min so it browns, then break it up.",
          "Chopped onion in for 3 min, then the tinned tomatoes, salt and oregano. Simmer 10 min.",
          "Spinach in at the end until it wilts. Toss with the drained pasta and a splash of the pasta water.",
          "Box tomorrow’s half. It is better the next day."] },
    { n: "Chicken fajita wraps", p: "chk", c: "tor", veg: ["Peppers and onion", 150, 33, 1, 0.2, 7.7, [["Peppers", 0.5], ["Onion", 0.5]]], t: 20,
      s: ["Chicken in strips with sliced peppers and onion, the oil, paprika, cumin, garlic powder and salt.",
          "Hot pan 8–10 min, or air fryer 200°C for 12 min, shaking once.",
          "Warm the wraps 20 s each in a dry pan. A spoon of Greek yogurt works as sour cream.",
          "Box the filling and the wraps apart so the wraps don’t go soggy."] },
    { n: "Beef and rice bowl", p: "mi5", c: "ric", veg: ["Broccoli and peppers", 150, 30, 1.9, 0.35, 6.3, [["Broccoli", 0.5], ["Peppers", 0.5]]], t: 20,
      s: ["Rice on, enough for both portions.",
          "Mince into a hot pan with the oil, garlic, paprika, cumin and salt. Let it brown before you stir.",
          "Broccoli and sliced peppers into the pan for the last 5 min, with a splash of water to steam them.",
          "Rice in the bowl, beef and veg on top. Box tomorrow’s half."] },
    { n: "Chicken thigh pasta with mushrooms and spinach", p: "thi", c: "pas", veg: ["Mushrooms and spinach", 150, 23, 3, 0.4, 3.5, [["Mushrooms", 0.5], ["Spinach", 0.5]]], t: 25,
      s: ["Pasta into well-salted boiling water.",
          "Thighs in strips, the oil, salt and pepper, hot pan 8 min.",
          "Sliced mushrooms in for 4 min, a crushed garlic clove for 1, then spinach until it wilts.",
          "Off the heat, 2 tbsp Greek yogurt and a splash of pasta water: creamy, no cream. Toss with the pasta.",
          "Box tomorrow’s half."] }
  ];
  function dishOn(d) { var i = dayDiff(MENU_START, d) % MENU.length; return MENU[i < 0 ? i + MENU.length : i]; }
  // the dish a slot eats on a day: dinner is that day's dish, lunch is the day before's
  function dishFor(mealId, d) {
    d = d || pday();
    return mealId === "m5" ? dishOn(d) : mealId === "m2" ? dishOn(shift(d, -1)) : null;
  }
  // The plan can be worked out for a day other than the one on screen (lunch needs yesterday's dinner).
  var PD = null;
  function pday() { return PD || DAY; }

  // a slot's absolute targets for the phase, before any coach trim
  function planTarget(m) {
    var ph = phaseOn(pday());
    return { p: ph.p * m[3], f: ph.f * m[4], c: ph.c * m[5] };
  }
  // ...and with today's trim on the slots still to come
  function slotTarget(m) {
    var t = planTarget(m);
    if (TRIM.on && !handled(m[0])) { t.f *= 1 - TRIM.fatFrac; if (m[0] !== "m4") t.c *= 1 - TRIM.carbFrac; }
    return t;
  }

  function mealById(id) {
    for (var i = 0; i < MEALS.length; i++) if (MEALS[i][0] === id) return MEALS[i];
    return MEALS[0];
  }
  function pickFor(mealId) {
    var m = mealById(mealId), dish = dishFor(mealId), out = {};
    m[6].forEach(function (cat) { out[cat] = m[7][cat]; });
    if (dish) { out.protein = dish.p; out.carb = dish.c; }
    return out;
  }
  // Parts that are there whatever the targets: the day's milk at breakfast, the veg with lunch and dinner.
  function fixedParts(mealId) {
    if (mealId === "m1") return [{ cat: "carb", g: MILK.ml, n: MILK.ml, noun: "ml milk", sub: "semi-skimmed, coffee", name: "Milk",
      t: { k: MILK.k * MILK.ml / 100, p: MILK.p * MILK.ml / 100, f: MILK.f * MILK.ml / 100, c: MILK.c * MILK.ml / 100 } }];
    var dish = dishFor(mealId);
    if (!dish) return [];
    var v = dish.veg, u = v[1] / 100;
    return [{ cat: "carb", g: v[1], name: v[0], mix: v[6], t: { k: v[2] * u, p: v[3] * u, f: v[4] * u, c: v[5] * u } }];
  }
  // Protein hits the protein target. Carb fills the carb gap left after it.
  // Fat fills only what the first two have not already brought.
  // Every portion is rounded to how it is served — pieces or 5 g — before
  // its macros are counted, so the numbers match what you actually eat.
  function buildMealT(mealId, over) {
    var m = mealById(mealId), pick = pickFor(mealId), tgt = over || slotTarget(m);
    var tP = tgt.p, tF = tgt.f, tC = tgt.c;
    var NIL = { parts: [], t: { k:0, p:0, f:0, c:0 } };

    function mac(r, g) { var u = g/100; return { k:r[2]*u, p:r[3]*u, f:r[4]*u, c:r[5]*u }; }
    function one(cat, id, q) {
      var r = food(cat, id);
      return { parts: [{ cat:cat, g:q.g, n:q.n, noun:q.noun, sub:q.sub, name:r[1], t: mac(r, q.g) }], t: mac(r, q.g) };
    }
    function add(a, b) {
      return { parts: a.parts.concat(b.parts),
               t: { k:a.t.k+b.t.k, p:a.t.p+b.t.p, f:a.t.f+b.t.f, c:a.t.c+b.t.c } };
    }
    // need = grams of the macro at index idx this source has to deliver
    function solve(cat, idx, need) {
      var r = food(cat, pick[cat]);
      if (!r[idx]) return NIL;
      return one(cat, pick[cat], qty(pick[cat], need / (r[idx]/100)));
    }
    // Whole eggs first, up to the number you asked for, then whites for the rest.
    function solveProtein(need) {
      if (!pick.protein) return NIL;
      if (pick.protein !== "egx") return solve("protein", 3, need);
      var e = food("protein", "egg"), w = food("protein", "ewh");
      var pe = e[3] * PIECE.egg.g / 100, pw = w[3] * PIECE.ewh.g / 100;
      var nw = Math.min(wholeEggs(mealId), Math.max(0, Math.round(need / pe)));
      var nh = Math.max(0, Math.round((need - nw * pe) / pw));
      if (!nw && !nh) nh = 1;
      var out = NIL;
      if (nw) out = add(out, one("protein", "egg", pieces("egg", nw)));
      if (nh) out = add(out, one("protein", "ewh", pieces("ewh", nh)));
      return out;
    }

    // Three passes. The carb and fat sources carry protein of their own
    // (bread, rice, peanuts), so protein is solved against what is left
    // after them rather than against the raw target.
    var X = { parts: fixedParts(mealId), t: { k: 0, p: 0, f: 0, c: 0 } };
    X.parts.forEach(function (x) { X.t.k += x.t.k; X.t.p += x.t.p; X.t.f += x.t.f; X.t.c += x.t.c; });
    var P = NIL, C = NIL, F = NIL, fatSkip = false;
    for (var pass = 0; pass < 3; pass++) {
      P = solveProtein(Math.max(0, tP - C.t.p - F.t.p - X.t.p));
      C = pick.carb ? solve("carb", 5, Math.max(0, tC - P.t.c - X.t.c)) : NIL;
      var fatGap = tF - P.t.f - C.t.f - X.t.f;
      fatSkip = !!pick.fat && fatGap <= 1;
      F = (pick.fat && !fatSkip) ? solve("fat", 4, fatGap) : NIL;
    }

    var parts = P.parts.concat(C.parts, X.parts, F.parts);
    if (pick.fat && fatSkip) parts.push({ cat:"fat", g:0, name: food("fat", pick.fat)[1], skip:true });

    var tot = { k: P.t.k+C.t.k+F.t.k+X.t.k, p: P.t.p+C.t.p+F.t.p+X.t.p,
                f: P.t.f+C.t.f+F.t.f+X.t.f, c: P.t.c+C.t.c+F.t.c+X.t.c };
    var raw = { k: tot.k, p: tot.p, f: tot.f, c: tot.c };
    tot.k = Math.round(tot.k); tot.p = Math.round(tot.p);
    tot.f = Math.round(tot.f); tot.c = Math.round(tot.c);
    return { parts: parts, tot: tot, raw: raw, m: m };
  }

  // The day has to add up. Each slot is solved against its own share, but a slot cannot always
  // deliver it: breakfast has no fat source for its fat share, and a banana or a slice of bread is
  // a coarse step. So the meals are built together, and what the day is still short of or over by
  // goes to the slots that can take it in small steps (rice, potato, oil, chicken, yogurt, nuts).
  // Pieces (eggs, bread, bananas) never absorb it.
  // The plan does not depend on what you have eaten: only the coach's trim changes the slots still
  // to come, and then the slots already eaten stay exactly as the plan had them.
  function isPiece(id) { return !!PIECE[id] || id === "egx"; }
  var CAT = { p: "protein", f: "fat", c: "carb" }, SH = { p: 3, f: 4, c: 5 };
  function reconcile(ms, base, adj) {
    var want = { p: 0, f: 0, c: 0 }, best = null, bestErr = 1e9;
    ms.forEach(function (m) { var t = base[m[0]], a = adj[m[0]]; want.p += t.p + a.p; want.f += t.f + a.f; want.c += t.c + a.c; });
    for (var it = 0; it < 8; it++) {
      var out = {}, got = { p: 0, f: 0, c: 0 };
      ms.forEach(function (m) {
        var b = base[m[0]], a = adj[m[0]];
        var r = buildMealT(m[0], { p: Math.max(0, b.p + a.p), f: Math.max(0, b.f + a.f), c: Math.max(0, b.c + a.c) });
        out[m[0]] = r; got.p += r.raw.p; got.f += r.raw.f; got.c += r.raw.c;
      });
      var res = { p: want.p - got.p, f: want.f - got.f, c: want.c - got.c };
      // Fat that is already over, with no fat source left to cut (fatty meat, eggs, nuts), cannot go
      // lower. The calories still have to add up, so the carbs take that difference instead.
      var fatCut = ms.some(function (m) {
        return pickFor(m[0]).fat && m[4] > 0 && out[m[0]].parts.some(function (x) { return x.cat === "fat" && x.g > 0; });
      });
      var stuck = res.f < -1 && !fatCut;
      if (stuck) res.c += res.f * 9 / 4;
      var err = Math.abs(res.p) * 4 + (stuck ? 0 : Math.abs(res.f) * 9) + Math.abs(res.c) * 4;
      if (err < bestErr) { bestErr = err; best = out; }
      if (err < 8) break;
      ["p", "f", "c"].forEach(function (k) {
        var can = ms.filter(function (m) {
          var pk = pickFor(m[0])[CAT[k]];
          return m[SH[k]] > 0 && pk && !isPiece(pk);
        });
        var tw = 0; can.forEach(function (m) { tw += m[SH[k]]; });
        if (!tw) return;
        can.forEach(function (m) {
          // a slot gives up at most half its carbs or 40% of its protein: past that it is no longer that meal
          var floor = k === "c" ? -0.5 * base[m[0]].c : k === "p" ? -0.4 * base[m[0]].p : -base[m[0]].f;
          adj[m[0]][k] = Math.max(floor, adj[m[0]][k] + res[k] * m[SH[k]] / tw);
        });
      });
    }
    return best;
  }
  // Lunch is the box from the night before: the same dish as yesterday's dinner (dishFor), with the portion
  // sized for the day it is eaten. Each day is solved on its own, so every day adds up, including the first
  // day of a new phase. Tonight's pan is tonight's plate plus tomorrow's box (cookParts). Nothing here
  // depends on what was eaten.
  var PLAN = { key: "", v: null }, FREE = {};
  function planOn(d) {
    if (FREE[d]) return FREE[d];
    var keep = PD; PD = d;
    var base = {}, adj = {};
    MEALS.forEach(function (m) { base[m[0]] = planTarget(m); adj[m[0]] = { p: 0, f: 0, c: 0 }; });
    FREE[d] = { out: reconcile(MEALS, base, adj), adj: adj };
    PD = keep;
    return FREE[d];
  }
  // what goes in the pan on day d: that night's dinner and the next day's lunch, added up item by item
  function cookParts(d) {
    var out = [], at = {};
    planOn(d).out.m5.parts.concat(planOn(shift(d, 1)).out.m2.parts).forEach(function (pt) {
      if (pt.skip || (!pt.noun && !pt.g)) return;
      var x = at[pt.name];
      if (!x) { x = at[pt.name] = { name: pt.name, cat: pt.cat, mix: pt.mix, g: 0, n: pt.noun ? 0 : undefined, noun: pt.noun }; out.push(x); }
      x.g += pt.g; if (pt.noun) x.n += pt.n;
    });
    return out;
  }
  function plainPlan() { return planOn(DAY); }
  function dayPlan() {
    var plain = plainPlan();
    if (!TRIM.on) return plain.out;
    var hs = MEALS.map(function (m) { return handled(m[0]) ? 1 : 0; }).join("");
    var key = JSON.stringify([DAY, TRIM.fatFrac, TRIM.carbFrac, hs]);
    if (PLAN.key === key && PLAN.v) return PLAN.v;
    // the box is already cooked: the trim only touches the slots still to come that can still change
    var open = MEALS.filter(function (m) { return !handled(m[0]) && m[0] !== "m2"; }), base = {}, adj = {};
    open.forEach(function (m) { base[m[0]] = slotTarget(m); adj[m[0]] = { p: plain.adj[m[0]].p, f: plain.adj[m[0]].f, c: plain.adj[m[0]].c }; });
    var out = reconcile(open, base, adj), res = {};
    MEALS.forEach(function (m) { res[m[0]] = out[m[0]] || plain.out[m[0]]; });
    PLAN.key = key; PLAN.v = res;
    return res;
  }
  function buildMeal(mealId) { return dayPlan()[mealId]; }

  var DAILY = [
    ["protein", "Protein hit", ""],
    ["steps", "Steps to target", ""],
    ["train", "Trained, or deliberate rest", ""]
  ];

  var WEEKPLAN = [
    ["Mon", "Push", "Nippard"], ["Tue", "Pull", "Nippard"], ["Wed", "Legs", "Boxing plan"],
    ["Thu", "5K run or bike", "No gym"], ["Fri", "Upper", "Boxing plan"],
    ["Sat", "Delts, arms, abs, neck", "45 min"], ["Sun", "Rest", ""]
  ];

  // Push, Pull and Upper end with 20 minutes of easy incline walking: light enough to talk, so it adds burn
  // without eating into recovery. Legs is left alone (tired legs), and the 5K day is already cardio.
  var SESSIONS = [
    { d: "Push", s: "Monday · Nippard", ex: [["Machine shoulder press","3 × 8–10",1],["Cable chest press","2 × 10–12 + drop",0],["Triceps pressdown","2 × 12–15 + drop",0],["Close-grip push-up","1 × failure",0],["DB lateral raise","3 × 12–15",1],["Cable lateral raise","2 × 15–20",1],["Incline walk, easy","20 min · 10–12% · 5 km/h",0]] },
    { d: "Pull", s: "Tuesday · Nippard", ex: [["1-arm kneeling pulldown","1 × 10–12",0],["Weighted pull-up","3 × 6–8",1],["Pendlay row","2 × 8–10",1],["Bayesian cable curl","3 × 12–15 ea",1],["Rope face pull","2 × 10–12 + drop",1],["Hammer curl","2 × 12–15",1],["Incline walk, easy","20 min · 10–12% · 5 km/h",0]] },
    { d: "Legs", s: "Wednesday · one leg day", ex: [["Goblet squat","3 × 8",0],["Romanian deadlift","3 × 8",1],["Walking lunges","3 × 8 ea",0],["Calf raise","3 × 15",0],["Hanging leg raise","3 × 12–15",1],["Plank","3 × 60 s",0]] },
    { d: "Upper", s: "Friday · boxing plan", ex: [["Lat pulldown","3 × 8",1],["DB bench press","3 × 8",0],["Seated cable row","3 × 10",1],["Incline smith press","3 × 8",0],["Lateral raises","3 × 12–15",1],["Face pulls","3 × 15",1],["Incline walk, easy","20 min · 10–12% · 5 km/h",0]] },
    { d: "Delts, arms, abs, neck", s: "Saturday · 45 min", ex: [["DB lateral raise","4 × 12–20",1],["Rear delt fly","3 × 15",1],["EZ-bar curl","3 × 12",1],["Incline DB curl","3 × 10",1],["Hammer curl","3 × 12–15",1],["Rope pushdown","2 × 12",0],["Neck curl with plate","3 × 15",1],["Weighted cable crunch","3 × 12",1]] }
  ];

  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function iso(d) { return d.getFullYear()+"-"+pad2(d.getMonth()+1)+"-"+pad2(d.getDate()); }
  function parseISO(s) { var p = s.split("-"); return new Date(+p[0], +p[1]-1, +p[2]); }
  function dayDiff(a,b) { return Math.round((parseISO(b)-parseISO(a))/86400000); }
  function shift(d,n) { var x = parseISO(d); x.setDate(x.getDate()+n); return iso(x); }
  var TODAY = iso(new Date()), YDAY = shift(TODAY,-1);
  var DAY = TODAY;   // the day the Today screen is showing: today, or an earlier one being reviewed or filled in

  function weekNumber() { var d = dayDiff(START,TODAY); return d<0?1:Math.min(13,Math.floor(d/7)+1); }
  function phaseOn(iso) {
    var d = dayDiff(START, iso), w = d < 0 ? 1 : Math.min(13, Math.floor(d / 7) + 1);
    for (var i=0;i<PHASES.length;i++) if (w>=PHASES[i].w[0]&&w<=PHASES[i].w[1]) return PHASES[i];
    return PHASES[PHASES.length-1];
  }
  function currentPhase() { return phaseOn(TODAY); }
  function eatenOn(d) {
    var t = S.ticks[d]||{}, o = {k:0,p:0,f:0,c:0};
    MEALS.forEach(function(m){ if(t[m[0]]){ var b=snapTot(d,m[0]); o.k+=b.k;o.p+=b.p;o.f+=b.f;o.c+=b.c; } });
    (S.extras[d]||[]).forEach(function(e){ o.k+=e.k||0;o.p+=e.p||0;o.f+=e.f||0;o.c+=e.c||0; });
    // whole numbers: extras carry decimals, and a float sum must never reach the screen or an "over?" test
    o.k=Math.round(o.k); o.p=Math.round(o.p); o.f=Math.round(o.f); o.c=Math.round(o.c);
    return o;
  }
  function carryover(day) {
    var prev = shift(day || DAY, -1), ph = phaseOn(prev);
    if (!S.ticks[prev] && !(S.extras[prev]||[]).length) return 0;
    var over = eatenOn(prev).k - ph.kcal;
    return over <= 150 ? 0 : -Math.min(300, Math.round(over));
  }
  function targetOn(d) { var ph = phaseOn(d); return {k: ph.kcal + carryover(d), p: ph.p, f: ph.f, c: ph.c}; }
  function todayTarget() { return targetOn(DAY); }
  function entries() { return Object.keys(S.weights).sort().map(function(k){return {d:k,w:S.weights[k]};}); }
  function mean(a) { return a.reduce(function(s,x){return s+x;},0)/a.length; }
  var $ = function(id){ return document.getElementById(id); };
  function esc(s){ return String(s).replace(/[&<>"']/g,function(c){return({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c];}); }

  // Only dinner is cooked: its method comes with the dish. Lunch is the box, the rest needs no recipe.
  function methodsFor(mealId) {
    var dish = mealId === "m5" && dishFor(mealId);
    return dish ? [{ n: dish.n, t: dish.t, k: "Cook for two: one plate tonight, one box for tomorrow’s lunch.", s: dish.s }] : [];
  }

  var RED = { rib:1, sir:1, lam:1, mi5:1, mi10:1 };

