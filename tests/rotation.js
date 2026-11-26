// Training follows what was done, not the calendar: a skipped day keeps the same session, a swapped session leaves
// the skipped one owed, and any session can be logged from the chips.
//   node tests/rotation.js [coach.html]   (needs Playwright)
const { chromium } = require('playwright'), path = require('path');
const F = 'file://' + path.resolve(process.argv[2] || path.join(__dirname, '..', 'coach.html'));
let bad = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
const NAMES = ['Push', 'Pull', 'Legs', 'Bike ride', 'Upper', 'Delts, arms, abs, neck', 'Rest'];
async function open(b, day, st) {
  const ctx = await b.newContext({ viewport: { width: 360, height: 800 } });
  await ctx.clock.setFixedTime(new Date(day + 'T12:00:00'));
  await ctx.addInitScript(s => { try { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('telos_v3', s); sessionStorage.setItem('seeded', '1'); } } catch (e) {} }, JSON.stringify(st));
  const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
  await p.goto(F); await p.waitForTimeout(600);
  await p.evaluate(() => document.querySelector('nav [data-tab=train]').click()); await p.waitForTimeout(300);
  return p;
}
const card = p => p.$eval('#trToday h3', e => e.textContent);
const week = p => p.$$eval('#weekPlan .an', e => e.map(x => x.textContent));
(async () => {
  const b = await chromium.launch();
  let p = await open(b, '2026-11-22', {});
  ok(await card(p) === 'Push', 'day one: Push');
  p = await open(b, '2026-11-25', { sess: { '2026-11-22': 0 } });
  ok(await card(p) === 'Pull', 'did Push, then skipped two days: Pull still waits');
  p = await open(b, '2026-11-24', { sess: { '2026-11-22': 0, '2026-11-23': 4 } });
  ok(await card(p) === 'Pull', 'Upper done on the Pull day: Pull still owed');
  const w = await week(p);
  ok(JSON.stringify(w) === JSON.stringify(['Pull', 'Legs', 'Bike ride', 'Delts, arms, abs, neck', 'Rest', 'Push', 'Pull']), 'next 7 days skip the Upper already done: ' + w.join(', '));
  p = await open(b, '2026-11-23', { ticks: { '2026-11-22-d': { train: true } } });
  ok(await card(p) === 'Pull', 'trained ticked on the Today checklist counts as the session owed');
  // log a different session from the chips, then undo
  p = await open(b, '2026-11-23', { sess: { '2026-11-22': 0 } });
  await p.evaluate(() => document.querySelector('[data-ses="2"]').click()); await p.waitForTimeout(200);
  ok(await card(p) === 'Legs' && await p.textContent('#trDone') === 'Mark as trained', 'Legs chip shows Legs');
  await p.evaluate(() => document.querySelector('#trDone').click()); await p.waitForTimeout(300);
  const st = await p.evaluate(() => JSON.parse(localStorage.getItem('telos_v3')));
  ok(st.sess['2026-11-23'] === 2 && st.ticks['2026-11-23-d'].train === true, 'Legs logged for today, checklist ticked too');
  ok(/Legs ✓/.test(await p.$eval('#trToday .chips', e => e.textContent)), 'the Legs chip carries a tick');
  ok((await week(p))[1] === 'Pull', 'Pull still comes next: ' + (await week(p)).join(', '));
  await p.evaluate(() => document.querySelector('[data-ses="4"]').click()); await p.waitForTimeout(200);
  ok(await p.textContent('#trDone') === 'Log Upper instead', 'another chip offers to swap the log');
  await p.evaluate(() => document.querySelector('#toast [data-undo]').click()); await p.waitForTimeout(300);
  const st2 = await p.evaluate(() => JSON.parse(localStorage.getItem('telos_v3')));
  ok(st2.sess['2026-11-23'] === undefined && !(st2.ticks['2026-11-23-d'] || {}).train, 'undo takes the log back off');
  ok(p.errs.length === 0, 'no page errors ' + JSON.stringify(p.errs));
  await b.close(); process.exit(bad ? 1 : 0);
})();
