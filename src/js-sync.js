
  // ── Cloud backup (phone app only): the log is copied to a private GitHub repository he owns ──
  // One file, telos.json, in HaxenbaneYC/telos-data. Every save is pushed a few seconds later (each push is a
  // commit, so git history holds every earlier version). On open the copy online is read: if it is newer than
  // this phone's (another phone, or the icon was deleted and added again) it is taken. The key is a GitHub
  // fine-grained token for that one repository, kept on this phone under telos_sync (never in the log).
  // Inside Claude and in the preview there is no backup.
  var SYNC = { tok: "telos_sync", at: "telos_sync_at", repo: "https://api.github.com/repos/HaxenbaneYC/telos-data" };
  var SY = { sha: null, ready: false, busy: false, again: false, timer: 0, ok: 0, err: "", setup: false };
  function syncAllowed() { return !PREVIEW && !(window.claude && window.claude.use); }
  function syncTok() { try { return localStorage.getItem(SYNC.tok) || ""; } catch (e) { return ""; } }
  function syncOn() { return syncAllowed() && !!syncTok(); }
  function localAt() { try { return +localStorage.getItem(SYNC.at) || 0; } catch (e) { return 0; } }
  function setLocalAt(t) { try { localStorage.setItem(SYNC.at, String(t)); } catch (e) {} }
  function b64enc(s) { return btoa(unescape(encodeURIComponent(s))); }
  function b64dec(s) { return decodeURIComponent(escape(atob(String(s).replace(/\s/g, "")))); }
  function hasData(x) {
    var k; for (k in x) if (Object.prototype.hasOwnProperty.call(x, k)) {
      var v = x[k]; if (Array.isArray(v) ? v.length : (isObj(v) && Object.keys(v).length)) return true;
    }
    return false;
  }
  function gh(method, body, raw, url) {
    var h = { "Authorization": "Bearer " + syncTok(), "Accept": raw ? "application/vnd.github.raw+json" : "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
    if (body) h["Content-Type"] = "application/json";
    return fetch(url || SYNC.repo + "/contents/telos.json", { method: method, headers: h, body: body ? JSON.stringify(body) : undefined, cache: "no-store" });
  }
  function ghErr(st) {
    return st === 401 ? "GitHub refused the key. Make a new one and paste it again."
         : st === 403 || st === 404 ? "The key can’t open telos-data. Check the repository name and that the key has Contents: Read and write."
         : "GitHub said no (" + st + "). It will try again.";
  }
  // Reads the copy online: { at, state } or null when there is none yet. Remembers its sha for the next push.
  function pull() {
    return gh("GET").then(function (r) {
      if (r.status === 404) {   // no file yet is fine (first backup); no repository, or no access to it, is not
        SY.sha = null;
        return gh("GET", null, false, SYNC.repo).then(function (r2) { if (!r2.ok) throw { st: r2.status }; return null; });
      }
      if (!r.ok) throw { st: r.status };
      return r.json().then(function (j) {
        SY.sha = j.sha || null;
        var text = j.content && j.encoding === "base64" ? Promise.resolve(b64dec(j.content)) : gh("GET", null, true).then(function (r2) { if (!r2.ok) throw { st: r2.status }; return r2.text(); });
        return text.then(function (t) {
          var o = JSON.parse(t);
          return isObj(o) && isObj(o.state) ? { at: fin(o.at) || 0, state: o.state } : null;
        });
      });
    });
  }
  function push() {
    var at = localAt() || Date.now();
    var body = { message: "Telos backup " + iso(new Date()), content: b64enc(JSON.stringify({ app: "telos", key: KEY, at: at, state: S })) };
    if (SY.sha) body.sha = SY.sha;
    return gh("PUT", body).then(function (r) {
      if (r.status === 409 || r.status === 422) {   // the file changed online since we read it: read again, then decide
        return pull().then(function (rem) { return decide(rem); });
      }
      if (!r.ok) throw { st: r.status };
      return r.json().then(function (j) { SY.sha = j.content && j.content.sha || null; SY.ok = Date.now(); SY.err = ""; });
    });
  }
  function adopt(rem) {
    try { localStorage.setItem(KEY, JSON.stringify(rem.state)); } catch (e) { return; }
    setLocalAt(rem.at);
    adoptState();
    SY.ok = Date.now(); SY.err = "";
  }
  // Newer wins. A phone with nothing logged always takes the copy online, and so does a phone that is being
  // set up again (a new install where something was logged before the key went in).
  function decide(rem) {
    if (!rem) return push();
    var mine = localAt(), setup = SY.setup; SY.setup = false;
    if (!hasData(S) || rem.at > mine || (setup && hasData(rem.state))) { adopt(rem); return; }
    if (mine > rem.at) return push();
    SY.ok = Date.now(); SY.err = "";
  }
  function syncNow() {
    if (!syncOn()) return Promise.resolve();
    if (SY.busy) { SY.again = true; return Promise.resolve(); }
    SY.busy = true; SY.wait = false; clearTimeout(SY.timer);
    var job = pull().then(function (rem) { SY.ready = true; return decide(rem); });   // always read first: newer wins
    return job.then(null, function (e) {
      SY.err = e && e.st ? ghErr(e.st) : "No signal. It will back up when there is.";
    }).then(function () {
      SY.busy = false; syncPaint();
      if (SY.again) { SY.again = false; syncSoon(1500); }
    });
  }
  function syncSoon(ms) { if (!syncOn()) return; clearTimeout(SY.timer); SY.wait = true; SY.timer = setTimeout(syncNow, ms == null ? 4000 : ms); }
  // save() calls this: stamp the change, push it shortly
  // (always later than the copy last taken, so a phone whose clock runs ahead cannot win over a newer change)
  function syncSaved() { if (!syncAllowed()) return; setLocalAt(Math.max(Date.now(), localAt() + 1)); if (SY.ready || SY.err) syncSoon(); }

  function syncStatus() {
    if (!syncOn()) return { v: "Off", cls: "" };
    if (SY.err) return { v: "Not backed up", cls: "warn" };
    if (SY.busy || !SY.ready) return { v: "Checking…", cls: "" };
    if (SY.ok) return { v: "Backed up " + new Date(SY.ok).toTimeString().slice(0, 5), cls: "on" };
    return { v: "On", cls: "on" };
  }
  function syncPaint() { if (typeof renderMore === "function") renderMore(); if (sh && sh.view === "sync") paintSheet(); }
  function viewSync() {
    var on = syncOn(), st = syncStatus();
    if (!on) {
      return phead("Cloud backup", "Your log, copied to your GitHub", false) + '<div class="pbody"><div class="keycard">' +
        "<p>Every change is saved to a private repository on your GitHub, and comes back on its own if this phone loses it (icon deleted, new phone). One-time setup, about three minutes:</p>" +
        '<ol class="steps"><li><a href="https://github.com/new" target="_blank" rel="noopener">Make a new repository</a> named <b>telos-data</b>. Set it to <b>Private</b>.</li>' +
        '<li><a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">Make a token</a>. Name it Telos, pick the longest expiry, choose <b>Only select repositories: telos-data</b>, and under Permissions add <b>Contents: Read and write</b>. Generate it and copy it.</li>' +
        "<li>Paste it here.</li></ol>" +
        '<label class="flabel" for="syncIn">GitHub token</label>' +
        '<input id="syncIn" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="github_pat_…">' +
        (sh.err ? '<p class="ferr">' + esc(sh.err) + "</p>" : "") +
        '<button class="bigbtn" id="syncSave"' + (sh.busy ? " disabled" : "") + ">" + (sh.busy ? "Checking…" : "Turn on backup") + "</button>" +
        '<p class="aihint">The token stays on this phone and is sent only to GitHub. It can open telos-data and nothing else.</p></div></div>';
    }
    return phead("Cloud backup", st.v, false) + '<div class="pbody"><div class="keycard">' +
      "<p>" + (SY.err ? esc(SY.err) : "On. Every change is copied to telos-data on your GitHub a few seconds later. If this phone loses the log, it comes back the next time you open the app with signal.") + "</p>" +
      '<button class="bigbtn" id="syncGo"' + (SY.busy ? " disabled" : "") + ">" + (SY.busy ? "Backing up…" : "Back up now") + "</button>" +
      '<button class="linkbtn" id="syncOff">Turn off backup on this phone</button>' +
      '<p class="aihint">Turning it off removes the token from this phone. The copy on GitHub stays.</p></div></div>';
  }
  function syncSetup(tok) {
    tok = (tok || "").trim();
    if (!/^(github_pat_|ghp_)[A-Za-z0-9_]{20,}$/.test(tok)) { sh.err = "That doesn’t look like a GitHub token. It starts with github_pat_."; paintSheet(); return; }
    try { localStorage.setItem(SYNC.tok, tok); } catch (e) { sh.err = "Couldn’t save it on this phone."; paintSheet(); return; }
    sh.err = ""; sh.busy = true; paintSheet();
    SY.ready = false; SY.err = ""; SY.sha = null; SY.setup = true;
    syncNow().then(function () {
      if (!sh || sh.view !== "sync") return;
      sh.busy = false;
      if (SY.err) { try { localStorage.removeItem(SYNC.tok); } catch (e) {} sh.err = SY.err; SY.err = ""; }
      paintSheet(); renderMore();
    });
  }
  function syncOff() {
    try { localStorage.removeItem(SYNC.tok); } catch (e) {}
    clearTimeout(SY.timer); SY.ready = false; SY.ok = 0; SY.err = ""; SY.sha = null;
    syncPaint();
  }
  $("panel").addEventListener("click", function (ev) {
    if (!sh || sh.view !== "sync") return;
    var t = ev.target.closest("#syncSave,#syncGo,#syncOff");
    if (!t) return;
    if (t.id === "syncSave") syncSetup(($("syncIn") || {}).value);
    else if (t.id === "syncGo") { SY.again = false; syncNow(); syncPaint(); }
    else syncOff();
  });
  function initSync() {
    if (!syncAllowed()) return;
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
    syncNow();
    window.addEventListener("online", function () { syncNow(); });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { if (SY.wait) syncNow(); }   // leaving the app: push what is waiting
      else syncNow();                                     // back in: read what is online
    });
  }
