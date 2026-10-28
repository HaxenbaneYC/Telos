  var START = "2026-10-28", TARGET = 69;

  var PHASES = [
    { n: "Re-entry",   w: [1, 2],   kcal: 2350, p: 185, f: 78, c: 215,
      d: "Steps 5k to 8k. 3–4 reps in reserve. Small deficit on purpose." },
    { n: "The work",   w: [3, 8],   kcal: 2240, p: 191, f: 74, c: 200,
      d: "Steps 10k. Full intensity. One run or ride weekly." },
    { n: "Diet break", w: [9, 9],   kcal: 2700, p: 185, f: 85, c: 285,
      d: "Maintenance over Christmas, on purpose. Resets hormones and appetite." },
    { n: "The finish", w: [10, 13], kcal: 2150, p: 195, f: 70, c: 185,
      d: "Steps 10–12k. Hold volume, add no cardio. Abs show here." }
  ];

  // per 100 g raw: [id, name, kcal, P, F, C]
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
      ["ric", "Rice, cooked",       130,  2.7, 0.3, 28],
      ["pas", "Pasta, cooked",      131,  5,   1.1, 25],
      ["pot", "Potato, raw",         77,  2,   0.1, 17],
      ["swt", "Sweet potato, raw",   86,  1.6, 0.1, 20],
      ["sou", "Sourdough",          270,  9,   2,   52],
      ["oat", "Oats, dry",          379, 13,   7,   67],
      ["mus", "Muesli",             360, 10,   6,   65],
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
  var MEALS = [
    ["m1", "09:00", "Breakfast",     0.14, 0.35, 0.12, ["protein","carb"],       { protein:"egg", carb:"sou" }],
    ["m2", "13:00", "Lunch at work", 0.32, 0.22, 0.29, ["protein","carb","fat"], { protein:"chk", carb:"ric", fat:"oil" }],
    ["m3", "16:30", "Snack",         0.22, 0.21, 0.10, ["protein","fat"],        { protein:"yog", fat:"pea" }],
    ["m4", "19:30", "Pre-gym",       0.00, 0.00, 0.21, ["carb"],                 { carb:"ban" }],
    ["m5", "21:30", "Dinner",        0.32, 0.22, 0.28, ["protein","carb","fat"], { protein:"chk", carb:"pot", fat:"oil" }]
  ];

  // a slot's absolute targets for today's phase
  function slotTarget(m) {
    var ph = currentPhase();
    var f = ph.f * m[4], c = ph.c * m[5];
    if (TRIM.on && !handled(m[0])) { f *= 1 - TRIM.fatFrac; if (m[0] !== "m4") c *= 1 - TRIM.carbFrac; }
    return { p: ph.p * m[3], f: f, c: c };
  }

  function mealById(id) {
    for (var i = 0; i < MEALS.length; i++) if (MEALS[i][0] === id) return MEALS[i];
    return MEALS[0];
  }
  function pickFor(mealId) {
    var m = mealById(mealId), saved = (S.picks && S.picks[mealId]) || {}, out = {};
    m[6].forEach(function (cat) { out[cat] = saved[cat] || m[7][cat]; });
    return out;
  }
  // Protein hits the protein target. Carb fills the carb gap left after it.
  // Fat fills only what the first two have not already brought.
  // Every portion is rounded to how it is served — pieces or 5 g — before
  // its macros are counted, so the numbers match what you actually eat.
  function buildMeal(mealId) {
    var m = mealById(mealId), pick = pickFor(mealId), tgt = slotTarget(m);
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
    var P = NIL, C = NIL, F = NIL, fatSkip = false;
    for (var pass = 0; pass < 3; pass++) {
      P = solveProtein(Math.max(0, tP - C.t.p - F.t.p));
      C = pick.carb ? solve("carb", 5, Math.max(0, tC - P.t.c)) : NIL;
      var fatGap = tF - P.t.f - C.t.f;
      fatSkip = !!pick.fat && fatGap <= 1;
      F = (pick.fat && !fatSkip) ? solve("fat", 4, fatGap) : NIL;
    }

    var parts = P.parts.concat(C.parts, F.parts);
    if (pick.fat && fatSkip) parts.push({ cat:"fat", g:0, name: food("fat", pick.fat)[1], skip:true });

    var tot = { k: P.t.k+C.t.k+F.t.k, p: P.t.p+C.t.p+F.t.p,
                f: P.t.f+C.t.f+F.t.f, c: P.t.c+C.t.c+F.t.c };
    tot.k = Math.round(tot.k); tot.p = Math.round(tot.p);
    tot.f = Math.round(tot.f); tot.c = Math.round(tot.c);
    return { parts: parts, tot: tot, m: m };
  }

  var DAILY = [
    ["protein", "Protein hit", ""],
    ["steps", "Steps to target", ""],
    ["water", "3 L water, salt your food", ""],
    ["fibre", "Veg at lunch and dinner", "Fibre is most of gut health"],
    ["train", "Trained, or deliberate rest", ""]
  ];

  var SUPPS = [
    ["d3", "Vitamin D3 + K2", "Breakfast, with fat"],
    ["omega", "Omega 3", "Breakfast"],
    ["mag", "Magnesium", "Evening"],
    ["zinc", "Zinc", "With food, away from calcium"],
    ["sel", "Selenium 100 mcg", "With food"],
    ["tong", "Tongkat ali 400 mg", "Morning"],
    ["crea", "Creatine 5 g", "Every day, rest days too"],
    ["boron", "Boron — cycled", "Your call on the weeks"]
  ];

  var WEEKPLAN = [
    ["Mon", "Push", "Nippard"], ["Tue", "Pull", "Nippard"], ["Wed", "Legs", "Boxing plan"],
    ["Thu", "5K run or bike", "No gym"], ["Fri", "Upper", "Boxing plan"],
    ["Sat", "Delts, arms, abs, neck", "45 min"], ["Sun", "Rest", ""]
  ];

  var SESSIONS = [
    { d: "Push", s: "Monday · Nippard", ex: [["Machine shoulder press","3 × 8–10",1],["Cable chest press","2 × 10–12 + drop",0],["Triceps pressdown","2 × 12–15 + drop",0],["Close-grip push-up","1 × failure",0],["DB lateral raise","3 × 12–15",1],["Cable lateral raise","2 × 15–20",1]] },
    { d: "Pull", s: "Tuesday · Nippard", ex: [["1-arm kneeling pulldown","1 × 10–12",0],["Weighted pull-up","3 × 6–8",1],["Pendlay row","2 × 8–10",1],["Bayesian cable curl","3 × 12–15 ea",1],["Rope face pull","2 × 10–12 + drop",1],["Hammer curl","2 × 12–15",1]] },
    { d: "Legs", s: "Wednesday · one leg day", ex: [["Goblet squat","3 × 8",0],["Romanian deadlift","3 × 8",1],["Walking lunges","3 × 8 ea",0],["Calf raise","3 × 15",0],["Hanging leg raise","3 × 12–15",1],["Plank","3 × 60 s",0]] },
    { d: "Upper", s: "Friday · boxing plan", ex: [["Lat pulldown","3 × 8",1],["DB bench press","3 × 8",0],["Seated cable row","3 × 10",1],["Incline smith press","3 × 8",0],["Lateral raises","3 × 12–15",1],["Face pulls","3 × 15",1]] },
    { d: "Delts, arms, abs, neck", s: "Saturday · 45 min", ex: [["DB lateral raise","4 × 12–20",1],["Rear delt fly","3 × 15",1],["EZ-bar curl","3 × 12",1],["Incline DB curl","3 × 10",1],["Hammer curl","3 × 12–15",1],["Rope pushdown","2 × 12",0],["Neck curl with plate","3 × 15",1],["Weighted cable crunch","3 × 12",1]] }
  ];

  var RECIPES = [
    { n: "Yogurt white sauce", s: "2 min · replaces cream", why: "40 kcal a serving instead of 400. Goes on chicken, potato, rice, salad.",
      ing: ["150 g thick Greek yogurt","1 garlic clove","Juice of half a lemon","1 tsp olive oil","Salt, pepper"],
      steps: ["Crush the garlic with a pinch of salt using the flat of a knife until it's a paste. Chopped garlic tastes harsh; paste tastes creamy.","Stir into the yogurt with the lemon juice and oil.","Leave 10 minutes so the garlic mellows.","Splash of water if you want it pourable."] },
    { n: "Lean white sauce", s: "5 min · pasta, chicken, potato", why: "A proper white sauce without cream or a butter roux. Cornflour thickens it, so it is mostly milk: about 220 kcal for the whole batch (milk 120, parmesan 80, cornflour 25). It is not part of the plate numbers, so use half the batch or log it under Off-plan food.",
      ing: ["250 ml semi-skimmed milk, cold","1 tbsp cornflour","1 garlic clove, crushed","20 g parmesan, finely grated","Salt and pepper","Pinch of nutmeg"],
      steps: ["Whisk the cornflour into the cold milk in a small pan until there is not a single lump. Starch clumps in hot liquid, so it goes in cold.","Add the garlic and a pinch of salt. Medium heat, whisking the whole time, 2–3 minutes until it coats the back of a spoon.","Off the heat, stir in the parmesan and nutmeg. The cheese goes in last so it melts instead of going stringy.","Too thick, loosen it with a splash of milk or pasta water. It thickens as it sits.","Make it just before you need it. It skins over if it waits."] },
    { n: "Chicken and rice", s: "The default · 20 min", why: "Same meal you already eat, cooked so you don't get sick of it by week three.",
      ing: ["180 g chicken breast or thigh","180 g cooked rice","2 tsp olive oil","Paprika, cumin, garlic powder, salt","Green veg","Yogurt white sauce"],
      steps: ["Salt the chicken and leave it 15 minutes while the rice cooks.","Pat it properly dry — wet chicken steams instead of browning.","Hot pan, 1 tsp oil. Don't move it for 4 minutes, flip for 3. Thigh takes a minute longer.","Rest 5 minutes before slicing or the juice ends up on the board.","Slice across the grain, sauce over the top."] },
    { n: "Salmon, potato and lemon", s: "One tray · 35 min", why: "Covers your omega-3 and a chunk of the fat target. One tray, nothing to wash up.",
      ing: ["180 g salmon, skin on","300 g potato in 2 cm cubes","1 red onion in wedges","1 lemon","1 tbsp olive oil","Cherry tomatoes","Salt, pepper, paprika"],
      steps: ["Oven 220°C. Toss potato and onion with half the oil, salt and paprika on a tray.","Roast 20 minutes alone — potato needs the head start or the salmon overcooks waiting.","Push it aside, add salmon skin-down with lemon slices and tomatoes. Rest of the oil, salt.","Back in 11–13 minutes. Done when it flakes but the middle still looks slightly translucent.","Squeeze the lemon over at the table."] },
    { n: "Steak, eggs and potato", s: "Rest day", why: "Zinc from the beef, fat and cholesterol from the yolks, vitamin D from the eggs.",
      ing: ["200 g sirloin or ribeye","3 eggs","250 g potato, boiled","1 tbsp butter","Salt, black pepper","Greens"],
      steps: ["Steak out of the fridge 30 minutes early and salted — cold steak cooks unevenly.","Boil the potato, drain, crush with a fork, crisp it in a hot pan with the butter.","Very hot dry pan, 2–3 minutes a side for medium rare at 2 cm. Rest 5 minutes.","Fry the eggs in the same pan — the browned bits season them.","Plate with the greens."] }
  ];

  // per 180 g raw: [name, kcal, protein, fat, note]
  var PROTEINS = [
    { g: "Straight swap", cls: "a", note: "Similar protein, similar fat. Change nothing else in the meal.",
      items: [
        ["Chicken breast", 297, 56, 6, "the baseline"],
        ["Turkey breast", 294, 53, 7, ""],
        ["Tuna, pouch, drained", 198, 45, 2, "two pouches ≈ 180 g"],
        ["Prawns", 153, 36, 1, "low protein for the weight — add 100 g"],
        ["Cod or white fish", 148, 32, 1, "add 1 tsp oil to make the calories back"]
      ] },
    { g: "Costs you fat", cls: "b", note: "Still a swap, but drop the olive oil from that meal to pay for it.",
      items: [
        ["Sirloin, trimmed", 324, 48, 14, "the lean red meat option"],
        ["Chicken thigh, skinless", 319, 43, 15, ""],
        ["Lean mince, 5%", 247, 38, 9, "add 60 g to match the protein"],
        ["Lean mince, 10%", 317, 36, 18, "drop the oil and the sauce"]
      ] },
    { g: "Not a swap — a planned meal", cls: "c", note: "Too fatty to trade straight across. Build the day around it or cut the portion.",
      items: [
        ["Salmon", 374, 36, 23, "worth it for omega-3 — drop all added fat"],
        ["Lamb leg", 450, 44, 30, "cut to 140 g"],
        ["Ribeye", 450, 41, 32, "cut to 140 g, no oil, no sauce, +200 g yogurt"],
        ["Chicken thigh, skin on", 414, 40, 28, "take the skin off and it moves up two groups"]
      ] }
  ];

  var SWAPS = [
    ["180 g cooked rice","180 g pasta, or 270 g raw potato"],
    ["180 g chicken breast","200 g white fish, or 180 g lean mince"],
    ["1 yogurt tub (360 g)","1 scoop whey + fruit, or 2 tuna pouches"],
    ["25 g peanuts","20 g almonds, or 20 g cheese"],
    ["Green veg and salad","Unlimited, always"],
    ["G Hughes zero-sugar BBQ","Free — use it on anything"],
    ["Mustard, vinegar, hot sauce, spices","Free"]
  ];

  function iso(d) { return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
  function parseISO(s) { var p = s.split("-"); return new Date(+p[0], +p[1]-1, +p[2]); }
  function dayDiff(a,b) { return Math.round((parseISO(b)-parseISO(a))/86400000); }
  function shift(d,n) { var x = parseISO(d); x.setDate(x.getDate()+n); return iso(x); }
  var TODAY = iso(new Date()), YDAY = shift(TODAY,-1);

  function weekNumber() { var d = dayDiff(START,TODAY); return d<0?1:Math.min(13,Math.floor(d/7)+1); }
  function currentPhase() {
    var w = weekNumber();
    for (var i=0;i<PHASES.length;i++) if (w>=PHASES[i].w[0]&&w<=PHASES[i].w[1]) return PHASES[i];
    return PHASES[PHASES.length-1];
  }
  function eatenOn(d) {
    var t = S.ticks[d]||{}, o = {k:0,p:0,f:0,c:0};
    MEALS.forEach(function(m){ if(t[m[0]]){ var b=snapTot(d,m[0]); o.k+=b.k;o.p+=b.p;o.f+=b.f;o.c+=b.c; } });
    (S.extras[d]||[]).forEach(function(e){ o.k+=e.k||0;o.p+=e.p||0;o.f+=e.f||0;o.c+=e.c||0; });
    return o;
  }
  function carryover() {
    var ph = currentPhase();
    if (!S.ticks[YDAY] && !(S.extras[YDAY]||[]).length) return 0;
    var over = eatenOn(YDAY).k - ph.kcal;
    return over <= 150 ? 0 : -Math.min(300, Math.round(over));
  }
  function todayTarget() { var ph = currentPhase(); return {k: ph.kcal + carryover(), p: ph.p, f: ph.f, c: ph.c}; }
  function entries() { return Object.keys(S.weights).sort().map(function(k){return {d:k,w:S.weights[k]};}); }
  function mean(a) { return a.reduce(function(s,x){return s+x;},0)/a.length; }
  var $ = function(id){ return document.getElementById(id); };
  function esc(s){ return String(s).replace(/[&<>"]/g,function(c){return({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c];}); }

  function methodsFor(mealId) {
    var pick = pickFor(mealId);
    // The whole+whites mix cooks like eggs, so it matches the egg methods.
    var pid = pick.protein === "egx" ? "egg" : pick.protein;
    function pOk(r) { return pid ? r.p.indexOf(pid) !== -1 : r.p.length === 0; }
    var exact = LIB.filter(function (r) {
      return pOk(r) && (pick.carb ? r.c.indexOf(pick.carb) !== -1 : true);
    });
    if (exact.length) return exact;
    // Nothing written for that exact pairing — fall back to the protein and
    // flag that the carb is a substitution rather than pretending otherwise.
    return LIB.filter(pOk).map(function (r) {
      var o = { n: r.n, t: r.t, p: r.p, c: r.c, s: r.s, swap: true,
                k: r.k + " — written for " + carbName(r.c[0]) + "; swap your carb in at the same point." };
      return o;
    });
  }
  function carbName(id) {
    for (var i = 0; i < FOODS.carb.length; i++) if (FOODS.carb[i][0] === id) return FOODS.carb[i][1].toLowerCase().split(",")[0];
    return "the carb";
  }

  var RED = { rib:1, sir:1, lam:1, mi5:1, mi10:1 };
  var FISH = { sal:1, cod:1, prw:1 };

  // ── Complete-meal methods. p = proteins it fits, c = carbs it fits.
  // Each one cooks the whole plate, with the timing interleaved.
  var LIB = [
  // ===== STEAK / RED MEAT =====
  {n:"Steak and crushed potato",t:35,p:["rib","sir","lam"],c:["pot","swt"],
   k:"The potato goes on first and finishes while the steak rests. Nothing waits for anything.",
   s:["Potato into well-salted cold water, bring to the boil, 12 min until a knife slides in. Steak out of the fridge now, salted both sides.",
      "Drain the potato, let it steam dry 2 min, then crush each piece flat with a fork. Those rough edges become the crust.",
      "Potato into a hot pan with your oil, or 220°C oven. Leave it alone 6 min — moving it early means no crust.",
      "Second pan on high until it just smokes. Steak patted bone dry, in, untouched 3 min. Flip, 2–3 min for medium-rare at 2 cm.",
      "Pull the steak 3°C under target and rest it 5–10 min. Turn the potato while it rests, salt at the very end.",
      "Slice the steak across the grain. Pour any resting juice over the potato."]},
  {n:"Steak and garlic rice",t:30,p:["rib","sir","lam"],c:["ric"],
   k:"Rice cooks unattended under a lid while you deal with the steak.",
   s:["Rinse the rice until the water runs clear. Toast it dry in the pan 1 min with a crushed garlic clove until it smells nutty.",
      "Water 1.5 to 1, salt, lid on, lowest heat, 12 min. Do not lift the lid. Steak out and salted.",
      "Rice off the heat, lid still on, resting. Pan on high for the steak.",
      "Steak dry, in, 3 min untouched, flip, 2–3 min. Pull 3°C under and rest 5 min.",
      "Fork the rice through. Deglaze the steak pan with a splash of water and lemon, scrape up the brown bits, pour over the rice."]},
  {n:"Beef stir-fry over rice",t:20,p:["rib","sir","lam","mi5","mi10"],c:["ric"],
   k:"Makes a fatty cut cover a much bigger plate. Freeze it briefly to slice it thin.",
   s:["Rice on first: rinsed, 1.5 to 1 water, salt, lid on, low, 12 min.",
      "Freeze the steak 15 min, then slice as thin as you can against the grain. Toss with salt and garlic powder.",
      "Pan on maximum. Sear the beef in two batches, 60 seconds each. Crowding it is what makes beef grey.",
      "Beef out. Veg into the same pan, 2 min, still crunchy.",
      "Beef back in for 20 seconds, off the heat, then vinegar or lemon and white pepper. Over the rice."]},
  {n:"Steak and pasta, chimichurri",t:25,p:["rib","sir","lam"],c:["pas"],
   k:"The chimichurri dresses both the steak and the pasta, so there is no second sauce to make.",
   s:["Chop a big handful of parsley with 1 garlic clove and chilli flakes. Mix with 2 tbsp red wine vinegar, your oil, salt. Leave it.",
      "Pasta into heavily salted water. Keep a mug of the water before draining.",
      "Steak dry, screaming pan, 3 min, flip, 2–3 min. Out to rest.",
      "Drained pasta into the steak pan with a splash of the pasta water. Toss hard — the starch picks up everything stuck to the base.",
      "Half the chimichurri through the pasta, the other half over the sliced steak."]},
  {n:"Kofta and roast potato",t:35,p:["mi5","mi10","lam"],c:["pot","swt"],
   k:"One oven, two trays, zero attention for twenty minutes.",
   s:["Oven 220°C. Potato cubed, tossed with paprika, garlic powder, salt and your oil, onto a tray. In for 15 min.",
      "Meanwhile mix the mince with grated onion squeezed dry, parsley, cumin, coriander, paprika, salt, lots of pepper.",
      "Work it with your hands a full minute until it gets sticky, or the skewers fall apart. Shape into fat fingers.",
      "Kofta onto a second tray, in alongside the potato for the last 15 min, turning once.",
      "Both out together. Garlic yogurt over the kofta, lemon over the potato."]},
  {n:"Smashed patties and potato",t:25,p:["mi5","mi10"],c:["pot","swt"],
   k:"Thin patties give twice the crust of one thick one. Same meat.",
   s:["Potato cubed, microwaved 6–7 min until soft, spread on a plate 2 min to let the steam go.",
      "Potato into a hot pan with your oil, single layer, 4 min a side without stirring. Out, salted.",
      "Divide the mince into balls. Do not salt yet — salt pulls water out and kills the crust.",
      "Same pan, very hot. Drop a ball, smash hard flat for 10 seconds, salt the top now.",
      "2 min until the edges go lacy, flip, 1 min. Stack two thin patties per portion."]},
  {n:"Beef and tomato pasta",t:30,p:["mi5","mi10"],c:["pas"],
   k:"One pot, no cream, and better reheated the next day.",
   s:["Brown the mince hard in a dry pan, breaking it up. Let it catch — the brown is the flavour.",
      "Chopped onion and garlic in, 3 min. Then a tin of tomatoes, oregano, salt, a splash of vinegar.",
      "Simmer 15 min until it holds a dent from the spoon. The vinegar is what stops tinned tomato tasting raw.",
      "Pasta in salted water meanwhile. Keep a mug of the water.",
      "Drained pasta straight into the sauce with a splash of the water. Toss a minute so it clings. Pepper off the heat."]},
  {n:"Mince fried rice",t:15,p:["mi5","mi10"],c:["ric"],
   k:"Only works with cold leftover rice. Fresh rice turns to paste.",
   s:["Cold rice broken up with your fingers. Screaming hot pan.",
      "Mince in dry, hard, 4 min until properly browned. Out onto a plate.",
      "Your oil in, then the rice. Press it flat, leave 60 seconds to catch, then toss.",
      "Mince back in, spring onion, white pepper, a little soy. Two minutes, done."]},

  // ===== CHICKEN BREAST =====
  {n:"Tray chicken and potato",t:40,p:["chk","tur","thi"],c:["pot","swt"],
   k:"Hands-off and scales — cook three days at once on two trays.",
   s:["Salt the chicken and leave it uncovered in the fridge while the oven heats to 200°C. Forty-five minutes is the minimum that matters, overnight is better.",
      "Potato cubed, tossed with paprika, cumin, garlic powder, salt and your oil. Onto a tray, in for 15 min.",
      "Pat the chicken completely dry, season, set it on a rack over the same tray so air gets underneath.",
      "20–22 min for 180 g pieces. Pull at 71°C — it carries to 74°C while resting.",
      "Rest 5 min before slicing. Lemon and flaky salt over everything."]},
  {n:"Chicken and rice, properly",t:30,p:["chk","tur"],c:["ric"],
   k:"The meal you already eat, cooked so you are not sick of it by week three.",
   s:["Salt the chicken and leave it while the rice cooks — this is the single biggest upgrade available to you.",
      "Rinse the rice until clear, toast it dry 1 min with cumin seeds, add water 1.5 to 1 and salt. Lid on, lowest heat, 12 min.",
      "Pat the chicken properly dry. Wet chicken steams instead of browning. Season with paprika, cumin, garlic powder.",
      "Medium-high pan, your oil. In, untouched, 5 min. Flip, 4 min. Pull at 71°C.",
      "Rest 5 min while the rice sits covered. Slice across the grain, garlic yogurt over the top."]},
  {n:"Shawarma chicken and rice",t:35,p:["chk","thi","tur"],c:["ric"],
   k:"Yogurt tenderises where lemon toughens. Marinate in the morning, eat at night.",
   s:["Marinate the chicken in Greek yogurt with garlic, paprika, cumin, coriander, turmeric, salt. Thirty minutes minimum, all day is better.",
      "Rice on: rinsed, toasted dry 1 min, water 1.5 to 1, salt, lid on, low, 12 min.",
      "Scrape most of the marinade off the chicken. What clings is enough — wet marinade steams instead of charring.",
      "230°C oven or a hot pan, 12–15 min, until the edges are genuinely charred. Pull at 71°C.",
      "Rest, slice, pile on the rice with pickled onion and more garlic yogurt."]},
  {n:"Chicken and garlic chilli pasta",t:25,p:["chk","tur","prw"],c:["pas"],
   k:"The pasta water makes the sauce. No cream, no cheese needed.",
   s:["Salt and dry the chicken, season. Pasta into heavily salted water.",
      "Chicken in a medium-high pan, 5 min, flip, 4 min, pull at 71°C. Out to rest. Keep a mug of pasta water before draining.",
      "Same pan on LOW: sliced garlic and chilli flakes in your oil. Golden, never brown — burnt garlic ruins the dish.",
      "Drained pasta in with a big splash of the starchy water. Toss hard a full minute until it emulsifies and clings.",
      "Sliced chicken through it, parsley, lots of black pepper."]},
  {n:"Chicken and sweet potato mash",t:35,p:["chk","thi","tur"],c:["swt","pot"],
   k:"Yogurt instead of butter in the mash, so the fat budget stays on the protein.",
   s:["Salt the chicken, leave it. Sweet potato cubed into salted water, boil 14 min until completely soft.",
      "Drain very well and let it steam dry — wet mash is sad mash.",
      "Mash with 2 tbsp Greek yogurt, salt, pepper, a scrape of nutmeg or a pinch of cumin. No butter.",
      "Chicken dry and seasoned, medium-high pan with your oil, 5 min, flip 4, pull at 71°C.",
      "Rest 5 min. Pan sauce: splash of water and lemon into the hot pan, scrape, reduce, pour over."]},
  {n:"Poached and shredded, batch",t:20,p:["chk","tur"],c:["ric","pas","pot","swt"],
   k:"Impossible to dry out, and the best thing to have in the fridge on a Monday.",
   s:["Cover the chicken with cold salted water, add a bay leaf, bring to a bare simmer. Never a rolling boil.",
      "Twelve minutes at the barest bubble, then off the heat and leave it in the water 5 more.",
      "Cook your carb in the same window — rice under a lid, or potato cubes boiled then crisped.",
      "Shred the chicken with two forks while warm and toss straight into garlic yogurt or chimichurri.",
      "Keeps four days and needs no reheating. Cold shredded chicken is better than reheated breast."]},

  // ===== CHICKEN THIGH =====
  {n:"Lemon garlic thigh and rice",t:30,p:["thi","chk"],c:["ric"],
   k:"The pan juices become the sauce for free. Thigh is almost impossible to overcook.",
   s:["Rice on first: rinsed, toasted dry, water 1.5 to 1, salt, lid on, low, 12 min.",
      "Thighs opened flat, salted, dried well. Medium-high pan, no oil — thigh renders its own.",
      "Smooth side down, press flat with a spatula for the first minute to get full contact. 6 min, flip, 5 min. Done at 75°C and happy higher.",
      "Thighs out. Three smashed garlic cloves into the pan, 30 seconds, then the juice of a whole lemon and a splash of water.",
      "Scrape everything up, reduce by half. Thighs back in to coat, parsley off the heat, over the rice."]},

  // ===== FISH =====
  {n:"Salmon and potato, one tray",t:35,p:["sal"],c:["pot","swt"],
   k:"One tray, nothing to wash. The potato gets a 20-minute head start.",
   s:["Oven 220°C. Potato in 2 cm cubes with red onion wedges, half your oil, salt, paprika. Onto the tray.",
      "Roast 20 min alone. The potato needs the head start or the salmon overcooks waiting for it.",
      "Push it to one side. Salmon skin-down with lemon slices and cherry tomatoes, rest of the oil, salt.",
      "Back in 11–13 min. Done when it flakes but the centre still looks slightly translucent.",
      "Squeeze the lemon over at the table. Salmon brings its own fat — no butter anywhere."]},
  {n:"Crisp-skin salmon and rice",t:25,p:["sal"],c:["ric"],
   k:"Skin-side down almost the whole time. That is the entire technique.",
   s:["Rice on: rinsed, water 1.5 to 1, salt, lid on, lowest heat, 12 min.",
      "Salt the salmon skin and leave 10 min, then wipe the moisture off. Wet skin never crisps.",
      "Cold pan, skin down, then turn the heat to medium. Starting cold renders the fat out slowly instead of seizing it.",
      "Press flat 20 seconds, then leave it 6–7 min. Watch the cooked line creep up the side.",
      "Flip for 60 seconds only. Onto the rice with lemon and spring onion. No oil needed at any point."]},
  {n:"Cod in foil with potato",t:35,p:["cod","prw"],c:["pot","swt"],
   k:"White fish is lean and unforgiving. Steaming it in its own juice fixes that.",
   s:["Oven 200°C. Potato cubed with your oil, salt, paprika, onto a tray. 18 min.",
      "Fish on a square of foil with lemon slices, garlic, salt, a splash of water. Scrunch into a loose sealed parcel.",
      "Parcel in alongside the potato for the last 14 min.",
      "Open the parcel at the table — the juice in it is the sauce.",
      "Cod is so lean you will have fat budget left. Spend it: a tablespoon of olive oil over the fish."]},
  {n:"Garlic prawns and rice",t:20,p:["prw"],c:["ric"],
   k:"Fastest protein there is. Overcooking is the only way to ruin them.",
   s:["Rice on: rinsed, toasted dry with a garlic clove, water 1.5 to 1, salt, lid on, low, 12 min.",
      "Prawns dried and salted. Pan hot with your oil.",
      "Ninety seconds one side, 60 the other. Done the second they curl into a C — a tight O means overdone.",
      "Off the heat, then garlic, chilli flakes and lemon. Garlic in a hot pan burns in seconds.",
      "Onto the rice with all the pan juice. Parsley."]},
  {n:"Spiced fish and sweet potato",t:35,p:["cod","sal"],c:["swt","pot"],
   k:"Spice rub instead of batter. All the crust, none of the crumb.",
   s:["Oven 220°C. Sweet potato in wedges, soaked in cold water 10 min then dried hard — rinsing the surface starch is what crisps them.",
      "Tossed with paprika, garlic powder, salt and your oil, onto baking paper, 20 min.",
      "Rub the fish with paprika, cumin, garlic powder, salt and a little cayenne.",
      "Fish in alongside for the last 12–15 min. Done when it flakes under light pressure but still looks glossy.",
      "Lemon at the table, never before — acid on raw fish starts cooking it."]},

  // ===== EGGS =====
  {n:"Soft scramble on sourdough",t:8,p:["egg","ewh"],c:["sou"],
   k:"Low heat and constant movement. Almost everyone cooks eggs far too hot.",
   s:["Beat the eggs with salt. Salting before cooking makes them more tender, not less.",
      "Sourdough into the toaster. Timing matters — cold toast under hot eggs is a waste.",
      "Lowest heat, your butter. Eggs in, wait 20 seconds.",
      "Stir slowly and constantly, pulling the set edges into the middle.",
      "Off the heat while still visibly wet — they finish on the way to the plate. Onto the toast, black pepper."]},
  {n:"Potato tortilla",t:30,p:["egg","ewh"],c:["pot","swt"],
   k:"Eggs and potato in one pan. Cold the next day is better than hot.",
   s:["Potato sliced thin. Soften in a covered pan on low with your oil, 12 min, tender but not browned.",
      "Beat the eggs with plenty of salt. Pour over the potato, turn the heat right down.",
      "8 min, until only the very top is still wet.",
      "Slide onto a plate, invert the pan over it, flip it back in. 3 min more.",
      "Rest 10 min before cutting — it sets as it cools. Good cold from the fridge all week."]},
  {n:"Eggs in tomato with bread",t:18,p:["egg","ewh"],c:["sou"],
   k:"Shakshuka logic. Breakfast that does not taste like breakfast.",
   s:["Onion and garlic soft in your oil. Cumin and paprika, 30 seconds, until they smell.",
      "Tin of tomatoes, salt, simmer 8 min until thick enough to hold a dent.",
      "Make wells, crack the eggs in, lid on, 4–5 min for runny yolks.",
      "Parsley and black pepper. The bread is for the yolk — do not toast it too early."]},
  {n:"Overnight oats",t:3,p:["yog","cot","whe"],c:["oat","mus"],
   k:"Made the night before, which is the only reason you will actually eat breakfast.",
   s:["Oats, yogurt or milk, and a pinch of salt. Salt in oats is what nobody does and everybody should.",
      "Cinnamon stirred through. Into a jar, into the fridge.",
      "Fruit in the morning rather than overnight, or it goes grey.",
      "Thicker the next day — loosen with a splash of milk."]},

  // ===== YOGURT, SNACK SLOT =====
  {n:"Savoury yogurt bowl",t:5,p:["yog","cot"],c:["sou","oat","mus","ban","dat","pot","swt","ric","pas"],
   k:"Far better than the sweet version at 4pm, when you are actually hungry.",
   s:["Yogurt in a bowl. Salt, black pepper, a drizzle of your oil.",
      "Cucumber, tomato, chopped herbs, a pinch of sumac or chilli flakes.",
      "Nuts on top for crunch if the fat budget allows.",
      "Eat it before you are hungry, not after. This is the meal that stops the 6pm order."]},
  {n:"Sweet yogurt bowl",t:3,p:["yog","cot","whe"],c:["ban","dat","oat","mus"],
   k:"Cinnamon makes it taste sweeter than it is, for nothing.",
   s:["Yogurt, cinnamon, a little vanilla if you have it.",
      "Banana sliced in, or two dates chopped small — chopped small goes much further than whole.",
      "Nuts or seeds on top. Done in a minute."]},

  // ===== CARB ONLY, PRE-GYM =====
  {n:"Tuna rice bowl",t:12,p:["tun"],c:["ric","pas"],
   k:"No cooking the protein at all. The fastest real meal in the app.",
   s:["Rice on: rinsed, water 1.5 to 1, salt, lid on, lowest heat, 12 min. Or use cold leftover rice.",
      "Tuna drained properly — squeeze it. Watery tuna makes everything taste of tin.",
      "Mix with Greek yogurt, lemon, black pepper, a little mustard. This replaces mayo exactly.",
      "Over the rice with cucumber, spring onion, pickled onion and chilli flakes.",
      "Sesame or a few drops of soy if you have them. Eat cold or warm, both work."]},
  {n:"Cod and rice",t:25,p:["cod","prw","tun"],c:["ric"],
   k:"Lean fish and rice is the blandest thing you can make, so the technique here is all seasoning.",
   s:["Rice on: rinsed, toasted dry 1 min with cumin seeds and a garlic clove, water 1.5 to 1, salt, lid on, low, 12 min.",
      "Rub the fish with paprika, cumin, garlic powder, salt, a little cayenne.",
      "Hot pan with your oil, 3 min, flip carefully, 2–3 min. It flakes when done but should still look glossy.",
      "Fish out. Lemon juice and a splash of water into the hot pan, scrape up everything, 30 seconds.",
      "Fork the rice, fish on top, pan juice over, lots of parsley. Cod is lean enough that you can add a proper tablespoon of oil."]},
  {n:"Egg fried rice",t:12,p:["egg","ewh"],c:["ric"],
   k:"Only works with cold leftover rice. Fresh rice turns to paste every time.",
   s:["Cold rice from the fridge, broken up with your fingers.",
      "Screaming hot pan. Beaten eggs in first, scramble fast and loose, straight out onto a plate.",
      "Your oil in, then the rice. Press it flat and leave it 60 seconds to catch before you toss it.",
      "Egg back in, spring onion, white pepper, a little soy.",
      "Two minutes from here. Do not stir it constantly — the browned bits are the point."]},
  {n:"Salmon pasta",t:22,p:["sal","prw","tun"],c:["pas"],
   k:"The pasta water and the salmon fat make the sauce. No cream anywhere near it.",
   s:["Pasta into heavily salted water. Keep a mug of the water before draining.",
      "Salmon skin-down in a cold pan, heat to medium, 6 min. Flip 60 seconds. Out, flaked into chunks, skin discarded or eaten.",
      "Same pan on low: garlic and chilli flakes in the salmon fat already there. One minute, golden not brown.",
      "Drained pasta in with a big splash of the starchy water. Toss hard a full minute until it clings.",
      "Salmon folded through at the end so it stays in chunks. Lemon zest, parsley, black pepper."]},
  {n:"Chicken pasta, lean white sauce",t:25,p:["chk","tur","thi"],c:["pas"],
   k:"A real white sauce with no cream and no butter roux. The sauce is not in the plate numbers, so use half the batch or log it under Off-plan food.",
   s:["Pasta into heavily salted water. Keep a mug of the water before draining.",
      "Salt and dry the chicken. Medium-high pan, 5 min, flip, 4 min, pull at 71°C. Rest it, then slice across the grain.",
      "Sauce while it rests: whisk 1 tbsp cornflour into 250 ml cold milk, add a crushed garlic clove and salt, then medium heat and whisk constantly 2–3 min until it coats a spoon. Off the heat, stir in 20 g grated parmesan and a pinch of nutmeg.",
      "Drained pasta into the sauce with a splash of the pasta water. Toss until it is glossy and clings.",
      "Chicken on top. Peas or spinach folded through at the last minute make it a full plate."]},
  {n:"Tuna pasta, yogurt white sauce",t:15,p:["tun"],c:["pas"],
   k:"Cold sauce, hot pasta, no cooking. The yogurt stays creamy because it never boils.",
   s:["Pasta into heavily salted water. Keep a mug of the water.",
      "While it cooks, stir 150 g thick Greek yogurt with a crushed garlic clove, the juice of half a lemon, salt and black pepper.",
      "Drain the pasta and let it steam off for a minute. Yogurt splits if it meets pasta straight from the pot.",
      "Toss the pasta with the yogurt and a splash of pasta water until it loosens into a sauce. Flake the tuna through last so it stays in pieces.",
      "Parsley, capers or chilli flakes if you have them."]},
  {n:"Garlic prawn pasta, white sauce",t:20,p:["prw"],c:["pas"],
   k:"Prawns need three minutes, so the sauce is the whole job. Same lean white sauce, no cream.",
   s:["Pasta into heavily salted water. Keep a mug of the water.",
      "Make the lean white sauce while it cooks: 1 tbsp cornflour whisked into 250 ml cold milk with a crushed garlic clove, medium heat, whisking 2–3 min. Off the heat, 20 g parmesan and black pepper.",
      "Dry the prawns. Hot pan, 2 min a side until pink and curled. Longer and they go rubbery. Lemon juice over them in the pan.",
      "Drained pasta into the sauce with a splash of the water, then the prawns. One toss and it is done.",
      "Parsley and a little chilli if you want heat."]},
  {n:"Chicken in flatbread",t:20,p:["chk","thi","tur"],c:["sou"],
   k:"Lunch you can carry. Everything cooked the night before and assembled cold.",
   s:["Salt the chicken and leave it, then dry it hard. Season with paprika, cumin, garlic powder.",
      "Hot pan with your oil, 5 min, flip, 4 min, pull at 71°C. Rest 5 min then slice.",
      "Bread warmed in the dry pan 30 seconds a side — this is the difference between bread and good bread.",
      "Garlic yogurt spread on, chicken, pickled onion, tomato, cucumber, parsley.",
      "Wrap tight in foil and it holds together until lunch."]},
  {n:"Steak sandwich",t:18,p:["rib","sir","lam"],c:["sou"],
   k:"Thin slices, not a slab. A whole steak in a sandwich is impossible to bite through.",
   s:["Steak out and salted 30 min early. Pan screaming hot.",
      "3 min, flip, 2 min for medium-rare. Pull 3°C under and rest a full 10 min — a hot steak makes soggy bread.",
      "Bread cut and toasted in the steak pan, cut side down, soaking up what is left. 40 seconds.",
      "Slice the steak as thin as you can across the grain.",
      "Mustard, steak, pickled onion, rocket. Any resting juice poured over the meat, not the bread."]},
  {n:"Kofta wrap",t:25,p:["mi5","mi10","lam"],c:["sou"],
   k:"Mince shaped flat cooks in half the time and fits the bread properly.",
   s:["Mix the mince with grated onion squeezed dry, parsley, cumin, coriander, paprika, salt, lots of pepper.",
      "Work it a full minute with your hands until it is sticky, then rest 10 min in the fridge.",
      "Shape into flat ovals, not balls. Hot dry pan, 3 min a side.",
      "Bread warmed in the same pan to pick up the fat.",
      "Garlic yogurt, kofta, pickled onion, tomato, chilli flakes. Wrap tight."]},
  {n:"Protein oats",t:5,p:["whe","yog","cot"],c:["oat","mus","ban","dat"],
   k:"Stir the powder in after cooking, never during, or it turns to rubber.",
   s:["Oats with water or milk and a real pinch of salt. Microwave 2 min, or hob 4 min stirring.",
      "Let it stand a minute off the heat so it stops steaming. This matters.",
      "Now stir the protein in, with a splash more liquid — hot oats seize the powder into lumps.",
      "Cinnamon, banana or chopped dates, nuts if the fat allows."]}
  ,{n:"Pre-gym, no cooking",t:1,p:[],c:["ban","dat","oat","mus"],
   k:"Sixty to ninety minutes before you lift. Do not overthink it.",
   s:["Banana, or two dates, or both.",
      "Salt your water if you are training in the heat.",
      "That is the whole method. Anything heavier this close to training sits in your stomach."]}
  ];

  // Finishers — near-zero calorie, always offered.
  var FIN = [
  {n:"Garlic yogurt",t:3,k:"Replaces every cream sauce for 40 kcal instead of 400.",
   s:["Crush 1 garlic clove to a paste with a pinch of salt using the flat of a knife. Chopped tastes harsh, paste tastes creamy.",
      "Stir into Greek yogurt with lemon juice and 1 tsp oil.",
      "Rest 10 min so the garlic mellows. Thin with water to pour.",
      "Oregano, dill or mint all work. Make a week at a time."]},
  {n:"Chimichurri",t:5,k:"Highest flavour-to-calorie ratio in the kitchen.",
   s:["Big handful of parsley, 1 garlic clove, chilli flakes, chopped fine.",
      "2 tbsp red wine vinegar, 1 tsp oil, salt. The acid carries it, not the fat.",
      "Twenty minutes to come together. Keeps a week."]},
  {n:"Pickled red onion",t:10,k:"Almost no calories, and it makes repetitive food taste new.",
   s:["Onion sliced thin. Cover with vinegar, a pinch of salt, a pinch of sugar.",
      "Ten minutes will do, a day is better. Keeps three weeks.",
      "Put it on everything. Acid against protein is what stops a cut getting boring."]},
  {n:"Pan sauce from nothing",t:4,k:"The brown bits are free flavour you are currently washing down the sink.",
   s:["Meat out and resting. Pour off excess fat, keep the brown bits.",
      "Splash of water, vinegar or lemon into the hot pan. It will hiss hard.",
      "Scrape everything up, reduce by half, 2 min.",
      "Mustard or a spoon of yogurt off the heat to thicken. No butter, no cream."]},
  {n:"Harissa yogurt",t:3,k:"Same base as garlic yogurt, completely different meal.",
   s:["Yogurt, 1–2 tsp harissa, lemon juice, salt.",
      "Taste it — brands vary wildly in heat.",
      "Best on lamb, kofta and roast potato."]}
  ];

