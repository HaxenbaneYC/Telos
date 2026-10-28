
  // ── Preview only: a sample day so the screen opens mid-day, not empty.
  function seed() {
    if (S.mockSeeded) return;
    S.ticks[TODAY] = { m1: true, m2: true };
    S.ticks[TODAY + "-s"] = { d3: true, omega: true, tong: true, crea: true };
    S.ticks[TODAY + "-d"] = { water: true };
    S.mockSeeded = true; save();
  }
  DAILY.push(["bike", "3 km bike ride", ""]);

  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  function RM() { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); }
  function isDone(id) { return !!(S.ticks[TODAY] && S.ticks[TODAY][id]); }
  function isSkipped(id) { return !!(S.skipped[TODAY] && S.skipped[TODAY][id]); }
  function handled(id) { return isDone(id) || isSkipped(id); }   // eaten, or deliberately not eaten
  function nextMeal() {
    for (var i = 0; i < MEALS.length; i++) if (!handled(MEALS[i][0])) return MEALS[i][0];
    return null;
  }
  var SHORT = { egx: "Eggs", oil: "Oil", chk: "Chicken", ric: "Rice", pot: "Potato", swt: "Sweet potato" };
  function shortName(cat, id) { return SHORT[id] || food(cat, id)[1].split(",")[0]; }
  function count(list, key) {
    var st = S.ticks[key] || {}, n = 0;
    list.forEach(function (it) { if (st[it[0]]) n++; });
    return n;
  }
  function macLine(t) { return t.k + " kcal · " + t.p + "P · " + t.f + "F · " + t.c + "C"; }
  function num(v) { var n = parseFloat(v); return isFinite(n) ? n : 0; }
  function r1(n) { return Math.round(n * 10) / 10; }

  // mealId given: the items can be ticked off (only while the meal is not yet eaten and has 2+ items)
  function itemsHtml(parts, mealId) {
    var n = 0, sk = {};
    if (mealId) { parts.forEach(function (pt) { if (eatable(pt)) n++; }); sk = skipOf(mealId); }
    var toggle = !!mealId && n >= 1;
    return parts.map(function (pt, i) {
      var q, w, none = pt.skip || (!pt.noun && pt.g === 0);
      if (none)         { q = "none"; w = esc(pt.name) + '<span class="gs">' + (pt.skip ? "protein covers the fat" : "trimmed for today") + "</span>"; }
      else if (pt.noun) { q = esc(pt.n); w = esc(pt.noun) + '<span class="gs">' + esc(pt.sub) + "</span>"; }
      else              { q = esc(pt.g) + " g"; w = esc(pt.name); }
      var off = pt.off || (toggle && sk[i]);
      if (toggle && !none) {
        return '<button class="item tg' + (off ? " off" : "") + '" data-sk="' + i + '" aria-pressed="' + !off + '" aria-label="' + esc(pt.name) + ', ' + (off ? "skipped" : "eating") + '">' +
          '<span class="q">' + q + '</span><span class="w">' + w + '</span><span class="ck" aria-hidden="true"></span></button>';
      }
      return '<div class="item' + (off ? " off" : "") + '"><span class="q">' + q + '</span><span class="w">' + w + "</span></div>";
    }).join("");
  }

  // Numbers roll to their new value when a meal is logged. That is the feedback.
  function tween(el, to) {
    var from = el._v; el._v = to;
    if (el._raf) cancelAnimationFrame(el._raf);
    if (from == null || from === to || RM()) { el.textContent = fmt(to); return; }
    var t0 = null, dur = 460;
    function step(t) {
      if (t0 === null) t0 = t;
      var k = Math.min(1, (t - t0) / dur), e = k === 1 ? 1 : 1 - Math.pow(2, -10 * k);
      el.textContent = fmt(Math.round(from + (to - from) * e));
      if (k < 1) el._raf = requestAnimationFrame(step);
    }
    el._raf = requestAnimationFrame(step);
  }

  // ── What was actually eaten is frozen when you tick it, so later trims never rewrite it. ──
  function snapOf(d, id) { return S.snap && S.snap[d] && S.snap[d][id]; }
  function snapTot(d, id) { var s = snapOf(d, id); return s ? s.tot : buildMeal(id).tot; }
  function mealView(id) {
    var s = isDone(id) && snapOf(TODAY, id);
    return s ? { tot: s.tot, parts: s.parts } : buildMeal(id);
  }
  function mix(a, b) { var o = {}, k; for (k in a) o[k] = a[k]; for (k in b) o[k] = b[k]; return o; }
  // Partial meals: untick what you did not eat. Only the ticked items count.
  function skipOf(id) { return (S.skip[TODAY] && S.skip[TODAY][id]) || {}; }
  function eatable(pt) { return !pt.skip && pt.t && !(!pt.noun && pt.g === 0); }
  function selView(id) {
    var b = buildMeal(id), sk = skipOf(id), t = { k: 0, p: 0, f: 0, c: 0 }, off = [], n = 0;
    b.parts.forEach(function (pt, i) {
      if (!eatable(pt)) return;
      n++;
      if (sk[i]) { off.push(pt.name); return; }
      t.k += pt.t.k; t.p += pt.t.p; t.f += pt.t.f; t.c += pt.t.c;
    });
    if (!off.length) t = b.tot; else t = { k: Math.round(t.k), p: Math.round(t.p), f: Math.round(t.f), c: Math.round(t.c) };
    return { tot: t, parts: b.parts, off: off, n: n, full: b.tot, sk: sk, allOff: n > 0 && off.length === n };
  }
  function clearSkip(id) { if (S.skip[TODAY]) delete S.skip[TODAY][id]; }

  // ── The coach ──
  // Inside 150 kcal over, nothing changes: that is noise. Beyond it, the meals still
  // to come give up the difference today (fat first, then carbs, never the pre-gym
  // meal, never protein), up to 250 kcal. Whatever is left goes to tomorrow, up to 300.
  var COACH = { margin: 150, today: 250 };
  var TRIM = { on: false, fatFrac: 0, carbFrac: 0, over: 0, goal: 0, achieved: 0, fatG: 0, carbG: 0 };
  function remTot() {
    var o = { k: 0, f: 0, c: 0, cNoPre: 0 };
    MEALS.forEach(function (m) {
      if (handled(m[0])) return;
      var t = buildMeal(m[0]).tot;
      o.k += t.k; o.f += t.f; o.c += t.c; if (m[0] !== "m4") o.cNoPre += t.c;
    });
    return o;
  }
  function plainBuild(id) {
    var keep = TRIM.on; TRIM.on = false;
    var b = buildMeal(id); TRIM.on = keep;
    return b;
  }
  function coachRefresh() {
    TRIM.on = false; TRIM.fatFrac = 0; TRIM.carbFrac = 0; TRIM.goal = 0; TRIM.achieved = 0; TRIM.fatG = 0; TRIM.carbG = 0;
    var tg = todayTarget(), eatenK = eatenOn(TODAY).k, plain = remTot();
    TRIM.over = eatenK + plain.k - tg.k;   // where the day lands if the rest of the plan is eaten as written
    if (TRIM.over <= COACH.margin || plain.k === 0) return;
    TRIM.goal = Math.min(TRIM.over, COACH.today);
    TRIM.on = true;
    TRIM.fatFrac = Math.min(0.5, TRIM.goal / 9 / Math.max(plain.f, 1));
    var now = remTot(), i;
    for (i = 0; i < 3; i++) {           // a fat source that is already skipped gives nothing back, so aim again
      TRIM.achieved = plain.k - now.k;
      if (TRIM.achieved >= TRIM.goal - 10 || TRIM.fatFrac >= 0.5) break;
      TRIM.fatFrac = Math.min(0.5, TRIM.fatFrac + (TRIM.goal - TRIM.achieved) / 9 / Math.max(plain.f, 1));
      now = remTot();
    }
    TRIM.achieved = plain.k - now.k;
    if (TRIM.achieved < TRIM.goal - 10) {   // then carbs, a quarter at most
      TRIM.carbFrac = Math.min(0.25, (TRIM.goal - TRIM.achieved) / 4 / Math.max(plain.cNoPre, 1));
      now = remTot();
      TRIM.achieved = plain.k - now.k;
    }
    TRIM.fatG = plain.f - now.f;
    TRIM.carbG = plain.c - now.c;
  }

  // ── title, the thirteen weeks ──
  function renderTop() {
    $("hDate").textContent = new Date().toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
    var wk = weekNumber(), ph = currentPhase();
    var d = Math.max(0, dayDiff(START, TODAY)), frac = Math.round(Math.min(1, ((d % 7) + 1) / 7) * 100);
    var html = "";
    for (var w = 1; w <= 13; w++) {
      var first = false;
      PHASES.forEach(function (p) { if (p.w[0] === w && w !== 1) first = true; });
      var cls = "wk" + (first ? " gap" : "") + (w === 9 ? " brk" : "") + (w < wk ? " past" : (w === wk ? " now" : ""));
      html += '<i class="' + cls + '"' + (w === wk ? ' style="--f:' + frac + '%"' : "") + "></i>";
    }
    $("weeks").innerHTML = html;
    $("weeks").setAttribute("aria-label", "Week " + wk + " of 13, " + ph.n);
    $("wkL").textContent = "Week " + wk + " of 13 · " + ph.n;
    $("wkR").textContent = fmt(ph.kcal) + " kcal a day";
  }

  // ── the summary ──
  function finding(tg, e, left) {
    var todo = 0;
    MEALS.forEach(function (m) { if (!handled(m[0])) todo++; });
    var pLeft = tg.p - e.p, off = (S.extras[TODAY] || []).length;
    if (left < 0) {
      var over = -left;
      return over <= COACH.margin ? "Inside the 150 kcal margin, so tomorrow stays the same."
                                  : "Tomorrow’s target drops by " + Math.min(300, over) + " kcal to make it up.";
    }
    if (off && TRIM.on) {
      var bits = [];
      if (TRIM.fatG >= 1) bits.push(Math.round(TRIM.fatG) + " g fat");
      if (TRIM.carbG >= 1) bits.push(Math.round(TRIM.carbG) + " g carbs");
      var s = "The rest of today gives up " + (bits.join(" and ") || "a little") + " to cover it. Protein stays.";
      var still = Math.round(TRIM.over - TRIM.achieved);
      if (still > COACH.margin) s += " Still " + fmt(still) + " kcal over, so tomorrow drops by " + Math.min(300, still) + ".";
      return s;
    }
    if (off && TRIM.over <= COACH.margin) return "Your off-plan food is inside the 150 kcal margin, so the plan stays as written.";
    if (!todo) return pLeft > 0 ? "All meals logged. Protein is " + pLeft + " g short." : "All meals logged. Protein is covered.";
    var meals = todo + (todo === 1 ? " meal" : " meals") + " to go";
    return pLeft > 0 ? meals + ", " + pLeft + " g protein still to eat." : "Protein is covered. " + meals + ".";
  }

  function renderHero() {
    var tg = todayTarget(), e = eatenOn(TODAY), left = tg.k - e.k, over = left < 0;
    tween($("rLeft"), Math.abs(left));
    $("rUnit").textContent = over ? "kcal over" : "kcal left";
    $("sum").className = "sum" + (over ? " over" : "") + ($("sum").classList.contains("open") ? " open" : "");
    $("rEaten").textContent = fmt(e.k) + " of " + fmt(tg.k);
    $("kFill").style.width = Math.min(100, e.k / tg.k * 100) + "%";
    $("rFind").textContent = finding(tg, e, left);
    $("sumLine").textContent = "P " + e.p + "/" + tg.p + " · F " + e.f + "/" + tg.f + " · C " + e.c + "/" + tg.c;
    var kp = Math.min(100, e.k / tg.k * 100);
    $("m-k").textContent = fmt(Math.abs(left)); $("m-ku").textContent = over ? "over" : "left";
    $("mf-k").style.width = kp + "%"; $("mc-k").className = "mc4 k" + (over ? " over" : "");
    [["p", e.p, tg.p], ["f", e.f, tg.f], ["c", e.c, tg.c]].forEach(function (d) {
      tween($("v-" + d[0]), d[1]);
      $("t-" + d[0]).textContent = "/ " + d[2] + " g";
      $("f-" + d[0]).style.width = Math.min(100, d[1] / d[2] * 100) + "%";
      $("mc-" + d[0]).className = "mc " + d[0] + (d[1] > d[2] ? " over" : "");
      $("m-" + d[0]).textContent = d[1];
      $("mf-" + d[0]).style.width = Math.min(100, d[1] / d[2] * 100) + "%";
      $("mc4-" + d[0]).className = "mc4 " + d[0] + (d[1] > d[2] ? " over" : "");
    });
  }

  // ── the day ──
  var justAte = null, revealNext = false, eatenOpen = false;
  function rowHtml(m) {
    var id = m[0], b = mealView(id), pick = pickFor(id), done = isDone(id), skd = isSkipped(id);
    var names = m[6].map(function (cat) { return shortName(cat, pick[cat]); }).join(" · ");
    var sn = done && snapOf(TODAY, id);
    if (sn) {
      var off = [], on = [];
      sn.parts.forEach(function (pt) { if (pt.off) off.push(pt.name.toLowerCase()); else if (eatable(pt)) on.push(pt.name.split(",")[0]); });
      if (off.length) names = on.join(" · ") + " · skipped " + off.join(", ");
    }
    if (skd) names = "Skipped";
    return '<div class="mslot" data-m="' + id + '"><div class="mrow' + (done ? " done" : "") + (skd ? " skipped" : "") + '">' +
      '<button class="mopen" data-open="' + id + '" aria-label="' + m[2] + ', details">' +
        '<span class="mtm">' + m[1] + '</span>' +
        '<span class="mbody"><span class="mn">' + m[2] + '</span><span class="ms">' + names + "</span></span>" +
        '<span class="mkc">' + (skd ? "—" : b.tot.k) + "</span></button>" +
      (skd ? '<button class="chk undo" data-unskip="' + id + '" aria-label="Undo skip of ' + m[2] + '">Undo</button>'
           : '<button class="chk" data-ate="' + id + '" aria-pressed="' + done + '" aria-label="' + (done ? "Undo " + m[2] : "Mark " + m[2] + " eaten") + '"></button>') + "</div></div>";
  }
  // One fixed slot under the items holds the hint or the note, so ticking an item never moves the items.
  function skipSlot(b) {
    if (b.n < 1) return "";
    if (b.allOff) return '<div class="skipslot">Nothing ticked. This meal will count as skipped.</div>';
    return '<div class="skipslot">' + (b.off.length
      ? "Skipping " + esc(b.off.join(", ").toLowerCase()) + " · −" + (b.full.k - b.tot.k) + " kcal"
      : "Tap anything you didn’t eat.") + "</div>";
  }
  function doneSlot(id) {
    var sn = snapOf(TODAY, id), off = [];
    if (sn) sn.parts.forEach(function (pt) { if (pt.off) off.push(pt.name); });
    return '<div class="skipslot">' + (off.length ? "Not eaten: " + esc(off.join(", ").toLowerCase()) + " · −" + ((sn.full || sn.tot).k - sn.tot.k) + " kcal" : "Tap an item you didn’t eat to take it off.") + "</div>";
  }
  function trimNote(id) {
    if (!TRIM.on || handled(id)) return "";
    var d = plainBuild(id).tot.k - buildMeal(id).tot.k;
    return d >= 5 ? '<div class="trimnote">−' + d + " kcal to cover your off-plan food</div>" : "";
  }
  function cardHtml(m) {
    var id = m[0], b = selView(id), hits = methodsFor(id);
    return '<div class="mslot next" data-m="' + id + '"><div class="mcard">' +
      '<div class="mhead"><h3>' + m[2] + '</h3><span class="tm">' + m[1] + "</span></div>" +
      '<div class="mac">' + macLine(b.tot) + "</div>" + trimNote(id) +
      '<div class="items">' + itemsHtml(b.parts, id) + "</div>" + skipSlot(b) +
      (b.allOff ? '<button class="bigbtn skip" data-skipmeal="' + id + '">Skip ' + m[2].toLowerCase() + "</button>" : '<button class="bigbtn" data-ate="' + id + '">Ate it</button>') +
      '<div class="two"><button class="sbtn" data-open="' + id + '">Change foods</button>' +
      (hits.length ? '<button class="sbtn rec" data-rec="' + id + '">Recipes · ' + hits.length + "</button>" : "") +
      "</div></div></div>";
  }
  // Eaten meals fold into one row, so the open meal stays where you left your thumb.
  function renderMeals() {
    var nx = nextMeal(), html = "", eaten = MEALS.filter(function (m) { return isDone(m[0]); }), ek = 0;
    if (eaten.length) {
      eaten.forEach(function (m) { ek += mealView(m[0]).tot.k; });
      html += '<div class="egroup' + (eatenOpen ? " open" : "") + (justAte ? " just" : "") + '" data-m="eg">' +
        '<button class="ehead" data-egroup aria-expanded="' + eatenOpen + '"><span class="ek">Eaten</span><span class="ec">' + eaten.length + " of " + MEALS.length +
        '</span><span class="ev">' + fmt(ek) + ' kcal</span><i class="chev"></i></button>' +
        '<div class="ebody"><div>' + eaten.map(rowHtml).join("") + "</div></div></div>";
    }
    MEALS.forEach(function (m) {
      if (isDone(m[0])) return;
      html += m[0] === nx ? cardHtml(m) : rowHtml(m);
    });
    if (!nx) {
      var nsk = MEALS.filter(function (m) { return isSkipped(m[0]); }).length;
      html += '<div class="alldone"><b>Done.</b> ' + (nsk ? (MEALS.length - nsk) + " meals logged, " + nsk + " skipped." : "All five meals are logged.") + "</div>";
    }
    $("meals").innerHTML = html;
    justAte = null;
  }

  function snapshot() {
    var m = {};
    [].forEach.call(document.querySelectorAll("#meals > [data-m]"), function (el) { m[el.getAttribute("data-m")] = el.getBoundingClientRect().top; });
    return m;
  }
  // Rows glide to their new place instead of jumping; the new open card unrolls.
  function playFlip(prev) {
    if (RM() || !Element.prototype.animate) return;
    [].forEach.call(document.querySelectorAll("#meals > [data-m]"), function (el) {
      var id = el.getAttribute("data-m"), d = prev[id] != null ? prev[id] - el.getBoundingClientRect().top : 0;
      if (Math.abs(d) >= 1) el.animate([{ transform: "translateY(" + d + "px)" }, { transform: "none" }], { duration: 420, easing: "cubic-bezier(0.16, 1, 0.3, 1)" });
    });
    var card = document.querySelector("#meals .mslot.next .mcard");
    if (revealNext && card) {
      card.animate([{ clipPath: "inset(0 0 100% 0)", opacity: 0.2 }, { clipPath: "inset(0 0 0 0)", opacity: 1 }], { duration: 420, easing: "cubic-bezier(0.16, 1, 0.3, 1)" });
    }
    revealNext = false;
  }

  function renderMore() {
    var d = count(DAILY, TODAY + "-d"), s = count(SUPPS, TODAY + "-s");
    function row(kind, name, val, cls) {
      return '<button class="srow" data-sheet="' + kind + '"><span class="sk">' + name + '</span><span class="sv' + (cls ? " " + cls : "") + '">' + val + '</span><i class="chev"></i></button>';
    }
    $("more").innerHTML =
      row("d", "Checklist", d + " / " + DAILY.length, d === DAILY.length ? "on" : "") +
      row("s", "Supplements", s + " / " + SUPPS.length, s === SUPPS.length ? "on" : "");
  }
  // Off-plan food sits right on Today: see it, remove it in one tap, add more.
  function renderOffPlan() {
    var ex = S.extras[TODAY] || [], tot = 0;
    ex.forEach(function (e) { tot += e.k || 0; });
    $("offTot").textContent = ex.length ? "+" + fmt(tot) + " kcal" : "";
    $("offplan").innerHTML = ex.map(function (e, i) {
      return '<div class="xrow"><div class="xb"><b>' + esc(e.n) + "</b><span>" + (e.k || 0) + " kcal · " + (e.p || 0) + "P " + (e.f || 0) + "F " + (e.c || 0) + "C" +
        (e.src === "estimate" ? " · estimate" : (e.src === "label" ? " · label" : (e.src === "database" ? " · USDA" : ""))) + '</span></div>' +
        '<button class="pbtn" data-od="' + i + '" aria-label="Remove ' + esc(e.n) + '">' + ICON_X + "</button></div>";
    }).join("") + '<button class="srow" data-sheet="add"><span class="sk">' + (ex.length ? "Add more" : "Add off-plan food") + '</span><i class="chev"></i></button>';
  }
  $("offplan").addEventListener("click", function (ev) {
    var d = ev.target.closest("[data-od]");
    if (d) {
      var i = +d.getAttribute("data-od"), e = S.extras[TODAY].splice(i, 1)[0];
      save(); refresh();
      toast(e.n + " removed", function () { S.extras[TODAY].splice(i, 0, e); save(); refresh(); });
      return;
    }
    var s = ev.target.closest("[data-sheet]"); if (s) openSheet({ view: s.getAttribute("data-sheet") });
  });

  function refresh() { coachRefresh(); renderHero(); renderMeals(); renderOffPlan(); renderMore(); }

  // ── undo toast ──
  var toastT = 0, toastUndo = null;
  function hideToast() {
    var t = $("toast"); t.classList.remove("show"); toastUndo = null;
    clearTimeout(toastT);
    toastT = setTimeout(function () { if (!t.classList.contains("show")) t.hidden = true; }, 260);
  }
  function toast(msg, undoFn) {
    var t = $("toast");
    toastUndo = undoFn || null;
    t.innerHTML = "<span>" + esc(msg) + "</span>" + (undoFn ? '<button class="tundo" data-undo>Undo</button>' : "");
    clearTimeout(toastT);
    t.hidden = false; void t.offsetWidth; t.classList.add("show");
    toastT = setTimeout(hideToast, 4500);
  }
  $("toast").addEventListener("click", function (ev) {
    if (ev.target.closest("[data-undo]")) { var f = toastUndo; hideToast(); if (f) f(); }
  });

  function toggleSkip(id, idx) {
    if (!S.skip[TODAY]) S.skip[TODAY] = {};
    if (!S.skip[TODAY][id]) S.skip[TODAY][id] = {};
    var sk = S.skip[TODAY][id];
    if (sk[idx]) delete sk[idx]; else sk[idx] = true;
    save(); renderMeals();
  }
  // Items can be ticked on a meal that is already logged. Take the last one off and the meal is simply not eaten.
  function ensureSnap(id) {
    if (!S.snap[TODAY]) S.snap[TODAY] = {};
    if (!S.snap[TODAY][id]) { var b = buildMeal(id); S.snap[TODAY][id] = { tot: b.tot, full: b.tot, parts: b.parts }; }
    return S.snap[TODAY][id];
  }
  function toggleEatenItem(id, idx) {
    var sn = ensureSnap(id), prev = JSON.parse(JSON.stringify(sn)), pt = sn.parts[idx];
    if (!pt || !eatable(pt)) return;
    if (pt.off) delete pt.off; else pt.off = true;
    var on = 0, anyOff = false, t = { k: 0, p: 0, f: 0, c: 0 };
    sn.parts.forEach(function (x) {
      if (!eatable(x)) return;
      if (x.off) { anyOff = true; return; }
      on++; t.k += x.t.k; t.p += x.t.p; t.f += x.t.f; t.c += x.t.c;
    });
    if (!on) { unEat(id, prev); return; }
    sn.tot = anyOff ? { k: Math.round(t.k), p: Math.round(t.p), f: Math.round(t.f), c: Math.round(t.c) } : (sn.full || sn.tot);
    save(); refresh();
  }
  function unEat(id, prevSnap) {
    if (S.ticks[TODAY]) delete S.ticks[TODAY][id];
    if (S.snap[TODAY]) delete S.snap[TODAY][id];
    clearSkip(id);
    save(); refresh();
    toast(mealById(id)[2] + " is back to not eaten", function () {
      if (!S.ticks[TODAY]) S.ticks[TODAY] = {};
      if (!S.snap[TODAY]) S.snap[TODAY] = {};
      S.ticks[TODAY][id] = true; S.snap[TODAY][id] = prevSnap; save(); refresh();
      if (sh && sh.view === "meal") paintSheet();
    });
  }
  function toggleItem(id, idx) { if (isDone(id)) toggleEatenItem(id, idx); else toggleSkip(id, idx); }
  // A meal you did not eat at all: it counts nothing and the day moves on.
  function skipMeal(id) {
    if (!S.skipped[TODAY]) S.skipped[TODAY] = {};
    S.skipped[TODAY][id] = true; clearSkip(id); save(); refresh();
    toast(mealById(id)[2] + " skipped", function () { unskipMeal(id); });
  }
  function unskipMeal(id) {
    if (S.skipped[TODAY]) delete S.skipped[TODAY][id];
    save(); refresh();
    if (sh && sh.view === "meal") paintSheet();
  }
  function toggleAte(id, silent) {
    var prev = snapshot(), was = isDone(id), b = null;
    if (!S.ticks[TODAY]) S.ticks[TODAY] = {};
    if (!S.snap[TODAY]) S.snap[TODAY] = {};
    if (was) { delete S.ticks[TODAY][id]; delete S.snap[TODAY][id]; clearSkip(id); }   // undo puts the whole meal back
    else {
      b = selView(id);                                     // built before the tick, so any trim is included
      S.snap[TODAY][id] = { tot: b.tot, full: b.full, parts: b.parts.map(function (pt, i) { return (b.sk[i] && eatable(pt)) ? mix(pt, { off: true }) : pt; }) };
      S.ticks[TODAY][id] = true; justAte = id; clearSkip(id);
    }
    save();
    revealNext = !was;
    refresh(); playFlip(prev);
    if (!was) {
      if (!silent) toast(mealById(id)[2] + " logged · " + b.tot.k + " kcal", function () { toggleAte(id, true); });
      var n = document.querySelector("#meals .mslot.next");
      if (n) setTimeout(function () { n.scrollIntoView({ block: "nearest", behavior: RM() ? "auto" : "smooth" }); }, 90);
    }
  }

  // ── Claude, when this page runs inside Claude. Everywhere else these features stay hidden. ──
  var AI = { fn: null, text: false, images: false, types: "image/*" };
  function initAI() {
    try {
      if (!window.claude || !window.claude.use) return;
      window.claude.use("sample").then(function (fn) {
        if (!fn) return;
        AI.fn = fn; AI.text = true;
        var again = function () { if (sh && sh.view === "add") { syncAdd(); paintSheet(); } };
        if (fn.limits) {
          fn.limits().then(function (l) {
            if (l && l.images) { AI.images = true; AI.types = (l.images.mediaTypes || []).join(",") || "image/*"; }
            again();
          }, again);
        } else again();
      }, function () {});
    } catch (e) {}
  }
  function aiFail(e) {
    var c = e && e.code;
    if (c === "not_granted" || c === "sampling_disabled" || c === "not_declared" || c === "capability_disabled" || c === "capability_removed") {
      AI.text = false; AI.images = false; AI.fn = null;
      return "Claude isn’t available here. Use Numbers instead.";
    }
    if (c === "images_unavailable") { AI.images = false; return "Photos aren’t available here. Describe it or use Numbers."; }
    if (c === "rate_limited") return "Too many requests just now. Wait a minute, or use Numbers.";
    if (c === "image_rejected") return "That file can’t be read as a photo. Try another one.";
    if (c === "session_expired") return "Sign in to Claude again, then retry.";
    return "Couldn’t read that one. Try again, or use Numbers.";
  }
  function okNum(v, max) { return typeof v === "number" && isFinite(v) && v >= 0 && v <= max; }
  function energyWarn(k, p, f, c) {
    var calc = 4 * p + 4 * c + 9 * f;
    return Math.abs(calc - k) > 0.25 * Math.max(k, 1) + 25 ? " The calories and macros don’t add up. Check them." : "";
  }

  // Describe it: "fresh orange juice, 300 ml"
  function askDescribe() {
    var text = (sh.dText || "").trim();
    if (!text || !AI.fn || sh.busy) return;
    sh.busy = "desc"; sh.err = ""; sh.ctl = new AbortController(); paintSheet();
    var prompt = "Estimate the nutrition of food someone ate. What they said: " + JSON.stringify(text) + "\n\n" +
      "Reply with only one JSON object: " +
      '{"name": string (short, title case), "amountText": string (the amount you assumed, like "300 ml"), "kcal": number, "protein": number, "fat": number, "carbs": number, "confidence": "high" | "medium" | "low", "note": string}\n' +
      "Rules: the figures are for the WHOLE amount described, not per 100 g. Carbs means total carbohydrate. Use typical values for the plain food. " +
      "If no amount is given, assume one typical serving. The note is one short sentence saying what you assumed. Round kcal to the nearest 5 and grams to the nearest 0.5.";
    var mine = sh;
    AI.fn.json(prompt, { modelTier: "quick", signal: sh.ctl.signal }).then(function (r) {
      if (sh !== mine) return;
      sh.busy = "";
      if (!r || !okNum(r.kcal, 5000) || !okNum(r.protein, 400) || !okNum(r.fat, 400) || !okNum(r.carbs, 800)) {
        sh.err = "Couldn’t read that one. Try again, or use Numbers."; paintSheet(); return;
      }
      sh.draft = { name: String(r.name || text).slice(0, 60), k: String(Math.round(r.kcal)), p: String(r1(r.protein)), f: String(r1(r.fat)), c: String(r1(r.carbs)), src: "estimate" };
      sh.note = "Estimate, " + String(r.confidence || "medium") + " confidence. " + String(r.note || "") + energyWarn(r.kcal, r.protein, r.fat, r.carbs);
      sh.label = null; sh.ready = true; paintSheet(); toForm();
    }, function (e) {
      if (sh !== mine) return;
      sh.busy = ""; if (!e || e.code !== "cancelled") sh.err = aiFail(e);
      paintSheet();
    });
  }

  // Label photo: the back of the pack, with the brand and the nutrition table
  function askLabel(file) {
    if (!file || !AI.fn || sh.busy) return;
    if (sh.thumb) { try { URL.revokeObjectURL(sh.thumb); } catch (e) {} }
    try { sh.thumb = URL.createObjectURL(file); } catch (e2) { sh.thumb = ""; }
    sh.busy = "photo"; sh.err = ""; sh.ready = false; sh.draft = { name: "", k: "", p: "", f: "", c: "", src: "label" }; sh.label = null; sh.ctl = new AbortController(); paintSheet();
    var prompt = "This is a photo of the back of a packaged food product: its brand and its nutrition facts table.\n" +
      "Reply with only one JSON object: " +
      '{"brand": string | null, "product": string | null, "per100": {"kcal": number, "protein": number, "fat": number, "carbs": number} | null, ' +
      '"perServing": {"kcal": number, "protein": number, "fat": number, "carbs": number} | null, "servingAmount": number | null, "servingUnit": "g" | "ml" | null, ' +
      '"basisUnit": "g" | "ml" | null, "confidence": "high" | "medium" | "low", "note": string}\n' +
      "Rules: copy the numbers exactly as printed, never guess one you cannot read. carbs is total carbohydrate, not the sugars line. " +
      "per100 is the per-100-g or per-100-ml column and basisUnit says which. perServing is the per-portion column and servingAmount is the portion size. " +
      "If calories are only given in kJ, convert (kJ / 4.184) and say so in note. Use null for any group you cannot read, and explain in note.";
    var mine = sh;
    AI.fn.json(prompt, { images: [file], modelTier: "default", signal: sh.ctl.signal }).then(function (r) {
      if (sh !== mine) return;
      sh.busy = "";
      function grp(g) { return g && okNum(g.kcal, 5000) && okNum(g.protein, 400) && okNum(g.fat, 400) && okNum(g.carbs, 800) ? { k: g.kcal, p: g.protein, f: g.fat, c: g.carbs } : null; }
      var per100 = grp(r && r.per100), per = grp(r && r.perServing);
      var sa = r && okNum(r.servingAmount, 5000) && r.servingAmount > 0 ? r.servingAmount : null;
      var bu = r && (r.basisUnit === "ml" || r.basisUnit === "g") ? r.basisUnit : ((r && r.servingUnit === "ml") ? "ml" : "g");
      if (!per100 && !per) { sh.err = "Couldn’t read the nutrition table. Try a clearer, flatter photo."; paintSheet(); return; }
      if (!per && per100 && sa) per = { k: per100.k * sa / 100, p: per100.p * sa / 100, f: per100.f * sa / 100, c: per100.c * sa / 100 };
      if (!per100 && per && sa) per100 = { k: per.k * 100 / sa, p: per.p * 100 / sa, f: per.f * 100 / sa, c: per.c * 100 / sa };
      var brand = r.brand ? String(r.brand) : "", prod = r.product ? String(r.product) : "";
      sh.label = { brand: brand, product: prod, per100: per100, per: per, sa: sa, bu: bu };
      sh.draft = { name: (brand + " " + prod).trim().slice(0, 60) || "Packaged food", k: "", p: "", f: "", c: "", src: "label" };
      sh.amt = per && sa ? { n: 1, u: "serv" } : { n: 100, u: bu };
      if (!per && !sa) sh.amt = { n: 100, u: bu };
      sh.note = "Read from your photo, " + String(r.confidence || "medium") + " confidence." + (r.note ? " " + String(r.note) : "");
      sh.ready = true; labelCalc(); paintSheet(); toForm();
    }, function (e) {
      if (sh !== mine) return;
      sh.busy = ""; if (!e || e.code !== "cancelled") sh.err = aiFail(e);
      paintSheet();
    });
  }
  function scaleG(o, f) { return { k: o.k * f, p: o.p * f, f: o.f * f, c: o.c * f }; }
  // Fill the numbers for the amount eaten (servings, or grams / ml)
  function labelCalc() {
    var L = sh.label, a = sh.amt; if (!L || !a || !(a.n > 0)) return;
    var t = null;
    if (a.u === "serv") t = L.per ? scaleG(L.per, a.n) : (L.per100 && L.sa ? scaleG(L.per100, a.n * L.sa / 100) : null);
    else t = L.per100 ? scaleG(L.per100, a.n / 100) : (L.per && L.sa ? scaleG(L.per, a.n / L.sa) : null);
    if (!t) return;
    sh.draft.k = String(Math.round(t.k)); sh.draft.p = String(r1(t.p)); sh.draft.f = String(r1(t.f)); sh.draft.c = String(r1(t.c));
    sh.note = sh.note.replace(/ The calories and macros don.t add up\. Check them\./, "") + energyWarn(t.k, t.p, t.f, t.c);
  }

  // ── bottom sheet ──
  var sh = null, closeT = 0;
  var ICON_X = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15"/></svg>';
  var ICON_BACK = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.5 4.5L7 10l5.5 5.5"/></svg>';

  // While a sheet is open the page behind it is not reachable by keyboard or screen reader, and focus
  // goes back to where it was when the sheet closes.
  var BEHIND = ["main", "mini"], opener = null;
  function setBehind(on) {
    BEHIND.forEach(function (id) { var e = $(id); if (e) { if (on) e.setAttribute("inert", ""); else e.removeAttribute("inert"); } });
    [].forEach.call(document.querySelectorAll("header, nav"), function (e) { if (on) e.setAttribute("inert", ""); else e.removeAttribute("inert"); });
  }
  function openSheet(s) {
    if (s.view === "add") { s.tab = "find"; s.q = ""; s.hits = []; s.pick = null; s.units = []; s.draft = { name: "", k: "", p: "", f: "", c: "", src: "manual" }; s.ready = false; s.note = ""; s.err = ""; s.busy = ""; s.dText = ""; s.label = null; s.thumb = ""; }
    if (!sh) opener = document.activeElement;
    sh = s; paintSheet(); hideToast();
    var w = $("sheetWrap");
    clearTimeout(closeT);
    w.hidden = false; void w.offsetWidth; w.classList.add("open");
    setBehind(true);
    try { $("panel").focus({ preventScroll: true }); } catch (e) {}
  }
  function closeSheet() {
    var w = $("sheetWrap");
    if (sh && sh.ctl) { try { sh.ctl.abort(); } catch (e) {} }
    if (sh && sh.thumb) { try { URL.revokeObjectURL(sh.thumb); } catch (e2) {} }
    sh = null; w.classList.remove("open");
    setBehind(false);
    if (opener && opener.focus && document.contains(opener)) { try { opener.focus({ preventScroll: true }); } catch (e3) {} }
    opener = null;
    clearTimeout(closeT);
    closeT = setTimeout(function () { if (!sh) w.hidden = true; }, 340);
  }
  function phead(title, sub, back) {
    return '<div class="grab"></div><div class="phead">' +
      (back ? '<button class="pbtn" data-back aria-label="Back">' + ICON_BACK + "</button>" : "") +
      '<div class="pt"><b>' + title + "</b>" + (sub ? "<span>" + sub + "</span>" : "") + "</div>" +
      '<button class="pbtn" data-close aria-label="Close">' + ICON_X + "</button></div>";
  }

  function viewMeal() {
    var id = sh.meal, m = mealById(id), done = isDone(id), skd = isSkipped(id), b = done ? mealView(id) : selView(id), pick = pickFor(id), hits = methodsFor(id);
    var foods = m[6].map(function (cat) {
      return '<button class="frow" data-cat="' + cat + '"><span class="fk">' + cat + '</span><span class="fv">' + esc(food(cat, pick[cat])[1]) + '</span><i class="chev"></i></button>';
    }).join("");
    if (pick.protein && RED[pick.protein]) {
      var cur = S.done[id] || "medium-rare";
      foods += '<label class="frow"><span class="fk">Cooked</span><select class="fsel" data-done="' + id + '" aria-label="How to cook it">' +
        ["rare", "medium-rare", "medium", "medium-well", "well done"].map(function (d) {
          return '<option value="' + d + '"' + (d === cur ? " selected" : "") + ">" + d + "</option>";
        }).join("") + "</select></label>";
    }
    if (pick.protein === "egx") {
      var ew = wholeEggs(id);
      foods += '<label class="frow"><span class="fk">Eggs</span><select class="fsel" data-eggs="' + id + '" aria-label="Whole eggs in the mix">' +
        [0, 1, 2, 3, 4, 5, 6].map(function (n) {
          return '<option value="' + n + '"' + (n === ew ? " selected" : "") + ">" + n + " whole, rest whites</option>";
        }).join("") + "</select></label>";
    }
    return phead(m[2], m[1] + " · " + macLine(b.tot), false) +
      '<div class="pbody"><div class="items big">' + itemsHtml(b.parts, skd ? null : id) + "</div>" + (done ? doneSlot(id) : (skd ? "" : skipSlot(b) + trimNote(id))) +
      '<div class="plabel">Foods</div><div class="fgroup">' + (done ? foods.replace(/data-cat=/g, 'disabled data-x=') : foods) + "</div></div>" +
      '<div class="pfoot">' + (skd ? '<button class="bigbtn" data-unskip="' + id + '">Undo skip</button>'
        : (!done && b.allOff ? '<button class="bigbtn skip" data-skipmeal="' + id + '">Skip ' + m[2].toLowerCase() + "</button>"
        : '<button class="bigbtn' + (done ? " on" : "") + '" data-ate="' + id + '">' + (done ? "Undo eaten" : "Ate it") + "</button>")) +
      (hits.length ? '<button class="sbtn rec" data-rec="' + id + '">Recipes · ' + hits.length + "</button>" : "") + "</div>";
  }

  function viewPick() {
    var m = mealById(sh.meal), cur = pickFor(sh.meal)[sh.cat];
    var opts = FOODS[sh.cat].map(function (f) {
      var u = sh.cat === "protein" ? f[3] + " g protein" : sh.cat === "carb" ? f[5] + " g carbs" : f[4] + " g fat";
      return '<button class="opt' + (f[0] === cur ? " sel" : "") + '" data-food="' + f[0] + '"><span class="ob"><span class="on1">' + esc(f[1]) +
        '</span><span class="on2">per 100 g · ' + f[2] + " kcal · " + u + '</span></span><span class="tick"></span></button>';
    }).join("");
    return phead(sh.cat.charAt(0).toUpperCase() + sh.cat.slice(1), m[2], true) +
      '<div class="pbody"><div class="fgroup">' + opts + "</div></div>";
  }

  function viewRec() {
    var id = sh.meal, m = mealById(id), pick = pickFor(id), hits = methodsFor(id);
    var combo = ["protein", "carb", "fat"].map(function (c) { return pick[c] ? food(c, pick[c])[1] : null; }).filter(Boolean).join(" + ");
    function block(r, key, fin) {
      return '<div class="rpick' + (fin ? " fin" : "") + '"><button class="rp-head" data-pick="' + key + '" aria-expanded="false">' +
        '<span class="rp-main"><span class="rp-n">' + r.n + '</span><span class="rp-k">' + r.k + "</span></span>" +
        '<span class="rp-t">' + r.t + "<small>min</small></span><span class=\"rp-go\" aria-hidden=\"true\"></span></button>" +
        '<div class="rp-body"><div><ol>' + r.s.map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ol></div></div></div>";
    }
    return phead("Methods", esc(m[2]) + " · " + esc(combo), true) +
      '<div class="pbody">' + hits.map(function (r, i) { return block(r, String(i), false); }).join("") +
      '<div class="rhead">Finishers</div>' + FIN.map(function (f, i) { return block(f, "f" + i, true); }).join("") + "</div>";
  }

  function viewList(kind) {
    var items = kind === "d" ? DAILY : SUPPS, key = TODAY + "-" + kind, st = S.ticks[key] || {}, n = count(items, key);
    var rows = items.map(function (it) {
      return '<button class="trow' + (st[it[0]] ? " on" : "") + '" data-tick="' + kind + ":" + it[0] + '" aria-pressed="' + !!st[it[0]] + '"><span class="chk2"></span>' +
        '<span class="tb"><b>' + it[1] + "</b>" + (it[2] ? "<i>" + it[2] + "</i>" : "") + "</span></button>";
    }).join("");
    var note = kind === "s"
      ? '<div class="pnote"><b>Iron is deliberately not here.</b> You eat red meat and don’t lose blood monthly. Get ferritin tested and take it only if it’s low.</div>' : "";
    return phead(kind === "d" ? "Checklist" : "Supplements", n + " of " + items.length + (kind === "d" ? " done" : " taken"), false) +
      '<div class="pbody"><div class="fgroup">' + rows + "</div>" + note + "</div>";
  }

  // ── Off-plan food: describe it, photograph the label, or type the numbers ──
  function syncAdd() {
    if (!sh || sh.view !== "add") return;
    var g = function (id) { var e = document.getElementById(id); return e ? e.value : null; };
    var v;
    if ((v = g("dText")) !== null) sh.dText = v;
    if ((v = g("qIn")) !== null) sh.q = v;
    if ((v = g("fName")) !== null) sh.draft.name = v;
    if ((v = g("fKcal")) !== null) sh.draft.k = v;
    if ((v = g("fP")) !== null) sh.draft.p = v;
    if ((v = g("fF")) !== null) sh.draft.f = v;
    if ((v = g("fC")) !== null) sh.draft.c = v;
  }
  // The button names what it will add and how much it counts: Add "Orange juice, raw" · 118 kcal
  function addLabel() {
    var d = sh && sh.draft; if (!addValid()) return "Add to today";
    return '<span class="al-n">Add “' + esc(d.name.trim().replace(/\s*\([^)]*\)$/, "")) + '”</span><span class="al-k"> · ' + Math.round(parseFloat(d.k)) + " kcal</span>";
  }
  function paintAdd() {
    var b = document.getElementById("fAdd"); if (!b) return;
    var ok = addValid(); b.disabled = !ok; b.classList.toggle("active-ready", ok); b.innerHTML = addLabel();
    var h = document.getElementById("fHint"); if (h) h.textContent = addHint();
  }
  // Why the button is off, in the words of the tab you are on. Empty once it is ready.
  function addHint() {
    if (!sh || !sh.draft) return "";
    var r = addRange(); if (r) return r;
    if (addValid()) {   // typed by hand: say so when the calories and the macros disagree
      var d = sh.draft;
      return sh.tab === "num" && (d.p !== "" || d.f !== "" || d.c !== "") ? energyWarn(parseFloat(d.k), num(d.p), num(d.f), num(d.c)).trim() : "";
    }
    if (sh.tab === "find") return sh.pick ? "Enter how much you had to continue." : "Pick a food from the list to continue.";
    if (sh.tab === "desc") return sh.ready ? "Add a name and calories to continue." : "Describe it and tap Estimate to continue.";
    if (sh.tab === "photo") return sh.ready ? "Enter how much you ate to continue." : "Choose a photo of the label to continue.";
    return "Add a name and calories to continue.";
  }
  // Ranges for what can be added. Typing 1e9 kcal or a negative macro would wreck the day's totals.
  var LIM = { k: 5000, m: 800 };
  function addRange() {
    var d = sh && sh.draft; if (!d) return "";
    var k = parseFloat(d.k), keys = [["p", "Protein"], ["f", "Fat"], ["c", "Carbs"]], i, v;
    if (d.k !== "" && isFinite(k) && (k < 0 || k > LIM.k)) return k < 0 ? "Calories can’t be negative." : "Calories can’t be over " + fmt(LIM.k) + " in one entry.";
    for (i = 0; i < keys.length; i++) {
      if (d[keys[i][0]] === "" || d[keys[i][0]] == null) continue;
      v = parseFloat(d[keys[i][0]]);
      if (!isFinite(v) || v < 0 || v > LIM.m) return keys[i][1] + " has to be between 0 and " + LIM.m + " g.";
    }
    return "";
  }
  function addValid() {
    if (addRange()) return false;
    // with a picked food or a read label the amount drives the numbers, so an empty amount is not addable
    if (sh && sh.amt && ((sh.tab === "find" && sh.pick) || (sh.tab === "photo" && sh.label && sh.ready)) && !(sh.amt.n > 0)) return false;
    return !!(sh && sh.draft && sh.draft.name.trim() && isFinite(parseFloat(sh.draft.k)) && parseFloat(sh.draft.k) >= 0); }

  function viewAdd() {
    var d = sh.draft, ex = S.extras[TODAY] || [], tab = sh.tab;
    var tabs = [["find", "Search"]];
    if (AI.text) tabs.push(["desc", "Describe"]);
    if (AI.images) tabs.push(["photo", "Label"]);
    tabs.push(["num", "Numbers"]);
    if (!tabs.some(function (t) { return t[0] === tab; })) tab = sh.tab = "num";
    var seg = tabs.length > 1 ? '<div class="seg" role="tablist" aria-label="How to add it">' + tabs.map(function (t) {
      return '<button role="tab" class="segb' + (t[0] === tab ? " on" : "") + '" aria-selected="' + (t[0] === tab) + '" data-tab="' + t[0] + '">' + t[1] + "</button>";
    }).join("") + "</div>" : "";

    var top = "", showForm = tab === "num" || sh.ready;
    if (tab === "find") {
      top = findBlock();
    } else if (tab === "desc") {
      top = '<label class="flabel" for="dText">What did you have, and how much?</label>' +
        '<input id="dText" type="text" autocomplete="off" enterkeyhint="go" placeholder="Fresh orange juice, 300 ml" value="' + esc(sh.dText || "") + '">' +
        (sh.busy === "desc"
          ? '<button class="bigbtn wait" data-stop>Estimating… tap to stop</button>'
          : '<button class="bigbtn alt" id="dGo">Estimate</button>') +
        '<p class="aihint">Claude estimates this from typical values. Check the numbers before you add it.</p>';
    } else if (tab === "photo") {
      top = '<label class="photobtn" for="lblFile">' + (sh.thumb ? "Take or choose another photo" : "Take or choose a photo of the back of the pack") + "</label>" +
        '<input class="vh" type="file" id="lblFile" accept="' + AI.types + '">' +
        (sh.thumb ? '<img class="thumb" src="' + sh.thumb + '" alt="Your label photo">' : "") +
        (sh.busy === "photo" ? '<button class="bigbtn wait" data-stop>Reading the label… tap to stop</button>' : "") +
        '<p class="aihint">Show the brand and the nutrition table. Claude reads it for this entry. The photo is not saved.</p>';
    }
    var amount = "";
    if (tab === "photo" && sh.label && sh.ready) {
      var L = sh.label, opts = [];
      if (L.per || (L.per100 && L.sa)) opts.push(["serv", "serving" + (sh.amt.n === 1 ? "" : "s") + (L.sa ? " (" + L.sa + " " + L.bu + ")" : "")]);
      if (L.per100 || (L.per && L.sa)) opts.push([L.bu, L.bu]);
      amount = '<div class="lblhead"><b>' + esc(L.brand || "Unknown brand") + "</b><span>" + esc(L.product || "") + "</span></div>" +
        '<div class="amtrow"><label class="flabel" for="aAmt">How much did you eat?</label>' +
        '<div class="amtin"><input id="aAmt" class="m" type="number" inputmode="decimal" step="any" value="' + sh.amt.n + '">' +
        '<select id="aUnit" class="amtsel" aria-label="Unit">' + opts.map(function (o) {
          return '<option value="' + o[0] + '"' + (o[0] === sh.amt.u ? " selected" : "") + ">" + o[1] + "</option>";
        }).join("") + "</select></div></div>";
    }
    if (tab === "find" && sh.pick && sh.ready) {
      amount = '<div class="amtrow"><label class="flabel" for="aAmt">How much did you have?</label>' +
        '<div class="amtin"><input id="aAmt" class="m" type="number" inputmode="decimal" step="any" value="' + sh.amt.n + '">' +
        '<select id="aUnit" class="amtsel" aria-label="Unit">' + sh.units.map(function (o) {
          return '<option value="' + esc(o.v) + '"' + (o.v === sh.amt.u ? " selected" : "") + ">" + esc(o.l) + "</option>";
        }).join("") + "</select></div></div>";
    }
    var form = "";
    if (showForm) {
      form = amount + '<label class="flabel" for="fName">Name</label><input id="fName" type="text" autocomplete="off" placeholder="Shawarma, 2 biscuits…" value="' + esc(d.name) + '">' +
        '<label class="flabel" for="fKcal">Calories</label><input id="fKcal" class="m" type="number" inputmode="numeric" min="0" max="5000" step="any" placeholder="kcal" value="' + esc(d.k) + '">' +
        '<div class="flabel">Macros in grams, if you know them</div>' +
        '<div class="fin3"><input id="fP" class="m" type="number" inputmode="decimal" min="0" max="800" step="any" placeholder="Protein" aria-label="Protein grams" value="' + esc(d.p) + '">' +
        '<input id="fF" class="m" type="number" inputmode="decimal" min="0" max="800" step="any" placeholder="Fat" aria-label="Fat grams" value="' + esc(d.f) + '">' +
        '<input id="fC" class="m" type="number" inputmode="decimal" min="0" max="800" step="any" placeholder="Carbs" aria-label="Carb grams" value="' + esc(d.c) + '"></div>' +
        (sh.note ? '<p class="aihint" id="aNote">' + esc(sh.note) + "</p>" : "");
    }
    var err = sh.err ? '<p class="ferr" id="fErr">' + esc(sh.err) + "</p>" : '<p class="ferr" id="fErr" hidden></p>';
    var list = ex.length ? '<div class="plabel" style="padding-top:22px">Logged today</div><div class="fgroup">' + ex.map(function (e, i) {
      return '<div class="xrow"><div class="xb"><b>' + esc(e.n) + "</b><span>" + (e.p || 0) + "P · " + (e.f || 0) + "F · " + (e.c || 0) + "C" + (e.src === "estimate" ? " · estimate" : (e.src === "label" ? " · label" : "")) + '</span></div><span class="xk">' + (e.k || 0) +
        ' kcal</span><button class="pbtn" data-xdel="' + i + '" aria-label="Remove ' + esc(e.n) + '">' + ICON_X + "</button></div>";
    }).join("") + "</div>" : "";
    return phead("Off-plan food", "Counts toward today", false) +
      '<div class="pbody">' + seg + top + form + err + list + "</div>" +
      '<div class="pfoot"><button class="bigbtn' + (addValid() ? " active-ready" : "") + '" id="fAdd"' + (addValid() ? "" : " disabled") + ">" + addLabel() + '</button><p class="addhint" id="fHint">' + addHint() + "</p></div>";
  }

  function toForm() {
    var el = document.querySelector("#panel .lblhead, #panel .picked") || document.querySelector("#panel label[for=fName]");
    if (el && el.scrollIntoView) el.scrollIntoView({ block: "start", behavior: RM() ? "auto" : "smooth" });
  }
  function paintSheet() {
    var h = sh.view === "meal" ? viewMeal() : sh.view === "pick" ? viewPick() : sh.view === "rec" ? viewRec()
          : sh.view === "add" ? viewAdd() : sh.view === "photo" ? viewPhoto() : viewList(sh.view);
    $("panel").innerHTML = h;
  }

  function addExtra() {
    syncAdd();
    var d = sh.draft, n = d.name.trim().slice(0, 80), k = parseFloat(d.k), bad = addRange();
    if (bad) { sh.err = bad; paintSheet(); return; }
    if (!n || !isFinite(k) || k < 0) { sh.err = "Give it a name and a calorie figure. A rough number beats no number."; paintSheet(); return; }
    if (!S.extras[TODAY]) S.extras[TODAY] = [];
    var entry = { n: n, k: Math.round(k), p: r1(num(d.p)), f: r1(num(d.f)), c: r1(num(d.c)), src: d.src || "manual" };
    S.extras[TODAY].push(entry);
    save(); closeSheet(); refresh();
    toast(n + " added · " + Math.round(k) + " kcal", function () {   // undo takes out this entry, not just the last one
      var l = S.extras[TODAY], i = l ? l.indexOf(entry) : -1;
      if (i >= 0) { l.splice(i, 1); save(); refresh(); }
    });
  }

  $("panel").addEventListener("click", function (ev) {
    var t = ev.target.closest("[data-skipmeal],[data-unskip],[data-hit],[data-unpick],[data-pdel],[data-sk],[data-close],[data-back],[data-ate],[data-cat],[data-food],[data-rec],[data-pick],[data-tick],[data-xdel],[data-tab],[data-stop],#fAdd,#dGo");
    if (!t) return;
    if (t.hasAttribute("data-hit")) { pickFood(+t.getAttribute("data-hit")); return; }
    if (t.hasAttribute("data-unpick")) { syncAdd(); sh.pick = null; sh.ready = false; sh.note = ""; paintSheet(); return; }
    if (t.hasAttribute("data-pdel")) {
      if (!sh.confirm) { sh.confirm = true; paintSheet(); return; }
      S.photos.splice(sh.i, 1); save(); closeSheet(); renderPhotos(); return;
    }
    if (t.hasAttribute("data-skipmeal")) { skipMeal(t.getAttribute("data-skipmeal")); closeSheet(); return; }
    if (t.hasAttribute("data-unskip")) { unskipMeal(t.getAttribute("data-unskip")); paintSheet(); return; }
    if (t.hasAttribute("data-sk")) { toggleItem(sh.meal, t.getAttribute("data-sk")); paintSheet(); return; }
    if (t.hasAttribute("data-close")) { closeSheet(); return; }
    if (t.hasAttribute("data-back")) { sh = { view: "meal", meal: sh.meal }; paintSheet(); return; }
    if (t.hasAttribute("data-ate")) {
      var id = t.getAttribute("data-ate"), was = isDone(id);
      toggleAte(id, was);
      if (was) paintSheet(); else closeSheet();
      return;
    }
    if (t.hasAttribute("data-cat")) { sh = { view: "pick", meal: sh.meal, cat: t.getAttribute("data-cat") }; paintSheet(); return; }
    if (t.hasAttribute("data-food")) {
      if (!S.picks[sh.meal]) S.picks[sh.meal] = {};
      S.picks[sh.meal][sh.cat] = t.getAttribute("data-food");
      clearSkip(sh.meal); save(); sh = { view: "meal", meal: sh.meal }; paintSheet(); refresh(); return;
    }
    if (t.hasAttribute("data-rec")) { sh = { view: "rec", meal: t.getAttribute("data-rec") }; paintSheet(); return; }
    if (t.hasAttribute("data-pick")) {
      var wrap = t.parentElement, open = wrap.classList.contains("open");
      [].forEach.call($("panel").querySelectorAll(".rpick.open"), function (el) {
        el.classList.remove("open"); el.querySelector(".rp-head").setAttribute("aria-expanded", "false");
      });
      if (!open) {
        wrap.classList.add("open"); t.setAttribute("aria-expanded", "true");
        setTimeout(function () { wrap.scrollIntoView({ block: "nearest", behavior: RM() ? "auto" : "smooth" }); }, 180);
      }
      return;
    }
    if (t.hasAttribute("data-tick")) {
      var p = t.getAttribute("data-tick").split(":"), key = TODAY + "-" + p[0];
      if (!S.ticks[key]) S.ticks[key] = {};
      if (S.ticks[key][p[1]]) delete S.ticks[key][p[1]]; else S.ticks[key][p[1]] = true;
      t.classList.toggle("on", !!S.ticks[key][p[1]]);
      t.setAttribute("aria-pressed", String(!!S.ticks[key][p[1]]));
      var items = p[0] === "d" ? DAILY : SUPPS;
      $("panel").querySelector(".pt span").textContent = count(items, key) + " of " + items.length + (p[0] === "d" ? " done" : " taken");
      save(); renderMore(); return;
    }
    if (t.hasAttribute("data-xdel")) {
      syncAdd(); S.extras[TODAY].splice(+t.getAttribute("data-xdel"), 1); save(); paintSheet(); refresh(); return;
    }
    if (t.hasAttribute("data-tab")) {
      syncAdd(); sh.tab = t.getAttribute("data-tab"); sh.err = ""; sh.pick = null;
      sh.ready = sh.tab === "num" ? sh.ready : false; if (sh.tab !== "num") { sh.note = ""; }
      if (sh.tab === "find") sh.hits = searchFoods(sh.q || "");
      paintSheet(); return;
    }
    if (t.hasAttribute("data-stop")) { if (sh.ctl) sh.ctl.abort(); return; }
    if (t.id === "dGo") { syncAdd(); askDescribe(); return; }
    if (t.id === "fAdd") { addExtra(); }
  });
  $("panel").addEventListener("input", function (ev) {
    if (!sh || sh.view !== "add") return;
    var id = ev.target.id;
    if (id === "qIn") {
      sh.q = ev.target.value; sh.hits = searchFoods(sh.q);
      var qr = document.getElementById("qRes"); if (qr) qr.innerHTML = hitsHtml();
      return;
    }
    if (id === "aAmt") {
      sh.amt.n = parseFloat(ev.target.value); calcAmount();
      var map = { fName: "name", fKcal: "k", fP: "p", fF: "f", fC: "c" };
      for (var k in map) { var el = document.getElementById(k); if (el && isFinite(sh.amt.n) && sh.amt.n > 0) el.value = sh.draft[map[k]]; }
      var nn = document.getElementById("aNote"); if (nn) nn.textContent = sh.note;
    } else syncAdd();
    paintAdd();
  });
  $("panel").addEventListener("change", function (ev) {
    var dn = ev.target.getAttribute("data-done"), eg = ev.target.getAttribute("data-eggs");
    if (dn) { S.done[dn] = ev.target.value; save(); return; }
    if (eg) { S.eggs[eg] = parseInt(ev.target.value, 10); clearSkip(eg); save(); paintSheet(); refresh(); return; }
    if (ev.target.id === "aUnit" && sh && sh.amt) { sh.amt.u = ev.target.value; calcAmount(); syncAddFromDraft(); }
    if (ev.target.id === "lblFile" && ev.target.files && ev.target.files[0]) { syncAdd(); askLabel(ev.target.files[0]); }
  });
  function syncAddFromDraft() {
    var map = { fName: "name", fKcal: "k", fP: "p", fF: "f", fC: "c" };
    for (var k in map) { var el = document.getElementById(k); if (el) el.value = sh.draft[map[k]]; }
    var n = document.getElementById("aNote"); if (n) n.textContent = sh.note;
    paintAdd();
  }
  $("panel").addEventListener("keydown", function (ev) {
    if (ev.key === "Enter" && ev.target.id === "dText") { ev.preventDefault(); syncAdd(); askDescribe(); }
  });
  $("scrim").addEventListener("click", closeSheet);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && sh) closeSheet(); });

  $("meals").addEventListener("click", function (ev) {
    var t = ev.target.closest("[data-ate],[data-open],[data-rec],[data-egroup],[data-sk],[data-skipmeal],[data-unskip]");
    if (!t) return;
    if (t.hasAttribute("data-skipmeal")) { skipMeal(t.getAttribute("data-skipmeal")); return; }
    if (t.hasAttribute("data-unskip")) { unskipMeal(t.getAttribute("data-unskip")); return; }
    if (t.hasAttribute("data-sk")) { toggleItem(t.closest(".mslot").getAttribute("data-m"), t.getAttribute("data-sk")); return; }
    if (t.hasAttribute("data-egroup")) {
      eatenOpen = !eatenOpen;
      t.closest(".egroup").classList.toggle("open", eatenOpen);
      t.setAttribute("aria-expanded", String(eatenOpen));
      return;
    }
    if (t.hasAttribute("data-ate")) { toggleAte(t.getAttribute("data-ate")); return; }
    if (t.hasAttribute("data-rec")) { openSheet({ view: "rec", meal: t.getAttribute("data-rec") }); return; }
    openSheet({ view: "meal", meal: t.getAttribute("data-open") });
  });
  $("more").addEventListener("click", function (ev) {
    var t = ev.target.closest("[data-sheet]");
    if (t) openSheet({ view: t.getAttribute("data-sheet") });
  });

  // Short phones fold the macros into one line; this opens them.
  $("sumToggle").addEventListener("click", function () {
    var open = !$("sum").classList.contains("open");
    $("sum").classList.toggle("open", open);
    $("sumToggle").setAttribute("aria-expanded", String(open));
  });

  // The header and tab bar float over the scrolling day, so the day needs their real heights.
  var io = null;
  function watchSummary() {
    if (!window.IntersectionObserver) return;
    if (io) io.disconnect();
    var hh = document.querySelector("header").offsetHeight;
    io = new IntersectionObserver(function (entries) {
      var en = entries[0], gone = !en.isIntersecting && en.rootBounds && en.boundingClientRect.top < en.rootBounds.top + 1;
      $("mini").classList.toggle("show", !!gone && !$("v-today").hidden);
    }, { root: document.querySelector("main"), rootMargin: "-" + hh + "px 0px 0px 0px", threshold: 0 });
    io.observe($("sum"));
  }
  function measureChrome() {
    var r = document.documentElement.style;
    r.setProperty("--hh", document.querySelector("header").offsetHeight + "px");
    r.setProperty("--nh", document.querySelector("nav").offsetHeight + "px");
    watchSummary();
  }
  window.addEventListener("resize", measureChrome);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measureChrome);

  // On-screen keyboard: lift the sheet above it and keep the focused field in view.
  if (window.visualViewport) {
    var vv = window.visualViewport;
    var fitSheet = function () {
      var kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      $("panel").style.bottom = kb + "px";
      $("panel").style.maxHeight = Math.round(vv.height * 0.92) + "px";
    };
    vv.addEventListener("resize", fitSheet);
    vv.addEventListener("scroll", fitSheet);
  }
  $("panel").addEventListener("focusin", function (ev) {
    var t = ev.target;
    if (t && t.tagName === "INPUT" && t.type !== "file") setTimeout(function () { t.scrollIntoView({ block: "center", behavior: RM() ? "auto" : "smooth" }); }, 320);
  });

