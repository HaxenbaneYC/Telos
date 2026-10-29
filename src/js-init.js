
  if (PREVIEW) { seed(); seed2(); }
  else [].forEach.call(document.querySelectorAll(".previewtag"), function (e) { e.hidden = true; });
  measureChrome();
  renderTop(); refresh(); renderFood(); renderTrain(); renderNewWk();
  initAI();
  var h0 = (location.hash || "").replace("#", "");
  if (VIEWS.indexOf(h0) > 0) showTab(h0, true);

  // Another tab or window saved: take its state instead of overwriting it with ours on the next save.
  window.addEventListener("storage", function (ev) {
    if (ev.key !== null && ev.key !== KEY) return;
    var n = normalizeState(load()), k;
    for (k in S) if (Object.prototype.hasOwnProperty.call(S, k)) delete S[k];
    for (k in n) if (Object.prototype.hasOwnProperty.call(n, k)) S[k] = n[k];
    if (sh) closeSheet();
    renderTop(); refresh(); renderFood(); renderTrain(); renderTrend(); renderNewWk();
  });

  // The phone keeps the page alive overnight. Past midnight "today" is a new day, so start it fresh.
  function rolled() { return iso(new Date()) !== TODAY; }
  document.addEventListener("visibilitychange", function () { if (!document.hidden && rolled()) location.reload(); });
  window.addEventListener("pageshow", function () { if (rolled()) location.reload(); });
  setInterval(function () { if (!document.hidden && rolled()) location.reload(); }, 60000);
  window.__telosReady = true; if (window.__telosHideFail) window.__telosHideFail();
})();
</script>
