
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

  // The weigh-in and sleep go to the day shown here (today, or any earlier day back to the start), so a missed morning can be filled in.
  var WDAY = TODAY;
  function renderMorning() {
    var w = S.weights[WDAY], h = S.sleep[WDAY], done = (w != null || h != null), now = WDAY === TODAY;
    $("wIn").value = w != null ? w.toFixed(2) : "";
    $("sIn").value = h != null ? String(h) : "";
    $("mLog").textContent = done ? "Update" : "Log";
    $("mTitle").textContent = now ? "This morning" : "That morning";
    $("mDate").textContent = now ? "Today" : (WDAY === shift(TODAY, -1) ? "Yesterday" : dayName(WDAY));
    $("mPrev").disabled = dayDiff(START, WDAY) <= 0;
    $("mNext").disabled = WDAY >= TODAY;
    $("mNote").textContent = done ? (now ? "Logged today." : "Logged for that day.") : (now ? "First thing, after the toilet, before food or water. Sleep goes here because it belongs to last night." : "Weight that morning, and the sleep before it.");
    $("mErr").hidden = true;
  }
  $("mPrev").addEventListener("click", function () { WDAY = shift(WDAY, -1); renderMorning(); });
  $("mNext").addEventListener("click", function () { WDAY = shift(WDAY, 1); renderMorning(); });
  $("mLog").addEventListener("click", function () {
    var day = WDAY, wv = $("wIn").value.trim(), sv = $("sIn").value.trim(), er = $("mErr"), w = parseFloat(wv), h = parseFloat(sv);
    var pw = S.weights[day], ps = S.sleep[day];
    function bad(msg) { er.textContent = msg; er.hidden = false; }
    if (wv === "" && sv === "") { bad("Enter your weight, your sleep, or both."); return; }
    if (wv !== "" && (!isFinite(w) || w < 30 || w > 250)) { bad("That weight doesn’t look right. Use kilograms, like 75.2."); return; }
    if (sv !== "" && (!isFinite(h) || h < 0 || h > 16)) { bad("That sleep doesn’t look right. Use hours, like 6.5."); return; }
    er.hidden = true;
    var bits = [];
    if (wv !== "") { S.weights[day] = Math.round(w * 100) / 100; bits.push(S.weights[day].toFixed(2) + " kg"); }
    if (sv !== "") { S.sleep[day] = Math.round(h * 4) / 4; bits.push(S.sleep[day] + " h"); }
    save(); renderTrend(); renderNewWk();
    toast("Logged " + (day === TODAY ? "" : (day === shift(TODAY, -1) ? "yesterday " : dayName(day) + " ")) + "· " + bits.join(" · "), function () {
      if (pw == null) delete S.weights[day]; else S.weights[day] = pw;
      if (ps == null) delete S.sleep[day]; else S.sleep[day] = ps;
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
    if ((isFinite(w) && (w < 30 || w > 250)) || (isFinite(s2) && (s2 < 30 || s2 > 250))) { toast("Measurements are in centimetres, between 30 and 250."); return; }
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
      syncSaved();
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

  // ── Food: the week's dinners, then the shopping list ──
  function renderMenu() {
    var html = "";
    for (var k = 0; k < 7; k++) {
      var d = shift(TODAY, k), dish = dishOn(d);
      var tag = k === 0 ? "Tonight" : k === 1 ? "Tomorrow" : parseISO(d).toLocaleDateString(undefined, { weekday: "long" });
      html += accHtml("menu" + k, false, dish.n, tag + " · " + dish.t + " min", "",
        '<div class="acc-in"><p><b style="color:var(--fg);font-weight:600">Cook for two</b> (weights before cooking): ' + cookList(cookParts(d)) + ".</p><ol>" +
        dish.s.map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ol></div>");
    }
    $("menuList").innerHTML = html;
  }
  // Everything the next seven days need: breakfasts, snacks and bananas, and every dinner pan (which also
  // fills the next day's lunch box). Weights before cooking, rounded up to what you can buy.
  var SHOP_GROUPS = [["meat", "Meat"], ["dairy", "Dairy and eggs"], ["carb", "Rice, pasta, potatoes, bread"], ["veg", "Veg and fruit"], ["other", "Other"]];
  function renderShop() {
    var list = {}, order = [];
    function add(name, grp, amt, unit) {
      var x = list[name];
      if (!x) { x = list[name] = { name: name, grp: grp, amt: 0, unit: unit }; order.push(x); }
      x.amt += amt;
    }
    function part(pt) {
      if (pt.skip || (!pt.noun && !pt.g) || /olive oil/i.test(pt.name)) return;
      if (pt.mix) { pt.mix.forEach(function (m) { add(m[0], "veg", pt.g * m[1], "g"); }); return; }
      if (pt.name === "Milk") { add("Semi-skimmed milk", "dairy", pt.g, "ml"); return; }
      if (pt.noun) {   // counted things: eggs, slices, bananas, wraps
        var egg = /egg/.test(pt.noun), ban = /banana/.test(pt.noun), slice = /slice/.test(pt.noun);
        add(egg ? "Eggs" : ban ? "Bananas" : slice ? pt.name : "Wraps", egg ? "dairy" : ban ? "veg" : "carb", pt.n, slice ? "slices" : ""); return;
      }
      var g = /yogurt/i.test(pt.name) ? "dairy" : /peanut/i.test(pt.name) ? "other" : pt.cat === "protein" ? "meat" : pt.cat === "carb" ? "carb" : "other";
      add(pt.name, g, pt.g, "g");
    }
    for (var k = 0; k < 7; k++) {
      var d = shift(TODAY, k), pl = planOn(d).out;
      ["m1", "m3", "m4"].forEach(function (id) { pl[id].parts.forEach(part); });
      cookParts(d).forEach(part);
    }
    function amount(x) {
      if (x.unit === "ml") return (Math.ceil(x.amt / 500) / 2).toFixed(1).replace(/\.0$/, "") + " L";
      if (x.unit !== "g") return x.amt + (x.unit ? " " + x.unit : "");
      if (/tinned/i.test(x.name)) { var c = Math.ceil(x.amt / 400); return c + (c === 1 ? " can" : " cans") + " (400 g)"; }
      var r = Math.ceil(x.amt / 50) * 50;
      return r >= 1000 ? +(r / 1000).toFixed(2) + " kg" : r + " g";
    }
    var html = "";
    SHOP_GROUPS.forEach(function (gr) {
      var rows = order.filter(function (x) { return x.grp === gr[0]; });
      if (!rows.length) return;
      html += '<div class="shopgrp">' + gr[1] + "</div>" + rows.map(function (x) {
        return '<button class="trow" data-shop aria-pressed="false"><span class="chk2"></span><span class="tb"><b>' + esc(x.name.split(",")[0]) + "</b><i>" + amount(x) + "</i></span></button>";
      }).join("");
    });
    $("shopList").innerHTML = html;
  }
  // ticking off in the shop is only for the trip: nothing is saved
  $("shopList").addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-shop]"); if (!b) return;
    var on = !b.classList.contains("on"); b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on));
  });
  function renderFood() { renderMenu(); renderShop(); }

  // ── Train ──
  function sessionFor(name) { for (var i = 0; i < SESSIONS.length; i++) if (SESSIONS[i].d === name) return SESSIONS[i]; return null; }
  function exHtml(s2, d) { return s2.ex.map(function (x) { return '<div class="ex' + (x[2] ? " pri" : "") + '"><span class="n">' + x[0] + '</span><span class="sr">' + (x[1] === "BIKE" ? "45–60 min · steady" : x[1] === "WALK" ? walkMin(d || TODAY) + " min · 12% · 5.0 km/h" : setsFor(x, d || TODAY) + '<small class="rpe">RPE ' + rpeFor(x, d || TODAY) + "</small>") + "</span></div>"; }).join(""); }
  // Training is a rotation that started on Push on the first day of the cut, not fixed weekdays.
  function rideCount() {
    var n = 0;
    for (var i = 0; i < 7; i++) { var t = S.ticks[shift(TODAY, -i) + "-d"]; if (t && t.bike) n++; }
    return n;
  }
  function renderBike() {
    var t = S.ticks[TDAY + "-d"], on = !!(t && t.bike), n = rideCount();
    $("trBike").innerHTML = '<button class="trow' + (on ? " on" : "") + '" id="bikeBtn" aria-pressed="' + on + '"><span class="chk2"></span><span class="tb"><b>3 km bike ride</b><i>' +
      (n ? n + (n === 1 ? " ride" : " rides") + " in the last 7 days · " + (n * 3) + " km" : "Tick it on the days you ride") + "</i></span></button>";
  }
  // Other activity: a run, ride, scooter or walk on top of the gym and the daily 3 km. It is logged for the day picked on Train (TDAY) and counted in km, not in calories.
  var ACTS = [["run", "Run"], ["bike", "Bike"], ["scooter", "Scooter"], ["walk", "Walk"]], actType = "run";
  function actName(t) { for (var i = 0; i < ACTS.length; i++) if (ACTS[i][0] === t) return ACTS[i][1]; return "Activity"; }
  function actText(a) { return (a.km ? +a.km.toFixed(1) + " km" : "") + (a.km && a.min ? " · " : "") + (a.min ? a.min + " min" : ""); }
  function renderAct() {
    $("actType").innerHTML = ACTS.map(function (a) { return '<button class="chip' + (a[0] === actType ? " on" : "") + '" data-at="' + a[0] + '" aria-pressed="' + (a[0] === actType) + '">' + a[1] + "</button>"; }).join("");
    var list = S.acts[TDAY] || [], n = 0, km = 0, i, d, l;
    $("actList").hidden = !list.length;
    $("actList").innerHTML = list.map(function (a, j) {
      return '<div class="xrow"><div class="xb"><b>' + actName(a.t) + "</b><span>" + actText(a) + '</span></div><button class="pbtn" data-ad="' + j + '" aria-label="Remove ' + actName(a.t) + '">' + ICON_X + "</button></div>";
    }).join("");
    for (i = 0; i < 7; i++) { l = S.acts[shift(TODAY, -i)] || []; for (d = 0; d < l.length; d++) { n++; km += l[d].km; } }
    $("actNote").textContent = n ? "Last 7 days: " + n + (n === 1 ? " activity" : " activities") + (km ? " · " + +km.toFixed(1) + " km" : "") + ". Counted in distance, not calories." : "Anything on top of the gym and the daily ride. Counted in distance, not calories.";
  }
  $("actType").addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-at]"); if (!b) return;
    actType = b.getAttribute("data-at"); renderAct();
  });
  $("aAdd").addEventListener("click", function () {
    var km = parseFloat($("aKm").value), mn = parseFloat($("aMin").value), er = $("aErr");
    km = isFinite(km) ? km : 0; mn = isFinite(mn) ? mn : 0;
    if (km <= 0 && mn <= 0) { er.textContent = "Enter a distance, a time, or both."; er.hidden = false; return; }
    if (km > 500 || mn > 1440) { er.textContent = "That looks too big. Use kilometres and minutes."; er.hidden = false; return; }
    er.hidden = true;
    var day = TDAY;
    if (!S.acts[day]) S.acts[day] = [];
    var a = { t: actType, km: Math.round(km * 10) / 10, min: Math.round(mn) };
    S.acts[day].push(a);
    $("aKm").value = ""; $("aMin").value = "";
    save(); renderAct();
    toast(actName(a.t) + " added" + dayWord(day) + " · " + actText(a), function () {
      var l = S.acts[day] || [], i = l.indexOf(a); if (i >= 0) l.splice(i, 1);
      if (!l.length) delete S.acts[day];
      save(); renderAct();
    });
  });
  $("actList").addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-ad]"); if (!b) return;
    var day = TDAY, l = S.acts[day] || [], i = +b.getAttribute("data-ad"), a = l.splice(i, 1)[0];
    if (!a) return;
    if (!l.length) delete S.acts[day];
    save(); renderAct();
    toast(actName(a.t) + " removed", function () {
      if (!S.acts[day]) S.acts[day] = [];
      S.acts[day].splice(Math.min(i, S.acts[day].length), 0, a); save(); renderAct();
    });
  });
  // The rotation follows what was done, not the calendar. Skip a day and the same session waits. Do a different
  // one (Upper on a Legs day) and Legs is still owed next; Upper is then skipped when the round reaches it.
  var SHORTS = { "Bike ride": "Bike", "Delts, arms, abs, neck": "Delts" };
  function step(st, v) {
    if (v !== st.owed) { st.ahead[v] = true; return st; }
    st.owed = (st.owed + 1) % 7;
    while (st.ahead[st.owed]) { delete st.ahead[st.owed]; st.owed = (st.owed + 1) % 7; }
    return st;
  }
  function loggedOn(d, owed) {
    if (S.sess[d] != null) return S.sess[d];
    var t = S.ticks[d + "-d"];
    return t && t.train ? owed : null;   // ticked without naming one (the Today checklist): the one that was owed
  }
  // where the rotation stands at the start of a day
  function rotState(day) {
    var st = { owed: 0, ahead: {} };
    for (var d = START; dayDiff(d, day) > 0; d = shift(d, 1)) { var v = loggedOn(d, st.owed); if (v != null) step(st, v); }
    return st;
  }
  var trSel = null;   // the session shown on the card: that day's logged one, the one owed, or one picked from the chips
  // The top of Train (session, bike, other activity) can be any day back to the start, so a forgotten log can be filled in.
  var TDAY = TODAY;
  function dayWord(d) { return d === TODAY ? "" : d === shift(TODAY, -1) ? " for yesterday" : " for " + dayName(d); }
  function renderTrain() {
    var st = rotState(TDAY), logged = loggedOn(TDAY, st.owed), base = logged != null ? logged : st.owed, ph = currentPhase(), now = TDAY === TODAY;
    if (trSel == null) trSel = base;
    var plan = WEEKPLAN[trSel], s2 = sessionFor(plan[1]), done = logged === trSel;
    $("trDate").textContent = now ? "Today" : TDAY === shift(TODAY, -1) ? "Yesterday" : dayName(TDAY);
    $("tPrev").disabled = dayDiff(START, TDAY) <= 0;
    $("tNext").disabled = TDAY >= TODAY;
    $("trPhase").innerHTML = "<b>Week " + weekNumber() + ", " + ph.n + ".</b> " + ph.d;
    var chips = WEEKPLAN.map(function (w, i) {
      return '<button class="chip' + (i === trSel ? " on" : "") + '" data-ses="' + i + '" aria-pressed="' + (i === trSel) + '">' + (SHORTS[w[1]] || w[1]) + (i === logged ? " ✓" : "") + "</button>";
    }).join("");
    var label = done ? (s2 ? "Trained · tap to undo" : "Done · tap to undo")
      : logged != null ? "Log " + (SHORTS[plan[1]] || plan[1]) + " instead"
      : (s2 ? "Mark as trained" : (plan[1] === "Rest" ? "Mark rest done" : "Mark as done"));
    $("trToday").innerHTML =
      '<div class="mhead"><h3>' + plan[1] + '</h3><span class="tm">' + (trSel === base ? (logged != null ? (now ? "Today" : "Done") : (now ? "Up next" : "Owed that day")) : "Instead") + "</span></div>" +
      (plan[2] ? '<div class="tsub">' + plan[2] + "</div>" : "") +
      '<div class="chips" style="flex-wrap:wrap;overflow:visible;margin:12px 0 4px">' + chips + "</div>" +
      (s2 ? '<div class="exs">' + exHtml(s2, TDAY) + "</div>" : '<p class="lede" style="margin:8px 0 14px">Rest is part of the plan.</p>') +
      '<button class="bigbtn' + (done ? " on" : "") + '" id="trDone">' + label + "</button>";
    renderBike(); renderAct();
    var t0 = rotState(TODAY), l0 = loggedOn(TODAY, t0.owed), b0 = l0 != null ? l0 : t0.owed, rows = "", seq = [b0];
    st = t0; step(st, b0);   // from today on, as if each day does what is owed
    for (var j = 1; j < 7; j++) { seq.push(st.owed); step(st, st.owed); }
    for (var k = 0; k < 7; k++) {
      var date = shift(TODAY, k), d = WEEKPLAN[seq[k]], ss = sessionFor(d[1]), today = k === 0;
      var tag = parseISO(date).toLocaleDateString(undefined, { weekday: "short" });
      if (!ss) rows += '<div class="acc wrow' + (today ? " today" : "") + '"><div class="acc-h" style="cursor:default"><span class="daytag">' + tag + '</span><span class="ab"><span class="an">' + d[1] + "</span>" + (d[2] ? '<span class="as">' + d[2] + "</span>" : "") + "</span></div></div>";
      else rows += '<div class="acc wrow' + (today ? " today" : "") + '"><button class="acc-h" data-acc aria-expanded="false"><span class="daytag">' + tag + '</span><span class="ab"><span class="an">' + d[1] + '</span><span class="as">' + d[2] + '</span></span><i class="chev"></i></button><div class="acc-b"><div>' + exHtml(ss, date) + "</div></div></div>";
    }
    $("weekPlan").innerHTML = rows;
    $("backAcc").innerHTML = accHtml("cardio1", false, "The incline walk", walkMin(TODAY) + " minutes after Push, Pull and Upper", "",
      '<div class="acc-in"><p>Treadmill, 12% incline, 5.0 km/h, ' + walkMin(TODAY) + ' minutes. Hands off the rails. You should be able to talk in full sentences the whole way; if you can’t, drop the speed, not the incline.</p>' +
      "<p>The minutes go up with the plan: 20 now, 25 in the work, 30 in the finish, 20 over Christmas. Speed and incline stay the same.</p>" +
      "<p>The bike day, once a round: 45–60 minutes at a steady pace, outside or on a gym bike. Steady means you can still talk in short sentences. Hard enough to sweat, easy enough that the next heavy day doesn’t feel it. Log the km under Other activity too if you like.</p>" +
      "<p>About 150–250 kcal each time, burned while you walk; the after-burn from easy cardio is small. The app does not count it, so don’t eat it back. If the treadmills are all taken, the stair climber at an easy pace for the same minutes.</p></div>") +
      accHtml("rpe1", false, "RPE, how hard each set is", "Heavy: compounds 8–9, the rest 9–10", "",
        '<div class="acc-in"><p><b style="color:var(--fg);font-weight:600">RPE 10</b>: nothing left, the next rep would fail. <b style="color:var(--fg);font-weight:600">9</b>: one more rep was there. <b style="color:var(--fg);font-weight:600">8</b>: two more. Each exercise shows its number.</p>' +
        "<p>Compounds (presses, pull-ups, rows, squats) at 8–9: as heavy as you can move for the reps with clean form. Isolation, drop sets and the push-ups at 9–10, the last set to failure. Romanian deadlift, plank and neck stay at 8: form first.</p>" +
        "<p>Hit the top of the rep range at the RPE shown and the weight goes up next time. The cut stays heavy on purpose: heavy loads are what tell your body to keep the muscle while the fat comes off.</p>" +
        "<p><b style=\"color:var(--fg);font-weight:600\">Week one only:</b> everything stops at RPE 8. Muscle comes back fast after time off, tendons don’t; one week with two reps in hand is what stops a week-two injury.</p></div>");
  }
  $("trBike").addEventListener("click", function (ev) {
    if (!ev.target.closest("#bikeBtn")) return;
    var key = TDAY + "-d";
    if (!S.ticks[key]) S.ticks[key] = {};
    if (S.ticks[key].bike) delete S.ticks[key].bike; else S.ticks[key].bike = true;
    save(); renderBike(); renderMore();
  });
  $("tPrev").addEventListener("click", function () { TDAY = shift(TDAY, -1); trSel = null; renderTrain(); });
  $("tNext").addEventListener("click", function () { if (TDAY < TODAY) { TDAY = shift(TDAY, 1); trSel = null; renderTrain(); } });
  $("trToday").addEventListener("click", function (ev) {
    var c = ev.target.closest("[data-ses]");
    if (c) { trSel = +c.getAttribute("data-ses"); renderTrain(); return; }
    if (!ev.target.closest("#trDone")) return;
    var day = TDAY, key = day + "-d", was = loggedOn(day, rotState(day).owed), name = WEEKPLAN[trSel][1];
    if (!S.ticks[key]) S.ticks[key] = {};
    if (was === trSel) { delete S.sess[day]; delete S.ticks[key].train; trSel = null; }
    else { S.sess[day] = trSel; S.ticks[key].train = true; }
    save(); renderTrain(); renderMore();
    toast(was === trSel ? "Training undone" + dayWord(day) : (SHORTS[name] || name) + " logged" + (day === TODAY ? " for today" : dayWord(day)), function () {
      if (was == null) { delete S.sess[day]; delete S.ticks[key].train; } else { S.sess[day] = was; S.ticks[key].train = true; }
      trSel = null; save(); renderTrain(); renderMore();
    });
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
