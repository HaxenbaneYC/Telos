
  if (PREVIEW) { seed(); seed2(); }
  else [].forEach.call(document.querySelectorAll(".previewtag"), function (e) { e.hidden = true; });
  measureChrome();
  renderTop(); refresh(); renderFood(); renderTrain(); renderNewWk();
  initAI();
  var h0 = (location.hash || "").replace("#", "");
  if (VIEWS.indexOf(h0) > 0) showTab(h0, true);
})();
</script>
