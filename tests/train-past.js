// A forgotten workout can be logged on an earlier day (Train day arrows), and the rotation follows it.
//   node tests/train-past.js [coach.html]   (needs Playwright)
const { chromium } = require('playwright'), path = require('path');
const F = 'file://' + path.resolve(process.argv[2] || path.join(__dirname, '..', 'coach.html'));
const VP = "document.addEventListener('DOMContentLoaded',()=>{const m=document.createElement('meta');m.name='viewport';m.content='width=device-width, initial-scale=1, viewport-fit=cover';document.head.appendChild(m);});";
let bad = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true });
  await ctx.clock.setFixedTime(new Date('2026-11-26T12:00:00'));   // Thu, day five
  await ctx.addInitScript(VP);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  const click = async s => { await p.evaluate(s => document.querySelector(s).click(), s); await p.waitForTimeout(250); };
  const st = () => p.evaluate(() => JSON.parse(localStorage.getItem('telos_v3') || '{}'));
  const head = () => p.textContent('#trToday h3');
  await p.goto(F); await p.waitForTimeout(700);
  await click('nav [data-tab=train]');
  ok(await p.textContent('#trDate') === 'Today' && await p.$eval('#tNext', e => e.disabled), 'starts on today, no going forward');
  ok(await head() === 'Push', 'nothing logged: Push is still owed today');
  for (let i = 0; i < 4; i++) await click('#tPrev');
  ok(await p.$eval('#tPrev', e => e.disabled) && /22/.test(await p.textContent('#trDate')), 'goes back to the start, Sun 22 Nov, no further');
  await click('#trDone');
  ok((await st()).sess['2026-11-22'] === 0 && (await st()).ticks['2026-11-22-d'].train, 'Push logged on 22 Nov');
  ok(/Push logged for Sun.*22/.test(await p.textContent('#toast')), 'toast names the day: ' + await p.textContent('#toast'));
  await click('#tNext'); await click('#tNext');            // Tue 24
  ok(await head() === 'Pull', 'Tue 24 owes Pull after Push on the 22nd');
  await click('#trDone');
  await click('#bikeBtn');
  ok((await st()).sess['2026-11-24'] === 1 && (await st()).ticks['2026-11-24-d'].bike, 'Pull and the bike ride logged on Tue 24');
  await p.fill('#aKm', '3'); await click('#aAdd');
  ok(((await st()).acts['2026-11-24'] || []).length === 1 && !(await st()).acts['2026-11-26'], 'activity goes on the picked day');
  await click('#tNext'); await click('#tNext');            // today
  ok(await p.textContent('#trDate') === 'Today' && await head() === 'Legs', 'today now owes Legs');
  const plan = await p.$$eval('#weekPlan .an', l => l.map(e => e.textContent));
  ok(plan[0] === 'Legs' && plan[1] === 'Bike ride', 'next 7 days from today: ' + plan.join(', '));
  await click('[data-ses="3"]');
  ok(/Bike ride[\s\S]*45–60 min · steady/.test(await p.textContent('#trToday')), 'the bike day shows 45–60 min, steady');
  ok(!/5K/.test(await p.textContent('#trToday') + await p.textContent('#weekPlan')), 'no 5K left in the sessions');
  ok(errs.length === 0, 'no page errors ' + JSON.stringify(errs));
  await p.evaluate(() => scrollTo(0, 0)); await p.screenshot({ path: '/tmp/claude-0/train.png' });
  await b.close(); process.exit(bad ? 1 : 0);
})();
