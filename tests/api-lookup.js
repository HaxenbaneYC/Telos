// The optional paid lookup in the phone app (own Anthropic key), against a mock of api.anthropic.com.
// It checks what is sent and how replies and errors are handled; the real API is not called.
//   node tests/api-lookup.js [coach.html]   (needs Playwright)
const { chromium } = require('playwright'), path = require('path'), fs = require('fs');
const F = 'file://' + path.resolve(process.argv[2] || path.join(__dirname, '..', 'coach.html'));
const VP = "document.addEventListener('DOMContentLoaded',()=>{const m=document.createElement('meta');m.name='viewport';m.content='width=device-width, initial-scale=1, viewport-fit=cover';document.head.appendChild(m);});";
const KEY = 'sk-ant-api03-' + 'x'.repeat(40);
let bad = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
const JSONTXT = o => '```json\n' + JSON.stringify(o) + '\n```';
const reply = (text, extra) => Object.assign({ id: 'msg_1', type: 'message', role: 'assistant', model: 'claude-sonnet-5-5', stop_reason: 'end_turn', content: [
  { type: 'server_tool_use', id: 'srvtoolu_1', name: 'web_search', input: { query: 'joe and the juice tunacado calories' } },
  { type: 'web_search_tool_result', tool_use_id: 'srvtoolu_1', content: [{ type: 'web_search_result', url: 'https://example.com', title: 't' }] },
  { type: 'text', text }] }, extra || {});
