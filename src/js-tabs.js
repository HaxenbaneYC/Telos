
  // ═══════════════ Trend, Food, Train ═══════════════

  // Preview only: three weeks of lead-in data so the charts open populated.
  function seed2() {
    if (S.mockSeeded2) return;
    var noise = [0.2, -0.1, 0.3, -0.2, 0.0, 0.15, -0.25, 0.1, -0.05, 0.2, -0.15, 0.05, -0.2, 0.1, -0.1, 0.15, -0.05, 0.0, -0.1, 0.05], i;
    for (i = 20; i >= 1; i--) S.weights[shift(TODAY, -i)] = Math.round((75.6 - (20 - i) * 0.025 + noise[20 - i]) * 100) / 100;
    var sl = [6.5, 7, 6, 6.75, 7.25, 6.5];
    for (i = 0; i < sl.length; i++) S.sleep[shift(TODAY, -(sl.length - i))] = sl[i];
    S.meas[shift(TODAY, -14)] = { w: 82.5, s: 113 };
    S.meas[shift(TODAY, -7)] = { w: 82.0, s: 113.5 };
    S.mockSeeded2 = true; save();
  }

  function dshort(iso) { return parseISO(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" }); }
  function dlong(iso) { return parseISO(iso).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }); }
  function sgn(n, dp) { return (n < 0 ? "−" : (n > 0 ? "+" : "")) + Math.abs(n).toFixed(dp); }

  // ── weekly analysis, computed only from what has actually been logged ──
  function fmtRate(r) {
    if (r == null) return "—";
    var v = Math.abs(r).toFixed(2);
    return r < 0 ? "Down " + v + " kg" : (r > 0 ? "Up " + v + " kg" : "Flat");
  }
  function analyse() {
    var ph = currentPhase(), wk = weekNumber();
    var out = { wk: wk, phase: ph };
    var e = entries();
    var inRange = function (from, to) {
      return e.filter(function (x) { var d = dayDiff(x.d, TODAY); return d >= from && d <= to; }).map(function (x) { return x.w; });
    };
    var thisW = inRange(0, 6), lastW = inRange(7, 13);
    out.n = thisW.length;
    out.avg = thisW.length ? mean(thisW) : null;
    out.prev = lastW.length ? mean(lastW) : null;
    out.rate = (out.avg != null && out.prev != null) ? out.avg - out.prev : null;
    out.ratePct = out.rate != null ? (out.rate / out.avg) * 100 : null;

    var ticked = 0, possible = 0, proteinDays = 0, loggedDays = 0;
    for (var i = 0; i < 7; i++) {
      var d = shift(TODAY, -i);
      if (dayDiff(START, d) < 0) continue;
      possible += MEALS.length;
      var t = S.ticks[d] || {}, any = 0;
      MEALS.forEach(function (m) { if (t[m[0]]) { ticked++; any++; } });
      if (any || (S.extras[d] || []).length) loggedDays++;
      if (eatenOn(d).p >= ph.p * 0.9) proteinDays++;
    }
    out.adherence = possible ? Math.round(ticked / possible * 100) : null;
    out.proteinDays = proteinDays;
    out.loggedDays = loggedDays;

    var sk = Object.keys(S.sleep).filter(function (k) { var dd = dayDiff(k, TODAY); return dd >= 0 && dd <= 6; });
    out.sleep = sk.length ? mean(sk.map(function (k) { return S.sleep[k]; })) : null;
    out.sleepN = sk.length;

    var mk = Object.keys(S.meas).sort();
    if (mk.length) {
      var last = S.meas[mk[mk.length - 1]];
      out.waist = last.w;
      out.gap = (last.s != null && last.w != null) ? last.s - last.w : null;
      if (mk.length > 1) {
        var prevM = S.meas[mk[mk.length - 2]];
        if (prevM.w != null && last.w != null) out.waistD = last.w - prevM.w;
        if (prevM.s != null && prevM.w != null && out.gap != null) out.gapD = out.gap - (prevM.s - prevM.w);
      }
    }

    var isBreak = ph.n === "Diet break";
    if (out.avg == null) {
      out.tone = "warn"; out.title = "Nothing logged yet";
      out.why = "Log a weight tomorrow morning and this fills in. The first useful read comes after seven days — anything sooner is water.";
      out.action = { k: "hold", t: "Weigh daily, same conditions. Nothing to decide this week." };
    } else if (out.rate == null) {
      out.tone = "warn"; out.title = "Baseline week";
      out.why = "You have " + out.n + " weigh-in" + (out.n === 1 ? "" : "s") + " this week and nothing to compare against yet. " +
        "<b>Expect no movement in week one</b> — resuming training refills glycogen and the water bound to it, which masks the fat loss underneath.";
      out.action = { k: "hold", t: "Hold everything. Reacting to a flat first week is what broke the last three attempts." };
    } else if (isBreak) {
      out.tone = "good"; out.title = "Diet break — scale up is correct";
      out.why = "You are eating at maintenance on purpose. " + fmtRate(out.rate) + " this week is carbohydrate and water, not fat. It clears within four days of going back to the deficit.";
      out.action = { k: "hold", t: "Change nothing. The break is doing its job." };
    } else if (out.adherence != null && out.adherence < 70) {
      out.tone = "bad"; out.title = "Execution, not calories";
      out.why = "You hit <b>" + out.adherence + "% of planned meals</b> this week. Below 70% the calorie number is not what is limiting you, and adjusting it would be guessing.";
      out.action = { k: "stop", t: "<b>Do not touch the target.</b> Get a full week of meals in first, then we read the trend properly." };
    } else if (out.rate > -0.15) {
      out.tone = "warn"; out.title = out.rate > 0.15 ? "Trending up" : "Stalled";
      out.why = fmtRate(out.rate) + " against a target of about −0.5 kg a week. Adherence is " + out.adherence + "%, so this looks like a genuine plateau rather than a logging gap.";
      out.action = { k: "change", t: "One lever only: <b>drop 150 kcal</b> or <b>add 2,000 steps</b>. Not both. Give it a full week before judging." };
    } else if (out.rate < -1.0) {
      out.tone = "bad"; out.title = "Coming off too fast";
      out.why = fmtRate(out.rate) + " is " + Math.abs(out.ratePct).toFixed(1) + "% of bodyweight. Above roughly 1% a week the share of the loss coming from muscle climbs, and you end up smaller rather than leaner.";
      out.action = { k: "stop", t: "<b>Eat more.</b> Add 150–200 kcal, mostly carbs, and hold training volume." };
    } else {
      out.tone = "good"; out.title = "On rate";
      out.why = fmtRate(out.rate) + ", which is " + Math.abs(out.ratePct).toFixed(1) + "% of bodyweight — inside the band where the loss stays mostly fat. Adherence " + out.adherence + "%.";
      out.action = { k: "hold", t: "<b>Change nothing.</b> The plan is working; let it keep working." };
    }
    if (out.sleep != null && out.sleep < 6.5 && out.sleepN >= 4) out.sleepFlag = true;
    return out;
  }

  // ── Trend ──
  function renderReview() {
    var a = analyse();
    $("tWk").textContent = "Week " + a.wk + " of 13";
    function cell(k, v, cls, note) {
      return '<div class="rvcell"><div class="k">' + k + '</div><div class="v' + (cls ? " " + cls : "") + '">' + v + "</div>" + (note ? '<div class="n">' + note + "</div>" : "") + "</div>";
    }
    var cells = "";
    cells += cell("Rate this week", a.rate != null ? sgn(a.rate, 2) + "<small>kg</small>" : "—", a.rate == null ? "" : (a.rate > -0.15 ? "warn" : (a.rate < -1.0 ? "" : "good")),
      a.ratePct != null ? Math.abs(a.ratePct).toFixed(1) + "% of bodyweight" : "needs two weeks");
    cells += cell("7-day average", a.avg != null ? a.avg.toFixed(2) + "<small>kg</small>" : "—", "", a.n ? a.n + " weigh-in" + (a.n === 1 ? "" : "s") : "none logged");
    cells += cell("Meals hit", a.adherence != null ? a.adherence + "<small>%</small>" : "—", a.adherence == null ? "" : (a.adherence >= 85 ? "good" : (a.adherence >= 70 ? "warn" : "")), a.proteinDays + " of 7 days on protein");
    cells += cell("Sleep", a.sleep != null ? a.sleep.toFixed(1) + "<small>h</small>" : "—", a.sleep == null ? "" : (a.sleep >= 7 ? "good" : (a.sleep >= 6.5 ? "warn" : "")), a.sleepN ? a.sleepN + " night" + (a.sleepN === 1 ? "" : "s") + " logged" : "not logged");
    if (a.gap != null) {
      cells += cell("Taper gap", a.gap.toFixed(1) + "<small>cm</small>", a.gapD != null && a.gapD > 0 ? "good" : "", a.gapD != null ? sgn(a.gapD, 1) + " cm since last" : "first measurement");
      cells += cell("Waist", a.waist != null ? a.waist.toFixed(1) + "<small>cm</small>" : "—", a.waistD != null && a.waistD < 0 ? "good" : "", a.waistD != null ? sgn(a.waistD, 1) + " cm since last" : "first measurement");
    }
    $("review").innerHTML =
      '<div class="rv-title ' + a.tone + '">' + a.title + "</div>" +
      '<p class="find">' + a.why + "</p>" +
      '<div class="rvgrid">' + cells + "</div>" +
      '<div class="rvact"><div class="k">What to do</div><div class="t">' + a.action.t + "</div></div>" +
      (a.sleepFlag ? '<div class="rvact"><div class="k">The binding constraint</div><div class="t">Sleeping <b>' + a.sleep.toFixed(1) +
        " h</b> on average. At this level sleep is costing you more than any calorie adjustment can win back — raised cortisol holds subcutaneous water, blunts recovery and drives the late-night eating. <b>Fix the wake time before changing the food.</b></div></div>" : "");
  }
  function renderNewWk() {
    var a = analyse(), b = $("newWk");
    if (a.wk >= 2 && a.wk > S.seenWk && a.avg != null) {
      b.hidden = false;
      $("newWkTxt").innerHTML = "<b>Week " + a.wk + " review</b> · " + a.title;
    } else b.hidden = true;
  }
  $("newWk").addEventListener("click", function () { S.seenWk = weekNumber(); save(); $("newWk").hidden = true; showTab("trend"); });

  function renderMorning() {
    var w = S.weights[TODAY], h = S.sleep[TODAY], done = (w != null || h != null);
    $("wIn").value = w != null ? w.toFixed(2) : "";
    $("sIn").value = h != null ? String(h) : "";
    $("mLog").textContent = done ? "Update" : "Log";
    $("mNote").textContent = done ? "Logged today." : "First thing, after the toilet, before food or water. Sleep goes here because it belongs to last night.";
  }
  $("mLog").addEventListener("click", function () {
    var wv = $("wIn").value.trim(), sv = $("sIn").value.trim(), er = $("mErr"), w = parseFloat(wv), h = parseFloat(sv);
    var pw = S.weights[TODAY], ps = S.sleep[TODAY];
    function bad(msg) { er.textContent = msg; er.hidden = false; }
    if (wv === "" && sv === "") { bad("Enter your weight, your sleep, or both."); return; }
    if (wv !== "" && (!isFinite(w) || w < 30 || w > 250)) { bad("That weight doesn’t look right. Use kilograms, like 75.2."); return; }
    if (sv !== "" && (!isFinite(h) || h < 0 || h > 16)) { bad("That sleep doesn’t look right. Use hours, like 6.5."); return; }
    er.hidden = true;
    var bits = [];
    if (wv !== "") { S.weights[TODAY] = Math.round(w * 100) / 100; bits.push(S.weights[TODAY].toFixed(2) + " kg"); }
    if (sv !== "") { S.sleep[TODAY] = Math.round(h * 4) / 4; bits.push(S.sleep[TODAY] + " h"); }
    save(); renderTrend(); renderNewWk();
    toast("Logged · " + bits.join(" · "), function () {
      if (pw == null) delete S.weights[TODAY]; else S.weights[TODAY] = pw;
      if (ps == null) delete S.sleep[TODAY]; else S.sleep[TODAY] = ps;
      save(); renderTrend(); renderNewWk();
    });
  });

  function renderWeight() {
    var e = entries(), ws = e.map(function (x) { return x.w; }), a = ws.slice(-7), b = ws.slice(-14, -7);
    $("wAvg").textContent = e.length ? mean(a).toFixed(2) : "—";
    var dEl = $("wDelta");
    if (a.length && b.length) { var dl = mean(a) - mean(b); dEl.innerHTML = sgn(dl, 2) + "<small>kg</small>"; dEl.className = "num" + (dl < 0 ? " good" : ""); }
    else { dEl.textContent = "—"; dEl.className = "num"; }
    $("wTo").innerHTML = e.length ? Math.max(0, mean(a) - TARGET).toFixed(1) + "<small>kg</small>" : "—";
    $("wN").textContent = e.length;
    drawChart();
  }
  function niceStep(span, maxTicks) {
    var steps = [0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5, 10];
    for (var i = 0; i < steps.length; i++) if (span / steps[i] <= maxTicks) return steps[i];
    return 10;
  }
  // One series, straight segments, a few faint rules, true pixel text, a time scale.
  function drawChart() {
    var box = $("chart"), e = entries();
    if (e.length < 2) { box.className = "chart empty"; box.innerHTML = "<p>Two weigh-ins and the line starts.</p>"; return; }
    box.className = "chart";
    var W = Math.max(240, box.clientWidth || 326), H = 190, pL = 38, pR = 12, pT = 20, pB = 24;
    var t0 = parseISO(e[0].d).getTime(), t1 = parseISO(e[e.length - 1].d).getTime(), sp = Math.max(1, t1 - t0);
    var ws = e.map(function (x) { return x.w; });
    var dlo = Math.min.apply(null, ws), dhi = Math.max.apply(null, ws);
    var showT = TARGET >= dlo - 2;                       // the target only joins the axis when it is near the data
    var lo = showT ? Math.min(dlo, TARGET) : dlo, hi = dhi;
    if (hi - lo < 1) { var mid = (hi + lo) / 2; lo = mid - 0.5; hi = mid + 0.5; }
    var step = niceStep(hi - lo, 5);
    lo = Math.floor(lo / step) * step; hi = Math.ceil(hi / step) * step; if (hi === lo) hi = lo + step;
    function X(d) { return pL + (parseISO(d).getTime() - t0) * (W - pL - pR) / sp; }
    function Y(v) { return pT + (hi - v) * (H - pT - pB) / (hi - lo); }
    var avg = ws.map(function (_, i) { return mean(ws.slice(Math.max(0, i - 6), i + 1)); });
    var raw = e.map(function (x) { return X(x.d).toFixed(1) + "," + Y(x.w).toFixed(1); }).join(" ");
    var al = e.map(function (x, i) { return X(x.d).toFixed(1) + "," + Y(avg[i]).toFixed(1); }).join(" ");
    var g = "", v;
    for (v = lo; v <= hi + 1e-9; v += step) {
      var y = Y(v).toFixed(1);
      g += '<line class="gl" x1="' + pL + '" y1="' + y + '" x2="' + (W - pR) + '" y2="' + y + '"/><text x="' + (pL - 7) + '" y="' + (+y + 4) + '" text-anchor="end">' + (step < 1 ? v.toFixed(1) : v.toFixed(0)) + "</text>";
    }
    var last = e.length - 1, lx = X(e[last].d), ly = Y(avg[last]);
    var falling = avg[last] <= avg[Math.max(0, last - 1)], labY = (falling && ly + 18 < H - pB + 4) ? ly + 18 : ly - 9;   // label goes where the line is not
    var tg = !showT ? "" : '<line class="tgt" x1="' + pL + '" y1="' + Y(TARGET).toFixed(1) + '" x2="' + (W - pR) + '" y2="' + Y(TARGET).toFixed(1) + '"/>' +
      '<text class="tgt-t" x="' + (W - pR) + '" y="' + (Y(TARGET) - 6).toFixed(1) + '" text-anchor="end">Target ' + TARGET + " kg</text>";
    var xl = '<text x="' + pL + '" y="' + (H - 5) + '">' + dshort(e[0].d) + "</text>" +
      (sp > 10 * 86400000 ? '<text x="' + ((pL + W - pR) / 2).toFixed(1) + '" y="' + (H - 5) + '" text-anchor="middle">' + dshort(iso(new Date((t0 + t1) / 2))) + "</text>" : "") +
      '<text x="' + (W - pR) + '" y="' + (H - 5) + '" text-anchor="end">' + dshort(e[last].d) + "</text>";
    box.innerHTML = '<svg viewBox="0 0 ' + W + " " + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="Weight with 7-day average, now ' + avg[last].toFixed(1) + ' kilograms">' +
      g + tg + '<polyline class="raw" points="' + raw + '"/><polyline class="avg" points="' + al + '"/>' +
      '<circle class="dot" cx="' + lx.toFixed(1) + '" cy="' + ly.toFixed(1) + '" r="4"/>' +
      '<text class="end-t" x="' + Math.min(lx, W - pR).toFixed(1) + '" y="' + labY.toFixed(1) + '" text-anchor="end">' + avg[last].toFixed(1) + "</text>" + xl + "</svg>";
  }

  function renderMeas() {
    var keys = Object.keys(S.meas).sort().reverse();
    $("measDue").textContent = new Date().getDay() === 0 ? "due today" : "Sundays";
    var last = keys.length ? S.meas[keys[0]] : null;
    $("mGap").textContent = last && last.s != null && last.w != null ? (last.s - last.w).toFixed(1) : "—";
    if (!keys.length) { $("measList").innerHTML = '<div class="sw"><div class="b">No measurements yet. Waist and shoulders, once a week.</div></div>'; return; }
    $("measList").innerHTML = keys.slice(0, 6).map(function (k) {
      var m = S.meas[k], gap = (m.s != null && m.w != null) ? (m.s - m.w).toFixed(1) : null;
      return '<div class="mxrow"><span class="d">' + dshort(k) + '</span><span class="g">' + (gap ? gap + " cm" : "") + '</span><span class="det">waist ' + (m.w != null ? m.w : "—") + " · shoulders " + (m.s != null ? m.s : "—") + "</span>" +
        '<button class="pbtn" data-mdel="' + k + '" aria-label="Remove the ' + dshort(k) + ' measurement">' + ICON_X + "</button></div>";
    }).join("");
  }
  $("measList").addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-mdel]"); if (!b) return;
    delete S.meas[b.getAttribute("data-mdel")]; save(); renderMeas(); renderReview();
  });
  $("mSave").addEventListener("click", function () {
    var w = parseFloat($("mWaist").value), s2 = parseFloat($("mShoulder").value);
    if (!isFinite(w) && !isFinite(s2)) { $("mWaist").focus(); return; }
    S.meas[TODAY] = { w: isFinite(w) ? w : null, s: isFinite(s2) ? s2 : null };
    save(); $("mWaist").value = ""; $("mShoulder").value = ""; renderMeas(); renderReview();
    toast("Measurements saved");
  });

  function renderPhotos() {
    var g = $("photoGrid");
    $("photoNote").textContent = S.photos.length ? S.photos.length + " saved" : "weekly";
    g.innerHTML = S.photos.slice(0, 60).map(function (p, i) {
      return '<button class="pcell" data-pi="' + i + '" aria-label="Photo from ' + dshort(p.d) + '"><img src="' + p.src + '" alt=""><span class="d">' + dshort(p.d) + "</span></button>";
    }).join("");
  }
  $("photoGrid").addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-pi]"); if (b) openSheet({ view: "photo", i: +b.getAttribute("data-pi"), confirm: false });
  });
  function viewPhoto() {
    var p = S.photos[sh.i];
    if (!p) return phead("Photo", "", false) + '<div class="pbody"><p class="aihint">That photo is gone.</p></div>';
    return phead(dlong(p.d), "Progress photo", false) +
      '<div class="pbody"><img class="viewimg" src="' + p.src + '" alt="Progress photo from ' + dshort(p.d) + '"></div>' +
      '<div class="pfoot"><button class="bigbtn alt" style="margin-top:0" data-pdel>' + (sh.confirm ? "Tap again to delete" : "Delete photo") + "</button></div>";
  }
  // photos are resized on this device and stored as small JPEGs
  $("pIn").addEventListener("change", function (ev) {
    var f = ev.target.files && ev.target.files[0];
    if (!f) return;
    var err = $("pErr"); err.hidden = true;
    var img = new Image(), url = URL.createObjectURL(f);
    img.onload = function () {
      var max = 440, sc = Math.min(1, max / Math.max(img.width, img.height));
      var cv = document.createElement("canvas");
      cv.width = Math.round(img.width * sc); cv.height = Math.round(img.height * sc);
      cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url);
      var data;
      try { data = cv.toDataURL("image/jpeg", 0.72); }
      catch (e) { err.textContent = "Couldn’t read that image."; err.hidden = false; return; }
      S.photos.unshift({ d: TODAY, src: data });
      try { localStorage.setItem(KEY, JSON.stringify(S)); }
      catch (e2) { S.photos.shift(); err.textContent = "Out of room on this device. Delete an older photo first."; err.hidden = false; return; }
      $("pIn").value = ""; renderPhotos();
    };
    img.onerror = function () { URL.revokeObjectURL(url); err.textContent = "That file isn’t an image."; err.hidden = false; };
    img.src = url;
  });

  var logOpen = false;
  function accHtml(id, open, name, sub, val, body, cls) {
    return '<div class="acc' + (open ? " open" : "") + (cls ? " " + cls : "") + '" id="' + id + '"><button class="acc-h" data-acc aria-expanded="' + !!open + '">' +
      (cls && cls.indexOf("wrow") >= 0 ? "" : "") + '<span class="ab"><span class="an">' + name + "</span>" + (sub ? '<span class="as">' + sub + "</span>" : "") + "</span>" +
      (val ? '<span class="av">' + val + "</span>" : "") + '<i class="chev"></i></button><div class="acc-b"><div>' + body + "</div></div></div>";
  }
  function renderLog() {
    var e = entries().reverse();
    var rows = e.length ? e.slice(0, 30).map(function (x) {
      return '<div class="xrow"><div class="xb"><b>' + dlong(x.d) + '</b></div><span class="xk">' + x.w.toFixed(2) + ' kg</span><button class="pbtn" data-wdel="' + x.d + '" aria-label="Delete the ' + dshort(x.d) + ' weight">' + ICON_X + "</button></div>";
    }).join("") : '<div class="sw"><div class="b">Nothing logged. First thing, after the toilet, before food or water.</div></div>';
    $("logAcc").innerHTML = accHtml("logAcc1", logOpen, "Weight log", e.length + (e.length === 1 ? " entry" : " entries"), "", rows);
  }
  $("logAcc").addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-wdel]"); if (!b) return;
    delete S.weights[b.getAttribute("data-wdel")]; save(); renderTrend(); renderNewWk();
  });
  function renderPhases() {
    var cur = currentPhase();
    $("phases").innerHTML = PHASES.map(function (p) {
      var now = p === cur;
      return '<div class="phrow' + (now ? " now" : "") + '"><div class="pb"><div class="pn">' + p.n + "<small>week " + p.w[0] + (p.w[0] === p.w[1] ? "" : "–" + p.w[1]) + '</small></div><div class="pd">' + p.d +
        '</div></div><div class="pk">' + fmt(p.kcal) + "</div></div>";
    }).join("");
  }
  function renderTrend() { renderReview(); renderMorning(); renderWeight(); renderMeas(); renderPhotos(); renderLog(); renderPhases(); }

  // ── Food: recipes first, the reference material folded away ──
  var recQ = "", recChip = "all", RECS = null;
  var CHIPS = [["all", "All"], ["pasta", "Pasta"], ["rice", "Rice"], ["potato", "Potato"], ["eggs", "Eggs & yogurt"], ["sauce", "Sauces"]];
  function ol(steps) { return "<ol>" + steps.map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ol>"; }
  function names(cat, ids) {
    var seen = {}, out = [];
    ids.forEach(function (id) { var n = food(cat, id)[1].split(",")[0]; if (!seen[n]) { seen[n] = 1; out.push(n); } });
    return out.slice(0, 4).join(", ");
  }
  function recList() {
    if (RECS) return RECS;
    var out = [];
    RECIPES.forEach(function (r) {
      var nm = r.n.toLowerCase(), tags = [];
      if (/sauce/.test(nm)) tags.push("sauce");
      if (/pasta/.test(nm)) tags.push("pasta");
      if (/rice/.test(nm)) tags.push("rice");
      if (/potato/.test(nm)) tags.push("potato");
      if (/egg/.test(nm)) tags.push("eggs");
      out.push({ n: r.n, sub: r.s, t: 0, tags: tags,
        body: '<div class="acc-in"><p>' + r.why + "</p><h4>You need</h4><ul>" + r.ing.map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ul><h4>Method</h4>" + ol(r.steps) + "</div>",
        find: (r.n + " " + r.s + " " + r.why + " " + r.ing.join(" ") + " " + tags.join(" ")).toLowerCase() });
    });
    LIB.forEach(function (r) {
      var tags = [];
      if (r.c.indexOf("pas") >= 0) tags.push("pasta");
      if (r.c.indexOf("ric") >= 0) tags.push("rice");
      if (r.c.indexOf("pot") >= 0 || r.c.indexOf("swt") >= 0) tags.push("potato");
      if (["egg", "ewh", "yog", "cot", "whe"].some(function (id) { return r.p.indexOf(id) >= 0; })) tags.push("eggs");
      var fits = [names("protein", r.p), names("carb", r.c)].filter(Boolean).join(" · ");
      out.push({ n: r.n, sub: r.k, t: r.t, tags: tags,
        body: '<div class="acc-in"><p>' + r.k + "</p>" + (fits ? '<p class="rfit">Works with ' + fits + "</p>" : "") + ol(r.s) + "</div>",
        find: (r.n + " " + r.k + " " + fits + " " + r.s.join(" ") + " " + tags.join(" ")).toLowerCase() });
    });
    FIN.forEach(function (r) {
      out.push({ n: r.n, sub: r.k, t: r.t, tags: ["sauce"], body: '<div class="acc-in"><p>' + r.k + "</p>" + ol(r.s) + "</div>", find: (r.n + " " + r.k + " sauce " + r.s.join(" ")).toLowerCase() });
    });
    RECS = out;
    return out;
  }
  function renderRecipes() {
    var toks = recQ.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    var list = recList().filter(function (r) {
      if (recChip !== "all" && r.tags.indexOf(recChip) < 0) return false;
      return toks.every(function (t) { return r.find.indexOf(t) >= 0; });
    });
    $("recCount").textContent = list.length + (list.length === 1 ? " recipe" : " recipes");
    $("recChips").innerHTML = CHIPS.map(function (c) { return '<button class="chip' + (c[0] === recChip ? " on" : "") + '" data-chip="' + c[0] + '" aria-pressed="' + (c[0] === recChip) + '">' + c[1] + "</button>"; }).join("");
    $("recipes").innerHTML = list.length
      ? list.map(function (r, i) { return accHtml("rc" + i, false, r.n, r.sub, r.t ? r.t + " min" : "", r.body); }).join("")
      : '<div class="sw"><div class="b">No recipe matches that. Try a shorter word, or All.</div></div>';
  }
  $("recQ").addEventListener("input", function (ev) { recQ = ev.target.value; renderRecipes(); });
  $("recChips").addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-chip]"); if (!b) return;
    recChip = b.getAttribute("data-chip"); renderRecipes();
  });
  function renderFood() {
    renderRecipes();
    var cls = { a: "a", b: "b", c: "" };
    $("proteins").innerHTML = PROTEINS.map(function (gr) {
      return '<div class="pgrp"><div class="pgt ' + cls[gr.cls] + '">' + gr.g + '</div><div class="pgn">' + gr.note + "</div>" +
        '<div class="ph"><span></span><span>Protein</span><span>Fat</span><span>kcal</span></div>' +
        gr.items.map(function (it) {
          return '<div class="prow' + (it[4] === "the baseline" ? " base" : "") + '"><span class="n"><b>' + it[0] + "</b>" + (it[4] ? "<i>" + it[4] + "</i>" : "") + "</span>" +
            '<span class="f p">' + it[2] + '</span><span class="f">' + it[3] + '</span><span class="f">' + it[1] + "</span></div>";
        }).join("") + "</div>";
    }).join("");
    $("swaps").innerHTML = SWAPS.map(function (s2) { return '<div class="sw"><div class="a">' + s2[0] + '</div><div class="b">' + s2[1] + "</div></div>"; }).join("");
    $("swapAcc").innerHTML = accHtml("sw1", false, "Swaps and the food rule", "Protein swaps, the rule, everything else", "", '<div class="acc-in" id="swapIn" style="padding-top:0"></div>');
    var h = document.querySelector(".swapholder");
    while (h.firstChild) $("swapIn").appendChild(h.firstChild);
  }

  // ── Train ──
  function sessionFor(name) { for (var i = 0; i < SESSIONS.length; i++) if (SESSIONS[i].d === name) return SESSIONS[i]; return null; }
  function exHtml(s2) { return s2.ex.map(function (x) { return '<div class="ex' + (x[2] ? " pri" : "") + '"><span class="n">' + x[0] + '</span><span class="sr">' + x[1] + "</span></div>"; }).join(""); }
  function trainedToday() { var t = S.ticks[TODAY + "-d"]; return !!(t && t.train); }
  // Training is a rotation that started on Push on the first day of the cut, not fixed weekdays.
  function cycleIdx(isoDate) { var d = dayDiff(START, isoDate); return ((d % 7) + 7) % 7; }
  function rideCount() {
    var n = 0;
    for (var i = 0; i < 7; i++) { var t = S.ticks[shift(TODAY, -i) + "-d"]; if (t && t.bike) n++; }
    return n;
  }
  function renderBike() {
    var t = S.ticks[TODAY + "-d"], on = !!(t && t.bike), n = rideCount();
    $("trBike").innerHTML = '<button class="trow' + (on ? " on" : "") + '" id="bikeBtn" aria-pressed="' + on + '"><span class="chk2"></span><span class="tb"><b>3 km bike ride</b><i>' +
      (n ? n + (n === 1 ? " ride" : " rides") + " in the last 7 days · " + (n * 3) + " km" : "Tick it on the days you ride") + "</i></span></button>";
  }
  function renderTrain() {
    var plan = WEEKPLAN[cycleIdx(TODAY)], ph = currentPhase(), s2 = sessionFor(plan[1]);
    $("trDate").textContent = new Date().toLocaleDateString(undefined, { weekday: "long" });
    $("trPhase").innerHTML = "<b>Week " + weekNumber() + ", " + ph.n + ".</b> " + ph.d;
    var done = trainedToday();
    $("trToday").innerHTML =
      '<div class="mhead"><h3>' + plan[1] + '</h3><span class="tm">Today</span></div>' +
      (plan[2] ? '<div class="tsub">' + plan[2] + "</div>" : "") +
      (s2 ? '<div class="exs">' + exHtml(s2) + "</div>" : '<p class="lede" style="margin:8px 0 14px">' + (plan[1] === "Rest" ? "Rest is part of the plan." : "No gym today.") + "</p>") +
      '<button class="bigbtn' + (done ? " on" : "") + '" id="trDone">' + (done ? (s2 ? "Trained · tap to undo" : "Done · tap to undo") : (s2 ? "Mark as trained" : (plan[1] === "Rest" ? "Mark rest done" : "Mark as done"))) + "</button>";
    renderBike();
    var rows = "";
    for (var k = 0; k < 7; k++) {
      var date = shift(TODAY, k), d = WEEKPLAN[cycleIdx(date)], ss = sessionFor(d[1]), today = k === 0;
      var tag = parseISO(date).toLocaleDateString(undefined, { weekday: "short" });
      if (!ss) rows += '<div class="acc wrow' + (today ? " today" : "") + '"><div class="acc-h" style="cursor:default"><span class="daytag">' + tag + '</span><span class="ab"><span class="an">' + d[1] + "</span>" + (d[2] ? '<span class="as">' + d[2] + "</span>" : "") + "</span></div></div>";
      else rows += '<div class="acc wrow' + (today ? " today" : "") + '"><button class="acc-h" data-acc aria-expanded="false"><span class="daytag">' + tag + '</span><span class="ab"><span class="an">' + d[1] + '</span><span class="as">' + d[2] + '</span></span><i class="chev"></i></button><div class="acc-b"><div>' + exHtml(ss) + "</div></div></div>";
    }
    $("weekPlan").innerHTML = rows;
    $("backAcc").innerHTML = accHtml("back1", false, "How to ease back in", "Why weeks 1–2 are light", "",
      '<div class="acc-in"><p>Weeks 1–2 at 3–4 reps in reserve, starting near 60% of your old loads. Strength returns in weeks; tendons take longer, and that gap is how people get hurt in week two. Don’t chase soreness. The upside: regaining lost muscle is far faster than building new, so you can drop fat and regain size at once.</p>' +
      "<p><b style=\"color:var(--fg);font-weight:600\">No loaded side bends or weighted obliques.</b> A thicker waist fights the V.</p></div>");
  }
  $("trBike").addEventListener("click", function (ev) {
    if (!ev.target.closest("#bikeBtn")) return;
    var key = TODAY + "-d";
    if (!S.ticks[key]) S.ticks[key] = {};
    if (S.ticks[key].bike) delete S.ticks[key].bike; else S.ticks[key].bike = true;
    save(); renderBike(); renderMore();
  });
  $("trToday").addEventListener("click", function (ev) {
    if (!ev.target.closest("#trDone")) return;
    var key = TODAY + "-d";
    if (!S.ticks[key]) S.ticks[key] = {};
    if (S.ticks[key].train) delete S.ticks[key].train; else S.ticks[key].train = true;
    save(); renderTrain(); renderMore();
  });

  // accordions (recipes, sessions, history)
  $("main").addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-acc]"); if (!b) return;
    var box = b.parentElement, open = !box.classList.contains("open");
    box.classList.toggle("open", open); b.setAttribute("aria-expanded", String(open));
    if (box.id === "logAcc1") logOpen = open;
  });

  // ── tabs ──
  var VIEWS = ["today", "train", "food", "trend"];
  var tabs = [].slice.call(document.querySelectorAll("nav button"));
  function showTab(tab, fromHash) {
    var i = VIEWS.indexOf(tab); if (i < 0) { tab = "today"; i = 0; }
    tabs.forEach(function (x) { x.setAttribute("aria-current", x.getAttribute("data-tab") === tab ? "true" : "false"); });
    $("tabs").style.setProperty("--i", i);
    VIEWS.forEach(function (v) { $("v-" + v).hidden = v !== tab; });
    if (tab !== "today") $("mini").classList.remove("show");
    $("main").scrollTop = 0;
    if (tab === "trend") renderTrend();
    if (tab === "train") renderTrain();
    if (!fromHash) { try { if (location.hash !== "#" + tab) location.hash = tab; } catch (e) {} }
  }
  tabs.forEach(function (b) { b.addEventListener("click", function () { showTab(b.getAttribute("data-tab")); }); });
  window.addEventListener("hashchange", function () {
    var t = (location.hash || "").replace("#", "");
    if (VIEWS.indexOf(t) >= 0) showTab(t, true);
  });
  window.addEventListener("resize", function () { if (!$("v-trend").hidden) drawChart(); });
