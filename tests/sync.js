// Cloud backup to GitHub (phone app): setup, push after a change, restore after the log is lost,
// newer copy online wins, refused key, and a conflicting push. GitHub is mocked; nothing goes online.
//   node tests/sync.js [coach.html]   (needs Playwright)
const { chromium } = require('playwright'), path = require('path');
const F = 'file://' + path.resolve(process.argv[2] || path.join(__dirname, '..', 'coach.html'));
let bad = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
const TOK = 'github_pat_' + 'A'.repeat(40);
const gh = { file: null, n: 0, puts: [], status: null, conflictOnce: false, repo: true };
const enc = o => Buffer.from(JSON.stringify(o)).toString('base64');
const dec = s => JSON.parse(Buffer.from(s, 'base64').toString('utf8'));
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true });
  await ctx.route('https://api.github.com/**', async r => {
    const q = r.request(), u = q.url(), auth = q.headers()['authorization'];
    const json = (st, o) => r.fulfill({ status: st, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(o) });
    if (gh.status) return json(gh.status, { message: 'nope' });
    if (auth !== 'Bearer ' + TOK) return json(401, { message: 'Bad credentials' });
    if (!/\/repos\/HaxenbaneYC\/telos-data(\/|$)/.test(u)) return json(404, { message: 'Not Found' });
    if (!/contents\/telos\.json/.test(u)) return gh.repo ? json(200, { private: true }) : json(404, { message: 'Not Found' });
    if (q.method() === 'GET') return gh.file ? json(200, { sha: gh.file.sha, encoding: 'base64', content: gh.file.content.replace(/(.{60})/g, '$1\n') }) : json(404, { message: 'Not Found' });
    if (q.method() === 'PUT') {
      const body = JSON.parse(q.postData());
      if (gh.conflictOnce) { gh.conflictOnce = false; gh.file = { sha: 'other' + (++gh.n), content: gh.file.content }; return json(409, { message: 'sha mismatch' }); }
      if (gh.file && body.sha !== gh.file.sha) return json(409, { message: 'sha mismatch' });
      if (!gh.file && body.sha) return json(422, { message: 'sha given' });
      gh.file = { sha: 's' + (++gh.n), content: body.content }; gh.puts.push(dec(body.content));
      return json(gh.n === 1 ? 201 : 200, { content: { sha: gh.file.sha } });
    }
    return json(405, {});
  });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  const click = async s => { await p.evaluate(s => document.querySelector(s).click(), s); await p.waitForTimeout(300); };
  const more = () => p.$eval('#more [data-sheet=sync] .sv', e => e.textContent);
  const st = () => p.evaluate(() => JSON.parse(localStorage.getItem('telos_v3') || '{}'));
  await p.goto(F); await p.waitForTimeout(700);
  ok(await more() === 'Off', 'Today shows Cloud backup: Off');
  await click('#more [data-sheet=sync]');
  ok(/telos-data/.test(await p.textContent('#panel')), 'setup sheet explains telos-data');
  await p.fill('#syncIn', 'hello'); await click('#syncSave');
  ok(/doesn’t look like a GitHub token/.test(await p.textContent('#panel')), 'rejects a non-token');
  await p.fill('#syncIn', 'github_pat_' + 'B'.repeat(40)); await click('#syncSave'); await p.waitForTimeout(400);
  ok(/refused the key/.test(await p.textContent('#panel')) && !(await p.evaluate(() => localStorage.getItem('telos_sync'))), 'wrong key: says so and is not kept');
  gh.repo = false;
  await p.fill('#syncIn', TOK); await click('#syncSave'); await p.waitForTimeout(400);
  ok(/can’t open telos-data/.test(await p.textContent('#panel')), 'no repository: says so');
  gh.repo = true;
  await p.fill('#syncIn', TOK); await click('#syncSave'); await p.waitForTimeout(500);
  ok(gh.puts.length === 1 && /^Backed up \d\d:\d\d$/.test(await more()), 'first backup written: ' + await more());
  ok(!JSON.stringify(gh.puts[0]).includes(TOK), 'token is not in the backup');
  await click('#panel [data-close]');
  // a change goes up a few seconds later
  await click('#meals .mslot.next [data-ate]');
  const m1 = Object.keys((await st()).ticks || {}).length;
  await p.waitForTimeout(5500);
  const last = gh.puts[gh.puts.length - 1];
  ok(m1 > 0 && gh.puts.length === 2 && JSON.stringify(last.state.ticks) === JSON.stringify((await st()).ticks), 'meal ticked → pushed with it');
  // weight on Trend, push conflicts once (another phone wrote): read again, then push
  gh.conflictOnce = true;
  await click('nav [data-tab=trend]'); await p.fill('#wIn', '76.4'); await p.fill('#sIn', '7'); await click('#mLog');
  await p.waitForTimeout(6500);
  ok(gh.puts[gh.puts.length - 1].state.weights && Object.values(gh.puts[gh.puts.length - 1].state.weights)[0] === 76.4, 'after a conflict the weight still went up');
  // the phone loses everything (icon deleted): set up again, the log comes back
  const before = await st();
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(700);
  ok(await more() === 'Off' && !Object.keys((await st()).weights || {}).length, 'wiped phone starts empty');
  await click('nav [data-tab=today]');
  await click('#more [data-sheet=sync]'); await p.fill('#syncIn', TOK); await click('#syncSave'); await p.waitForTimeout(600);
  const after = await st();
  ok(JSON.stringify(after.weights) === JSON.stringify(before.weights) && JSON.stringify(after.ticks) === JSON.stringify(before.ticks), 'log restored from GitHub');
  ok(await p.$$eval('#meals .chk[aria-pressed=true], #meals .eaten', l => l.length) > 0 || /Eaten/.test(await p.textContent('#v-today')), 'Today shows the restored meal');
  await click('#panel [data-close]');
  // another phone wrote a newer copy: coming back to the app takes it
  const newer = JSON.parse(JSON.stringify(after)); newer.weights['2026-11-22'] = 77;
  gh.file = { sha: 'x' + (++gh.n), content: enc({ app: 'telos', key: 'telos_v3', at: Date.now() + 60000, state: newer }) };
  const putsBefore = gh.puts.length;
  await p.evaluate(() => { Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await p.waitForTimeout(500);
  ok((await st()).weights['2026-11-22'] === 77 && gh.puts.length === putsBefore, 'newer copy online taken, not overwritten');
  // offline: says so, then catches up when back
  gh.status = 503;
  await click('nav [data-tab=trend]'); await p.fill('#wIn', '76.1'); await p.fill('#sIn', '7'); await click('#mLog'); await p.waitForTimeout(5000);
  ok(await more() === 'Not backed up', 'GitHub down: Today says Not backed up');
  gh.status = null;
  await p.evaluate(() => window.dispatchEvent(new Event('online'))); await p.waitForTimeout(600);
  ok(/^Backed up/.test(await more()) && Object.values(gh.puts[gh.puts.length - 1].state.weights).indexOf(76.1) >= 0, 'back online: caught up');
  // turning it off keeps the log and removes the token
  await click('nav [data-tab=today]'); await click('#more [data-sheet=sync]'); await click('#syncOff');
  ok(!(await p.evaluate(() => localStorage.getItem('telos_sync'))) && Object.keys((await st()).weights).length > 0 && await more() === 'Off', 'turn off: token gone, log kept');
  ok(errs.length === 0, 'no page errors ' + JSON.stringify(errs));
  await b.close(); process.exit(bad ? 1 : 0);
})();