const TUNA = { name: 'Joe & The Juice Tunacado', amountText: '1 sandwich', kcal: 505, protein: 27, fat: 22, carbs: 47, confidence: 'medium', note: 'One regular sandwich.', source: 'joejuice.com' };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await ctx.addInitScript(VP);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  let calls = [], next = [];
  await p.route('https://api.anthropic.com/v1/messages', async route => {
    const req = route.request(); calls.push({ headers: req.headers(), body: JSON.parse(req.postData() || '{}') });
    const r = next.shift() || { status: 200, json: reply(JSONTXT(TUNA)) };
    if (r.abort) return route.abort('connectionfailed');
    await route.fulfill({ status: r.status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(r.json) });
  });
  await p.route('https://api.anthropic.com/**', route => route.request().method() === 'OPTIONS' ? route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST' } }) : route.fallback());
  const click = async s => { await p.evaluate(s => document.querySelector(s).click(), s); await p.waitForTimeout(350); };
  const T = async s => { const e = await p.$(s); return e ? (await e.textContent()).replace(/\s+/g, ' ').trim() : null; };
  const describe = async text => { await p.fill('#dText', text); calls = []; await click('#dGo'); await p.waitForTimeout(700); };
  await p.goto(F); await p.waitForTimeout(800);
  await click('#offplan [data-sheet=add]'); await click('.segb[data-tab=desc]');
  ok(!!(await p.$('#keyIn')) && !(await p.$('#dText')), 'no key yet: Describe shows the key card, not the search box');
  await p.fill('#keyIn', 'not-a-key'); await click('#keySave');
  ok(/doesn.t look like an Anthropic key/.test(await T('#keyErr')), 'a junk key is refused: ' + await T('#keyErr'));
  await p.fill('#keyIn', KEY); await click('#keySave');
  ok(!!(await p.$('#dText')) && !(await p.$('#keyIn')), 'a valid-looking key turns Describe on');
  ok((await p.evaluate(() => localStorage.getItem('telos_apikey'))) === KEY && !(await p.evaluate(() => localStorage.getItem('telos_v2') || '')).includes('sk-ant'), 'the key is kept apart from the log');
  // a normal lookup
  await describe('Joe and the Juice tuna sandwich');
  const c = calls[0] || { headers: {}, body: {} };
  ok(calls.length === 1 && c.headers['x-api-key'] === KEY && c.headers['anthropic-version'] === '2023-06-01' && c.headers['anthropic-dangerous-direct-browser-access'] === 'true', 'request carries the key, version and browser-access headers');
  ok(c.body.model === 'claude-sonnet-5-5' && c.body.tools && c.body.tools[0].type === 'web_search_20260209' && c.body.tools[0].max_uses === 3, 'asks Sonnet 5.5 with the web search tool, at most 3 searches');
  ok(c.body.messages[0].content.some(b => b.type === 'text' && /Joe and the Juice tuna sandwich/.test(b.text) && /search the web/.test(b.text)), 'the prompt has the food and tells it to search');
  ok(await p.inputValue('#fKcal') === '505' && await p.inputValue('#fP') === '27' && /Joe & The Juice Tunacado/.test(await p.inputValue('#fName')), 'reply (after search blocks) fills the form: ' + await p.inputValue('#fName'));
  ok(/joejuice\.com/.test(await T('#aNote')), 'note names the source: ' + (await T('#aNote')).slice(0, 90));
  // paused turn: the app continues it
  await click('[data-close]'); await click('#offplan [data-sheet=add]'); await click('.segb[data-tab=desc]');
  next = [{ status: 200, json: { id: 'm', type: 'message', role: 'assistant', stop_reason: 'pause_turn', content: [{ type: 'server_tool_use', id: 's1', name: 'web_search', input: { query: 'x' } }] } }, { status: 200, json: reply(JSONTXT(TUNA)) }];
  await describe('tuna sandwich');
  ok(calls.length === 2 && calls[1].body.messages.length === 2 && calls[1].body.messages[1].role === 'assistant', 'pause_turn: sends a second request with the assistant turn');
  ok(await p.inputValue('#fKcal') === '505', 'and the final answer fills the form');
  // errors, each with a plain message
  const cases = [[401, { error: { message: 'invalid x-api-key' } }, /rejected that key/], [429, { error: { message: 'slow' } }, /Too many requests/], [400, { error: { message: 'Your credit balance is too low' } }, /out of credit/], [529, { error: { message: 'overloaded' } }, /busy/], [418, { error: { message: 'teapot' } }, /Anthropic said: teapot/]];
  for (const [status, json, re] of cases) {
    await click('[data-close]'); await click('#offplan [data-sheet=add]'); await click('.segb[data-tab=desc]');
    next = [{ status, json }]; await describe('x');
    const shown = await T('#panel .ferr:not([hidden])') || '';
    ok(re.test(shown), status + ' -> ' + (shown || '(no message)'));
  }
  await click('[data-close]'); await click('#offplan [data-sheet=add]'); await click('.segb[data-tab=desc]');
  next = [{ abort: true }]; await describe('x');
  ok(/No connection/.test(await T('#panel .ferr:not([hidden])') || ''), 'no network -> ' + await T('#panel .ferr:not([hidden])'));
  // account without web search: retries without the tool and says so
  await click('[data-close]'); await click('#offplan [data-sheet=add]'); await click('.segb[data-tab=desc]');
  next = [{ status: 400, json: { error: { message: 'The web_search tool is not enabled for this organization' } }, }, { status: 200, json: { id: 'm', type: 'message', role: 'assistant', stop_reason: 'end_turn', content: [{ type: 'text', text: JSONTXT(TUNA) }] } }];
  await describe('tuna sandwich');
  ok(calls.length === 2 && !calls[1].body.tools && /web search off/.test(await T('#aNote') || ''), 'web search off: retried without the tool and the note says it is from memory');
  // label photo
  await click('[data-close]'); await click('#offplan [data-sheet=add]'); await click('.segb[data-tab=photo]');
  const png = fs.readFileSync(path.join(__dirname, '..', 'docs', 'icons', 'icon-192.png'));
  calls = []; next = [{ status: 200, json: { id: 'm', type: 'message', role: 'assistant', stop_reason: 'end_turn', content: [{ type: 'text', text: JSONTXT({ brand: 'Kinder', product: 'Bueno', per100: { kcal: 572, protein: 8.6, fat: 41, carbs: 49 }, perServing: { kcal: 122, protein: 1.8, fat: 8.7, carbs: 10.5 }, servingAmount: 21.5, servingUnit: 'g', basisUnit: 'g', confidence: 'high', note: '' }) }] } }];
  await p.setInputFiles('#lblFile', { name: 'label.png', mimeType: 'image/png', buffer: png }); await p.waitForTimeout(1200);
  const lb = calls[0] ? calls[0].body : {};
  ok(calls.length === 1 && !lb.tools && lb.messages[0].content[0].type === 'image' && lb.messages[0].content[0].source.media_type === 'image/jpeg' && lb.messages[0].content[0].source.data.length > 100, 'label photo: sent as a JPEG image block, no web search');
  ok(/Kinder/.test(await T('.lblhead') || ''), 'label read: ' + (await T('.lblhead') || '(none)'));
  // removing the key
  await click('[data-keyremove]');
  ok(!!(await p.$('#keyIn')) && (await p.evaluate(() => localStorage.getItem('telos_apikey'))) === null, 'Remove my key: back to the key card, key erased');
  ok(errs.length === 0, 'no page errors ' + JSON.stringify(errs));
  await b.close(); process.exit(bad ? 1 : 0);
})();
