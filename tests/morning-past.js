// Weight and sleep can be logged for an earlier day too (Trend, "This morning" arrows).
//   node tests/morning-past.js [coach.html]   (needs Playwright)
const { chromium } = require('playwright'), path = require('path');
const F = 'file://' + path.resolve(process.argv[2] || path.join(__dirname, '..', 'coach.html'));
const VP = "document.addEventListener('DOMContentLoaded',()=>{const m=document.createElement('meta');m.name='viewport';m.content='width=device-width, initial-scale=1, viewport-fit=cover';document.head.appendChild(m);});";
let bad = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true });
  await ctx.addInitScript(VP);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  const click = async s => { await p.evaluate(s => document.querySelector(s).click(), s); await p.waitForTimeout(300); };
  await p.goto(F); await p.waitForTimeout(700);
  await click('nav [data-tab=trend]');
  const T = s => p.textContent(s);
  ok(await T('#mDate') === 'Today' && await T('#mTitle') === 'This morning', 'starts on today');
  ok(await p.$eval('#mNext', e => e.disabled), 'cannot go past today');
  await p.fill('#wIn', '75'); await p.fill('#sIn', '7'); await click('#mLog');
  await click('#mPrev');
  ok(await T('#mDate') === 'Yesterday' && await T('#mTitle') === 'That morning', 'one arrow back is yesterday');
  ok(await p.inputValue('#wIn') === '' && await p.inputValue('#sIn') === '', 'yesterday starts empty');
  await p.fill('#wIn', '75.2'); await p.fill('#sIn', '7'); await click('#mLog');
  ok(/Logged yesterday/.test(await T('#toast')), 'toast says yesterday: ' + (await T('#toast')).slice(0, 40));
  const st = await p.evaluate(() => JSON.parse(localStorage.getItem('telos_v2')));
  const days = Object.keys(st.weights).sort();
  ok(days.length === 2 && st.weights[days[0]] === 75.2 && st.weights[days[1]] === 75 && st.sleep[days[0]] === 7, 'stored on two separate days ' + JSON.stringify(st.weights));
  await click('#toast [data-undo]');
  const st2 = await p.evaluate(() => JSON.parse(localStorage.getItem('telos_v2')));
  ok(Object.keys(st2.weights).length === 1 && Object.keys(st2.sleep).length === 1, 'undo removes yesterday only');
  ok(await p.$eval('#mPrev', e => e.disabled), 'back arrow stops at the start day (28 Oct is yesterday)');
  ok(errs.length === 0, 'no page errors ' + JSON.stringify(errs));
  await p.screenshot({ path: process.env.SHOT || '/tmp/morn.png' });
  await b.close(); process.exit(bad ? 1 : 0);
})();
