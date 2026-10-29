// Reviewing, filling in and deleting earlier days. The clock is set to 31 Oct 2026 (day 4) so there are real past days.
//   node tests/day-history.js [coach.html]   (needs Playwright)
const { chromium } = require('playwright'), path = require('path');
const F = 'file://' + path.resolve(process.argv[2] || path.join(__dirname, '..', 'coach.html'));
const VP = "document.addEventListener('DOMContentLoaded',()=>{const m=document.createElement('meta');m.name='viewport';m.content='width=device-width, initial-scale=1, viewport-fit=cover';document.head.appendChild(m);});";
let bad = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await ctx.clock.setFixedTime(new Date('2026-10-31T12:00:00')); await ctx.addInitScript(VP);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  const T = async s => { const e = await p.$(s); return e ? (await e.textContent()).replace(/\s+/g, ' ').trim() : null; };
  const click = async s => { await p.evaluate(s => document.querySelector(s).click(), s); await p.waitForTimeout(450); };
  await p.goto(F); await p.waitForTimeout(900);
  ok(await T('#dayTitle') === 'Today' && await p.$eval('#dNext', e => e.disabled), 'opens on today, next-day arrow is off');
  const todayLeft = await T('#rLeft');
  await click('#dPrev');
  ok(await T('#dayTitle') === 'Yesterday' && !(await p.$eval('#daybar', e => e.hidden)), 'previous day: title says Yesterday, past-day strip shows');
  ok((await T('#rUnit')) === 'kcal under' && /Nothing logged/.test(await T('#rFind')), 'empty past day: "kcal under", says nothing is logged');
  await click('.mslot.next .bigbtn:not(.skip)'); await click('.mslot.next .bigbtn:not(.skip)');
  ok((await T('#rEaten')).startsWith('1,024') || /^\d/.test(await T('#rEaten')), 'tick two meals on yesterday: ' + await T('#rEaten'));
  const eatenY = await T('#rEaten');
  // off-plan food on a past day
  await click('#offplan [data-sheet=add]'); await click('.segb[data-tab=num]');
  await p.fill('#fName', 'Late shawarma'); await p.fill('#fKcal', '700'); await p.fill('#fP', '35'); await p.fill('#fF', '30'); await p.fill('#fC', '70');
  ok(/yesterday|Counts toward/i.test(await T('.pt span') || ''), 'sheet says which day it counts toward: ' + await T('.pt span'));
  await click('#fAdd');
  ok((await p.$$eval('#offplan .xrow b', e => e.map(x => x.textContent))).join() === 'Late shawarma', 'off-plan food added to yesterday');
  ok(/kcal over|kcal under/.test(await T('#rUnit')) && !/Tomorrow/.test(await T('#rFind')), 'past-day wording, no coaching: ' + await T('#rFind'));
  // today is untouched except for carry-over
  await click('#dBack');
  ok(await T('#dayTitle') === 'Today' && (await p.$$eval('#offplan .xrow', e => e.length)) === 0, 'back to today: no off-plan rows leaked into today');
  // days list
  await click('#hDate');
  const rows = await p.$$eval('.dayrow', e => e.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
  ok(rows.length === 4 && /kcal/.test(rows[1]) && /Not logged/.test(rows[0]), 'Days sheet lists 4 days, yesterday has totals: ' + JSON.stringify(rows.slice(0, 2)));
  ok(/Last 7 days: 1 logged/.test(await T('.daysum')), 'seven-day summary: ' + await T('.daysum'));
  await p.evaluate(() => document.querySelectorAll('.dayrow')[3].click()); await p.waitForTimeout(500);
  ok(await p.$eval('#dPrev', e => e.disabled), 'opened the first day of the plan: previous arrow is off');
  await click('#dNext'); await click('#dNext');
  ok(await T('#dayTitle') === 'Yesterday', 'stepped forward to yesterday');
  // delete an off-plan entry, then undo
  await click('#offplan [data-od="0"]');
  ok((await p.$$eval('#offplan .xrow', e => e.length)) === 0, 'deleted the off-plan entry');
  await click('.tundo');
  ok((await p.$$eval('#offplan .xrow', e => e.length)) === 1, 'undo brought it back');
  // clear the day's food, then undo
  await click('[data-clearday]');
  ok((await T('#rEaten')).startsWith('0 of') && (await p.$$eval('#offplan .xrow', e => e.length)) === 0, 'cleared the day: ' + await T('#rEaten') + ', ' + await T('#toast span'));
  await click('.tundo');
  const afterUndo = await T('#rEaten');
  ok(afterUndo === '1,736 of 2,350' && afterUndo.split(' of ')[0] !== eatenY.split(' of ')[0], 'undo restored the whole day (meals and the off-plan item): ' + afterUndo);
  // survives a reload
  await p.reload(); await p.waitForTimeout(900);
  await click('#dPrev');
  ok((await T('#rEaten')) === afterUndo && (await p.$$eval('#offplan .xrow', e => e.length)) === 1, 'yesterday survives a reload: ' + await T('#rEaten'));
  // coach still works on today, and sees yesterday's overshoot as carry-over
  // push yesterday well over target: today's target drops by the carry-over, capped at 300
  await click('#offplan [data-sheet=add]'); await click('.segb[data-tab=num]');
  await p.fill('#fName', 'Big night'); await p.fill('#fKcal', '1200'); await click('#fAdd');
  ok(/kcal over/.test(await T('#rUnit')), 'yesterday is now over target: ' + await T('#rEaten'));
  await click('#dBack');
  ok(await T('#dayTitle') === 'Today' && (await T('#rEaten')).endsWith('of 2,050'), 'today target carries yesterday: ' + await T('#rEaten') + ' (2,350 minus 300)');
  await click('#dPrev'); await click('[data-clearday]'); await click('#dBack');
  ok((await T('#rEaten')).endsWith('of 2,350'), 'clearing yesterday gives today its full target back: ' + await T('#rEaten'));
  ok(errs.length === 0, 'no page errors ' + JSON.stringify(errs));
  await b.close(); process.exit(bad ? 1 : 0);
})();
