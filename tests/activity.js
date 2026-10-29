// Other activity on Train: add a run, a scooter ride, remove with undo, survives a reload, junk in storage is dropped.
//   node tests/activity.js [coach.html]   (needs Playwright)
const { chromium } = require('playwright'), path = require('path');
const F = 'file://' + path.resolve(process.argv[2] || path.join(__dirname, '..', 'coach.html'));
const VP = "document.addEventListener('DOMContentLoaded',()=>{const m=document.createElement('meta');m.name='viewport';m.content='width=device-width, initial-scale=1, viewport-fit=cover';document.head.appendChild(m);});";
let bad = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
(async () => {
  const b = await chromium.launch();
  for (const w of [320, 360, 390]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 800 }, isMobile: true, hasTouch: true });
    await ctx.addInitScript(VP);
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
    const click = async s => { await p.evaluate(s => document.querySelector(s).click(), s); await p.waitForTimeout(300); };
    await p.goto(F); await p.waitForTimeout(700);
    await click('nav [data-tab=train]');
    ok(await p.$eval('#actList', e => e.hidden), w + 'px: no activity yet, list hidden');
    await click('#aAdd');
    ok(/Enter a distance/.test(await p.textContent('#aErr')), w + 'px: empty add says what is missing');
    await click('[data-at=run]'); await p.fill('#aKm', '5.04'); await p.fill('#aMin', '28'); await click('#aAdd');
    await click('[data-at=scooter]'); await p.fill('#aMin', '20'); await click('#aAdd');
    const rows = await p.$$eval('#actList .xb', els => els.map(e => e.textContent));
    ok(rows.length === 2 && /^Run5 km · 28 min$/.test(rows[0]) && /^Scooter20 min$/.test(rows[1]), w + 'px: rows ' + JSON.stringify(rows));
    ok(/Last 7 days: 2 activities · 5 km/.test(await p.textContent('#actNote')), w + 'px: note ' + (await p.textContent('#actNote')).slice(0, 50));
    await click('[data-ad="0"]'); ok((await p.$$('#actList .xrow')).length === 1, w + 'px: removed one');
    await click('#toast [data-undo]'); ok((await p.$$eval('#actList .xb', e => e.map(x => x.textContent)))[0].startsWith('Run'), w + 'px: undo puts the run back first');
    const sw = await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.getElementById('v-train').scrollWidth <= innerWidth);
    ok(sw, w + 'px: no horizontal scroll');
    const small = await p.$$eval('#actType .chip, #aAdd, #actList .pbtn', els => els.filter(e => e.getBoundingClientRect().height < 44 || e.getBoundingClientRect().width < 44).length);
    ok(small === 0, w + 'px: every control is 44 px or more');
    if (w === 360) await p.screenshot({ path: process.env.SHOT || '/tmp/act.png', fullPage: false });
    await p.reload(); await p.waitForTimeout(700); await click('nav [data-tab=train]');
    ok((await p.$$('#actList .xrow')).length === 2, w + 'px: both survive a reload');
    // junk
    await p.evaluate(() => { const k = 'telos_v2', s = JSON.parse(localStorage.getItem(k)); s.acts = { '2026-10-29': [{ t: 'swim', km: 5 }, { t: 'run', km: 'x' }, { t: 'walk', km: 3, min: 99999 }, null, 7], 'bad': [{ t: 'run', km: 1 }] }; s.acts2 = 1; localStorage.setItem(k, JSON.stringify(s)); });
    await p.reload(); await p.waitForTimeout(700); await click('nav [data-tab=train]');
    const kept = await p.$$eval('#actList .xb', els => els.map(e => e.textContent));
    ok(kept.length === 1 && /^Walk3 km · 1440 min$/.test(kept[0]), w + 'px: junk dropped, bounds applied ' + JSON.stringify(kept));
    ok(errs.length === 0, w + 'px: no page errors ' + JSON.stringify(errs));
    await ctx.close();
  }
  await b.close(); process.exit(bad ? 1 : 0);
})();
