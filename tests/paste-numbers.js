// The free web lookup: numbers pasted from a web page fill the form. Parser cases, then the whole flow.
//   node tests/paste-numbers.js [coach.html]   (needs Playwright)
const { chromium } = require('playwright'), path = require('path');
const F = 'file://' + path.resolve(process.argv[2] || path.join(__dirname, '..', 'coach.html'));
const VP = "document.addEventListener('DOMContentLoaded',()=>{const m=document.createElement('meta');m.name='viewport';m.content='width=device-width, initial-scale=1, viewport-fit=cover';document.head.appendChild(m);});";
let bad = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
const CASES = [
  ['463 calories, 25 g protein, 22 g fat, 42 g carbs', [463, 25, 22, 42]],
  ['Calories: 463 | Fat: 22g | Carbs: 42g | Protein: 25g', [463, 25, 22, 42]],
  ['Per 1 serving - Calories: 463kcal | Fat: 22.00g | Carbs: 42.00g | Protein: 25.00g', [463, 25, 22, 42]],
  ['Energy 1940 kJ / 463 kcal Fat 22 g of which saturates 5 g Carbohydrate 42 g of which sugars 6 g Protein 25 g', [463, 25, 22, 42]],
  ['Nutrition Facts: Calories 505, Total Fat 20g, Saturated Fat 4g, Total Carbohydrate 47g, Dietary Fiber 4g, Sugars 8g, Protein 27g', [505, 27, 20, 47]],
  ['25g protein 22g fat 42g carbs 463 kcal', [463, 25, 22, 42]],
  ['463 kcal, 22,5 g fat, 42 g carbs, 25 g protein', [463, 25, 22.5, 42]],
  ['1940 kJ, 25 g protein, 22 g fat, 42 g carbs', [464, 25, 22, 42]],
  ['25 g protein, 22 g fat, 42 g carbs', [466, 25, 22, 42]],
  ['Tunacado 463 cal 25 g protein 22 g fat 42 g carbs', [463, 25, 22, 42]],
  ['1,200 calories, 60 g protein, 50 g fat, 120 g carbs', [1200, 60, 50, 120]],
  ['Carbs 42g, Fat 22g, Protein 25g, Calories 463', [463, 25, 22, 42]],
  ['Calories 463 Protein 25 Fat 22 Carbs 42', [463, 25, 22, 42]],
];
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, permissions: ['clipboard-read', 'clipboard-write'] });
  await ctx.addInitScript(VP);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  const click = async s => { await p.evaluate(s => document.querySelector(s).click(), s); await p.waitForTimeout(350); };
  await p.goto(F); await p.waitForTimeout(800);
  await click('#offplan [data-sheet=add]'); await click('.segb[data-tab=num]');
  for (const [text, want] of CASES) {
    await p.fill('#pasteIn', ''); await p.fill('#fName', ''); await p.fill('#pasteIn', text); await p.waitForTimeout(120);
    const got = [await p.inputValue('#fKcal'), await p.inputValue('#fP'), await p.inputValue('#fF'), await p.inputValue('#fC')].map(Number);
    ok(JSON.stringify(got) === JSON.stringify(want), JSON.stringify(want) + ' <- ' + text.slice(0, 70));
  }
  await p.fill('#pasteIn', 'hello there'); await p.waitForTimeout(120);
  ok(/Couldn.t find numbers/.test(await p.textContent('#pasteNote')), 'junk text: says it could not find numbers');
  // the whole flow from Search
  await click('[data-close]'); await click('#offplan [data-sheet=add]');
  await p.fill('#qIn', 'joe and the juice tuna sandwich'); await p.waitForTimeout(400);
  const href = await p.$eval('.lookbtn', e => e.href);
  ok(/google\.com\/search\?q=joe%20and%20the%20juice%20tuna%20sandwich%20calories/.test(href), 'search with no good match offers a web lookup link: ' + href.slice(0, 90));
  ok(await p.$eval('.lookbtn', e => e.target === '_blank' && /noopener/.test(e.rel)), 'the link opens in a new tab, safely');
  await click('[data-topaste]');
  ok(await p.inputValue('#fName') === 'Joe and the juice tuna sandwich' && await p.evaluate(() => document.activeElement && document.activeElement.id) === 'pasteIn', 'Paste the numbers: Numbers tab, name carried over, paste box focused');
  await p.evaluate(() => navigator.clipboard.writeText('Tunacado: Calories 463 | Fat 22g | Carbs 42g | Protein 25g'));
  await click('[data-paste]'); await p.waitForTimeout(300);
  ok(await p.inputValue('#fKcal') === '463' && /Found 463 kcal/.test(await p.textContent('#pasteNote')), 'Paste from clipboard fills the form: ' + (await p.textContent('#pasteNote')).slice(0, 80));
  ok(/Add .Joe and the juice tuna sandwich. . 463 kcal/.test(await p.textContent('#fAdd')), 'the Add button names it: ' + await p.textContent('#fAdd'));
  await click('#fAdd');
  const row = (await p.$$eval('#offplan .xrow', e => e.map(x => x.textContent.replace(/\s+/g, ' ').trim())))[0] || '';
  ok(/463 kcal · 25P 22F 42C · web/.test(row), 'logged on Today, marked as from the web: ' + row.slice(0, 80));
  ok(errs.length === 0, 'no page errors ' + JSON.stringify(errs));
  await b.close(); process.exit(bad ? 1 : 0);
})();
