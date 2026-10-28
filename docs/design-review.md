# Telos: UI/UX review pack

A snapshot of the app's design and the code behind its three main screens, taken from `main` so it can be reviewed without opening the repo. Screenshots are in `docs/screens/` (dark and light, 390 × 844 at 2×).

## 1. Tech stack

**This is a web app, not React Native, Expo or Flutter.** There is no component framework and no build toolchain.

| | |
|---|---|
| Runtime | One self-contained HTML file, `coach.html`, opened in a phone browser or published as a private Claude artifact |
| Language | Plain HTML, CSS and ES5 JavaScript (`var`, no modules, no transpiling) |
| Framework | None. Screens are template strings written into the DOM by render functions |
| Styling | Hand-written CSS with custom properties, dark-first plus a light theme, no Tailwind or CSS-in-JS |
| State | One object `S`, persisted to `localStorage` (`telos_v1`), every read and write in try/catch |
| Fonts | IBM Plex Sans and IBM Plex Mono from Google Fonts (the only external request) |
| Data | 7,831-food USDA table embedded in the file, searched offline in JS |
| AI | Optional: Claude "Describe" and "Label photo" routes via the artifact `sample` capability, hidden when unavailable |
| Build | `python3 build.py` concatenates `src/head.html` + `src/js-*.js` and embeds `data/foods.tsv` into `coach.html` |
| Testing | Playwright (Chromium) scripts, run by hand at 320, 360, 390 and 430 px wide |

Because it is a web app, "Expo Snack / CodeSandbox" does not apply. The preview is the app itself: `coach-preview.html` (build with `python3 build.py --preview`) is a single file with sample data that opens in any browser. The live artifact is https://claude.ai/artifact/QLwo4qncFyKkM5KP4EVdLY (private).

## 2. Screen map

You named three screens. Here is how they map onto this app:

| You asked for | In Telos | Where |
|---|---|---|
| Home / Dashboard | **Today** tab | `#v-today`, rendered by `renderTop`, `renderHero`, `renderMeals` |
| Search Screen | **Add off-plan food → Search** tab, in a bottom sheet | `viewAdd` → `findBlock` → `hitsHtml` |
| Food Detail / Logging modal | The **same sheet** after picking a result: amount, unit, name, macros, "Add to today". Also the **meal sheet** (tap a meal) for editing a planned meal | `pickFood`, `foodCalc`, `viewAdd`; `viewMeal` |

Other tabs exist (Train, Food recipes, Trend) and share the same card and sheet components. They are not included here.

Screenshots:

| Screen | Dark | Light |
|---|---|---|
| Today, top | `screens/1-today-dark.png` | `screens/1-today-light.png` |
| Today, scrolled (mini bar) | `screens/2-today-scrolled-dark.png` | `screens/2-today-scrolled-light.png` |
| Search | `screens/3-search-dark.png` | `screens/3-search-light.png` |
| Food detail / logging | `screens/4-food-detail-dark.png` | `screens/4-food-detail-light.png` |
| Meal sheet | `screens/5-meal-sheet-dark.png` | `screens/5-meal-sheet-light.png` |

## 3. Design system

**Identity.** Basalt ground, teal for the primary action and protein, bronze for times and fat, chalk for carbs. **Red appears only when a figure goes past its target.** Never decoration, never errors.

**Type.** IBM Plex Sans for words (sentence case), IBM Plex Mono for figures only. Sizes in use: 11–22 px for text, 26 / 34 / 38 px for lead figures and titles. Body copy is 14–17 px. Large on purpose.

**Shape and spacing.** Cards 20 px radius, controls 14 px. Side gutter `.gut` on every screen. Touch targets 44 px or more (rows 62–72 px, primary button 54 px). No horizontal scroll from 320 to 430 px.

**Glass.** Header, tab bar and the summary card are translucent with `backdrop-filter: blur(28px)` over a soft colour wash. Everything that holds data (cards, sheets, rows) is solid, so numbers never sit on a blurred background.

**Motion.** Used as feedback only: number tween on totals, row FLIP when a meal moves to "Eaten", sheet slide, tab-pill slide. All of it is off under `prefers-reduced-motion`.

**Theme tokens** (dark, then the light overrides):

<sub>`src/head.html` lines 12–45</sub>

```css
  :root {
    --void: #0A0C0B;
    --card: #141716;
    --fill: #1E2321;
    --line: rgba(216,210,196,0.13);
    --line-ctl: #3B3F3C;
    --track: rgba(216,210,196,0.16);
    --fg: #EDEAE2;
    --fg-2: #ABA89D;
    --fg-3: #928E83;
    --teal: #2A9D8A;
    --bronze: #B08455;
    --chalk: #D8D2C4;
    --signal: #FF5C45;
    --scrim: rgba(0,0,0,0.55);
    --teal-dp: #0F6B5E;
    --bronze-dp: #7D5A3C;
    --chrome: rgba(10,12,11,0.80);
    --glass-bg: rgba(18,22,20,0.50);
    --glass-br: rgba(255,255,255,0.14);
    --glass-top: rgba(255,255,255,0.26);
    --amb: 0.55;
    --hero-amb: 1;
    --r-card: 20px;
    --r-ctl: 14px;
    --ease: cubic-bezier(0.16, 1, 0.3, 1);
    --mono: "IBM Plex Mono", ui-monospace, monospace;
    --sans: "IBM Plex Sans", system-ui, -apple-system, sans-serif;
    color-scheme: dark;
  }
  @media (prefers-color-scheme: light) {
    :root:not([data-theme="dark"]) {
      --void: #F0EFEB; --card: #FFFFFF; --fill: #E8E7E1;
      --line: rgba(20,23,22,0.13); --line-ctl: #C4C3BD; --track: rgba(20,23,22,0.12);
```

Light theme overrides the same names. The accents are darkened for contrast: teal `#0F6B5E`, bronze `#7D5A3C`, red `#C2301B`, ground `#F0EFEB`, cards `#FFFFFF`.

## 4. Home / Dashboard (Today)

Structure: glass header → title row and 13-week strip → glass summary card (kcal left, one-sentence finding, three macros) → a **Meals** list where the next meal is an open card, finished meals fold into one "Eaten" row, and later meals are plain rows → off-plan food → checklist → supplements. A mini calorie/macro bar slides in under the header on scroll. Bottom tab bar with a travelling pill.

**Markup**

<sub>`src/head.html` lines 684–737</sub>

```html
<header id="hdr">
  <div class="hwrap gut">
    <span class="mk"><svg viewBox="0 0 256 256" aria-hidden="true"><rect width="256" height="256" fill="#2A9D8A"/><path fill="#D8D2C4" d="M102 26H154L147 180H109Z M22 180h212v46H22Z"/></svg></span>
    <span class="wm">Telos</span>
  </div>
</header>

<div class="mini" id="mini" aria-hidden="true">
  <div class="mini-in gut">
    <div class="mc4 k" id="mc-k"><span class="t"><b class="num" id="m-k">0</b> <small id="m-ku">left</small></span><span class="bar"><i id="mf-k"></i></span></div>
    <div class="mc4 p" id="mc4-p"><span class="t">P <b class="num" id="m-p">0</b></span><span class="bar"><i id="mf-p"></i></span></div>
    <div class="mc4 f" id="mc4-f"><span class="t">F <b class="num" id="m-f">0</b></span><span class="bar"><i id="mf-f"></i></span></div>
    <div class="mc4 c" id="mc4-c"><span class="t">C <b class="num" id="m-c">0</b></span><span class="bar"><i id="mf-c"></i></span></div>
  </div>
</div>

<main id="main">
  <section class="view" id="v-today">
    <div class="gut">
      <div class="titlerow"><h1>Today</h1><span class="dt" id="hDate"></span></div>
      <div class="weeks" id="weeks" role="img" aria-label="Week 1 of 13"></div>
      <div class="wkcap"><span id="wkL">Week 1 of 13</span><span class="k" id="wkR"></span></div>
      <button class="newwk" id="newWk" hidden><span class="nt" id="newWkTxt"></span><i class="chev" aria-hidden="true"></i></button>
    </div>

    <div class="hero"><div class="gut">
      <section class="sum" id="sum" aria-label="Today's totals">
        <div class="sum-top">
          <div class="lead"><b class="num" id="rLeft">0</b><span id="rUnit">kcal left</span></div>
          <div class="eaten" id="rEaten"></div>
        </div>
        <span class="bar"><i id="kFill"></i></span>
        <p class="find" id="rFind"></p>
        <button class="sumtoggle" id="sumToggle" aria-expanded="false" aria-controls="macros"><span id="sumLine"></span><i class="chev" aria-hidden="true"></i></button>
        <div class="macros" id="macros">
          <div class="mc p" id="mc-p"><span class="nm">Protein</span><span class="qt"><b class="num" id="v-p">0</b><small id="t-p"></small></span><span class="bar"><i id="f-p"></i></span></div>
          <div class="mc f" id="mc-f"><span class="nm">Fat</span><span class="qt"><b class="num" id="v-f">0</b><small id="t-f"></small></span><span class="bar"><i id="f-f"></i></span></div>
          <div class="mc c" id="mc-c"><span class="nm">Carbs</span><span class="qt"><b class="num" id="v-c">0</b><small id="t-c"></small></span><span class="bar"><i id="f-c"></i></span></div>
        </div>
      </section>
    </div></div>

    <div class="gut">
      <div class="label">Meals</div>
      <div class="list" id="meals"></div>

      <div class="label">Off-plan <span class="r" id="offTot"></span></div>
      <div class="list" id="offplan"></div>

      <div class="label">Also today</div>
      <div class="list" id="more"></div>
      <div class="previewtag">Preview with sample data.</div>
    </div>
  </section>
```

**Styles** (header, title row, summary, timeline, rows)

<sub>`src/head.html` lines 99–279</sub>

```css
  /* ── header and tab bar: glass, because the day really does scroll under them ── */
  header {
    position: absolute; top: 0; left: 0; right: 0; z-index: 30;
    backdrop-filter: blur(28px) saturate(180%); -webkit-backdrop-filter: blur(28px) saturate(180%);
    background: var(--chrome); border-bottom: 1px solid var(--line);
  }
  .hwrap { display: flex; align-items: center; gap: 10px; padding-block: 10px; max-width: 600px; margin: 0 auto; }
  .hwrap .mk { flex: none; width: 28px; height: 28px; border-radius: 8px; overflow: hidden; }
  .hwrap .mk svg { display: block; width: 100%; height: 100%; }
  .hwrap .wm { font-family: var(--mono); font-size: 15px; font-weight: 600; letter-spacing: 0.26em; text-transform: uppercase; }

  main {
    position: absolute; inset: 0; z-index: 1; overflow-y: auto; overscroll-behavior-y: contain; -webkit-overflow-scrolling: touch;
    padding-top: var(--hh, 49px); padding-bottom: calc(var(--nh, 66px) + 24px);
    scroll-padding-top: calc(var(--hh, 49px) + 56px); scroll-padding-bottom: calc(var(--nh, 66px) + 16px);
  }
  .view { max-width: 600px; margin: 0 auto; }

  /* ── title row + the thirteen weeks ── */
  .titlerow { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding-top: 16px; }
  .titlerow h1 { margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.2; }
  .titlerow .dt { font-size: 14.5px; color: var(--fg-2); }
  .weeks { display: flex; gap: 3px; margin-top: 12px; }
  .wk { flex: 1; height: 6px; border-radius: 3px; background: var(--track); min-width: 0; overflow: hidden; }
  .wk.gap { margin-left: 5px; }
  .wk.past { background: var(--teal); }
  .wk.brk { background: var(--bronze); opacity: 0.5; }
  .wk.brk.past { opacity: 1; }
  .wk.now { opacity: 1; }
  .wk.now::after { content: ""; display: block; height: 100%; width: var(--f); border-radius: 3px; background: var(--teal); }
  .wkcap { display: flex; justify-content: space-between; gap: 12px; margin-top: 8px; font-size: 13.5px; color: var(--fg-2); }
  .wkcap .k { font-family: var(--mono); font-size: 12.5px; font-variant-numeric: tabular-nums; }

  /* ── summary: one container, split by hairlines ── */
  .hero { position: relative; overflow: hidden; margin-top: 4px; padding-block: 12px 20px; }
  .hero::after {
    content: ""; position: absolute; inset: 0; pointer-events: none;
    background:
      radial-gradient(42% 52% at 24% 34%, var(--teal-dp) 0%, transparent 72%),
      radial-gradient(40% 50% at 68% 64%, var(--bronze-dp) 0%, transparent 72%),
      radial-gradient(38% 46% at 48% 12%, #1D4A45 0%, transparent 74%);
    filter: saturate(125%) blur(24px);
    -webkit-mask-image: radial-gradient(ellipse 88% 86% at 50% 44%, #000 18%, transparent 92%);
    mask-image: radial-gradient(ellipse 88% 86% at 50% 44%, #000 18%, transparent 92%);
    opacity: var(--hero-amb);
  }
  .hero > * { position: relative; z-index: 2; }
  .sum {
    position: relative; border-radius: var(--r-card); padding: 16px 16px 14px;
    backdrop-filter: blur(22px) saturate(180%); -webkit-backdrop-filter: blur(22px) saturate(180%);
    background: var(--glass-bg); border: 1px solid var(--glass-br); border-top-color: var(--glass-top);
    box-shadow: inset 0 1px 0 var(--glass-top);
  }
  .sum-top { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
  .lead { display: flex; align-items: baseline; gap: 8px; min-width: 0; }
  .lead b { font-family: var(--mono); font-size: 38px; font-weight: 600; letter-spacing: -0.03em; line-height: 1.1; }
  .lead span { font-size: 15px; color: var(--fg-2); white-space: nowrap; }
  .sum.over .lead b { color: var(--signal); }
  .eaten { flex: none; font-family: var(--mono); font-size: 13px; color: var(--fg-2); font-variant-numeric: tabular-nums; text-align: right; }
  .bar { display: block; height: 6px; border-radius: 3px; background: var(--track); overflow: hidden; }
  .bar i { display: block; height: 100%; width: 0; border-radius: 3px; min-width: 3px; background: var(--teal); transition: width .5s var(--ease), background-color .2s ease; }
  .sum > .bar { margin-top: 12px; }
  .sumtoggle { display: none; }
  .sum.over > .bar i { background: var(--signal); }
  .find { margin: 12px 0 0; font-size: 15.5px; line-height: 1.45; }
  .macros { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--line); }
  .mc { padding: 0 12px; border-left: 1px solid var(--line); min-width: 0; }
  .mc:first-child { padding-left: 0; border-left: 0; }
  .mc:last-child { padding-right: 0; }
  .mc .nm { display: block; font-size: 13.5px; color: var(--fg-2); }
  .mc .qt { display: block; margin-top: 2px; white-space: nowrap; }
  .mc .qt b { font-family: var(--mono); font-size: 22px; font-weight: 600; letter-spacing: -0.02em; }
  .mc .qt small { font-family: var(--mono); font-size: 12px; color: var(--fg-3); margin-left: 4px; }
  .mc .bar { height: 4px; margin-top: 8px; }
  .mc .bar i { min-width: 2px; }
  .mc.p .bar i { background: var(--teal); }
  .mc.f .bar i { background: var(--bronze); }
  .mc.c .bar i { background: var(--chalk); }
  .mc.over .qt b { color: var(--signal); }
  .mc.over .bar i { background: var(--signal); }

  /* ── section labels ── */
  .label { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; padding: 20px 4px 8px; font-size: 14px; font-weight: 600; color: var(--fg-2); }
  .label .r { font-weight: 400; font-size: 13.5px; color: var(--fg-3); }

  /* ── the day: a timeline where the next meal is open ── */
  .list { background: var(--card); border-radius: var(--r-card); overflow: hidden; }
  .mslot + .mslot { border-top: 1px solid var(--line); }
  .mrow { display: flex; align-items: stretch; min-height: 72px; }
  .mopen {
    flex: 1; min-width: 0; display: flex; align-items: center; gap: 12px; padding: 12px 0 12px 16px;
    background: none; border: 0; text-align: left; cursor: pointer; transition: background-color .14s ease;
  }
  .mopen:active { background: var(--fill); }
  .mopen:focus-visible, .chk:focus-visible, .sbtn:focus-visible, .bigbtn:focus-visible, .srow:focus-visible, .frow:focus-visible,
  .pbtn:focus-visible, .trow:focus-visible, .opt:focus-visible, .rp-head:focus-visible, nav button:focus-visible, .tundo:focus-visible {
    outline: 2px solid var(--teal); outline-offset: -3px; border-radius: var(--r-ctl);
  }
  .mtm { flex: none; width: 46px; font-family: var(--mono); font-size: 13px; font-weight: 500; color: var(--bronze); font-variant-numeric: tabular-nums; }
  .mbody { flex: 1; min-width: 0; display: block; }
  .mn { display: block; font-size: 17.5px; font-weight: 600; letter-spacing: -0.01em; line-height: 1.3; }
  .ms { display: block; font-size: 14px; color: var(--fg-2); margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .mkc { flex: none; font-family: var(--mono); font-size: 14px; color: var(--fg-2); font-variant-numeric: tabular-nums; text-align: right; }
  .mrow.done .mn { color: var(--fg-2); font-weight: 500; }
  .mrow.done .ms, .mrow.done .mtm, .mrow.done .mkc { color: var(--fg-3); }

  .chk { flex: none; width: 64px; background: none; border: 0; cursor: pointer; position: relative; }
  .chk::before {
    content: ""; position: absolute; left: 50%; top: 50%; width: 30px; height: 30px; margin: -15px 0 0 -15px; border-radius: 50%;
    border: 1.8px solid var(--fg-3); transition: background-color .18s ease, border-color .18s ease;
  }
  .chk::after {
    content: ""; position: absolute; left: calc(50% - 3px); top: calc(50% - 9px); width: 6px; height: 12px;
    border: solid var(--void); border-width: 0 2.2px 2.2px 0; transform: rotate(43deg) scale(0.4); opacity: 0;
    transition: opacity .16s ease, transform .24s var(--ease);
  }
  .chk[aria-pressed="true"]::before { background: var(--teal); border-color: var(--teal); }
  .chk[aria-pressed="true"]::after { opacity: 1; transform: rotate(43deg) scale(1); }
  .mrow.just .chk::before { animation: pop .38s var(--ease); }

  .egroup + .mslot { border-top: 1px solid var(--line); }
  .ehead {
    width: 100%; display: flex; align-items: center; gap: 12px; min-height: 60px; padding: 0 16px;
    background: none; border: 0; text-align: left; cursor: pointer; transition: background-color .14s ease;
  }
  .ehead:active { background: var(--fill); }
  .ehead:focus-visible { outline: 2px solid var(--teal); outline-offset: -3px; border-radius: var(--r-ctl); }
  .ehead .ek { font-size: 16.5px; font-weight: 500; color: var(--fg-2); }
  .ehead .ec { flex: 1; font-family: var(--mono); font-size: 13px; color: var(--teal); font-variant-numeric: tabular-nums; }
  .ehead .ev { font-family: var(--mono); font-size: 14px; color: var(--fg-3); font-variant-numeric: tabular-nums; }
  .ehead .chev { transition: transform .3s var(--ease); }
  .egroup.open .ehead .chev { transform: rotate(45deg); }
  .egroup.just .ec { animation: pop .38s var(--ease); display: inline-block; transform-origin: left center; }
  .ebody { display: grid; grid-template-rows: 0fr; visibility: hidden; border-top: 1px solid transparent; transition: grid-template-rows .34s var(--ease), visibility 0s .34s, border-color .2s ease; }
  .egroup.open .ebody { grid-template-rows: 1fr; visibility: visible; border-top-color: var(--line); transition-delay: 0s; }
  .ebody > div { overflow: hidden; min-height: 0; }
  .mslot.next { background: var(--fill); }
  .mcard { padding: 16px 16px 16px; }
  .mhead { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
  .mhead h3 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.25; }
  .mhead .tm { font-family: var(--mono); font-size: 14px; font-weight: 500; color: var(--bronze); }
  .mac { margin-top: 2px; font-family: var(--mono); font-size: 13px; color: var(--fg-2); font-variant-numeric: tabular-nums; }
  .items { display: flex; flex-direction: column; gap: 6px; margin: 14px 0 16px; }
  .item { display: flex; align-items: baseline; gap: 12px; font-size: 17px; line-height: 1.35; }
  .item .q { flex: none; width: 72px; text-align: right; font-family: var(--mono); font-size: 15px; color: var(--teal); font-weight: 600; font-variant-numeric: tabular-nums; }
  .item .w { flex: 1; min-width: 0; }
  .item .gs { font-family: var(--mono); font-size: 12px; color: var(--fg-3); margin-left: 6px; }
  .items.big { margin: 4px 0 20px; }
  .items.big .item { font-size: 18px; }
  .bigbtn {
    width: 100%; min-height: 54px; border: 0; border-radius: var(--r-ctl); cursor: pointer;
    background: var(--teal); color: var(--void); font-size: 16.5px; font-weight: 600; letter-spacing: 0.01em;
    transition: transform .16s var(--ease), opacity .16s ease, background-color .16s ease;
  }
  .bigbtn:active { transform: scale(0.985); opacity: 0.88; }
  .bigbtn.on { background: transparent; color: var(--fg); border: 1.5px solid var(--line-ctl); }
  .mcard .two { display: flex; gap: 8px; margin-top: 8px; }
  .sbtn {
    flex: 1; min-width: 0; min-height: 48px; border-radius: var(--r-ctl); cursor: pointer;
    background: transparent; border: 1px solid var(--line-ctl); color: var(--fg);
    font-size: 15px; font-weight: 600; transition: background-color .16s ease, transform .16s var(--ease);
  }
  .sbtn:active { background: var(--card); transform: scale(0.985); }
  .sbtn.rec { color: var(--bronze); }
  .alldone { padding: 16px; font-size: 15px; color: var(--fg-2); border-top: 1px solid var(--line); }
  .alldone b { color: var(--teal); font-weight: 600; }

  /* ── the rest of the day: three rows ── */
  .srow {
    width: 100%; display: flex; align-items: center; gap: 12px; min-height: 60px; padding: 0 16px;
    background: none; border: 0; border-top: 1px solid var(--line); text-align: left; cursor: pointer; transition: background-color .14s ease;
  }
  .srow:first-child { border-top: 0; }
  .srow:active { background: var(--fill); }
  .srow .sk { flex: 1; font-size: 17px; font-weight: 500; }
  .srow .sv { font-family: var(--mono); font-size: 14px; color: var(--fg-2); font-variant-numeric: tabular-nums; }
  .srow .sv.on { color: var(--teal); }
  .srow .sv.zero { font-family: var(--sans); color: var(--fg-3); }
  .chev { flex: none; width: 8px; height: 8px; border: solid var(--fg-3); border-width: 0 2px 2px 0; transform: rotate(-45deg); margin-right: 3px; }
  .previewtag { text-align: center; font-size: 12.5px; color: var(--fg-3); padding-top: 24px; }

```

**Render code**

<sub>`src/js-today.js` — itemsHtml, renderTop, finding, renderHero, rowHtml, cardHtml, renderMeals, renderOffPlan</sub>

```js
  function itemsHtml(parts, mealId) {
    var n = 0, sk = {};
    if (mealId) { parts.forEach(function (pt) { if (eatable(pt)) n++; }); sk = skipOf(mealId); }
    var toggle = !!mealId && n >= 1;
    return parts.map(function (pt, i) {
      var q, w, none = pt.skip || (!pt.noun && pt.g === 0);
      if (none)         { q = "none"; w = esc(pt.name) + '<span class="gs">' + (pt.skip ? "protein covers the fat" : "trimmed for today") + "</span>"; }
      else if (pt.noun) { q = String(pt.n); w = pt.noun + '<span class="gs">' + pt.sub + "</span>"; }
      else              { q = pt.g + " g"; w = esc(pt.name); }
      var off = pt.off || (toggle && sk[i]);
      if (toggle && !none) {
        return '<button class="item tg' + (off ? " off" : "") + '" data-sk="' + i + '" aria-pressed="' + !off + '" aria-label="' + esc(pt.name) + ', ' + (off ? "skipped" : "eating") + '">' +
          '<span class="q">' + q + '</span><span class="w">' + w + '</span><span class="ck" aria-hidden="true"></span></button>';
      }
      return '<div class="item' + (off ? " off" : "") + '"><span class="q">' + q + '</span><span class="w">' + w + "</span></div>";
    }).join("");
  }

  function renderTop() {
    $("hDate").textContent = new Date().toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
    var wk = weekNumber(), ph = currentPhase();
    var d = Math.max(0, dayDiff(START, TODAY)), frac = Math.round(Math.min(1, ((d % 7) + 1) / 7) * 100);
    var html = "";
    for (var w = 1; w <= 13; w++) {
      var first = false;
      PHASES.forEach(function (p) { if (p.w[0] === w && w !== 1) first = true; });
      var cls = "wk" + (first ? " gap" : "") + (w === 9 ? " brk" : "") + (w < wk ? " past" : (w === wk ? " now" : ""));
      html += '<i class="' + cls + '"' + (w === wk ? ' style="--f:' + frac + '%"' : "") + "></i>";
    }
    $("weeks").innerHTML = html;
    $("weeks").setAttribute("aria-label", "Week " + wk + " of 13, " + ph.n);
    $("wkL").textContent = "Week " + wk + " of 13 · " + ph.n;
    $("wkR").textContent = fmt(ph.kcal) + " kcal a day";
  }

  function finding(tg, e, left) {
    var todo = 0;
    MEALS.forEach(function (m) { if (!handled(m[0])) todo++; });
    var pLeft = tg.p - e.p, off = (S.extras[TODAY] || []).length;
    if (left < 0) {
      var over = -left;
      return over <= COACH.margin ? "Inside the 150 kcal margin, so tomorrow stays the same."
                                  : "Tomorrow’s target drops by " + Math.min(300, over) + " kcal to make it up.";
    }
    if (off && TRIM.on) {
      var bits = [];
      if (TRIM.fatG >= 1) bits.push(Math.round(TRIM.fatG) + " g fat");
      if (TRIM.carbG >= 1) bits.push(Math.round(TRIM.carbG) + " g carbs");
      var s = "The rest of today gives up " + (bits.join(" and ") || "a little") + " to cover it. Protein stays.";
      var still = Math.round(TRIM.over - TRIM.achieved);
      if (still > COACH.margin) s += " Still " + fmt(still) + " kcal over, so tomorrow drops by " + Math.min(300, still) + ".";
      return s;
    }
    if (off && TRIM.over <= COACH.margin) return "Your off-plan food is inside the 150 kcal margin, so the plan stays as written.";
    if (!todo) return pLeft > 0 ? "All meals logged. Protein is " + pLeft + " g short." : "All meals logged. Protein is covered.";
    var meals = todo + (todo === 1 ? " meal" : " meals") + " to go";
    return pLeft > 0 ? meals + ", " + pLeft + " g protein still to eat." : "Protein is covered. " + meals + ".";
  }

  function renderHero() {
    var tg = todayTarget(), e = eatenOn(TODAY), left = tg.k - e.k, over = left < 0;
    tween($("rLeft"), Math.abs(left));
    $("rUnit").textContent = over ? "kcal over" : "kcal left";
    $("sum").className = "sum" + (over ? " over" : "") + ($("sum").classList.contains("open") ? " open" : "");
    $("rEaten").textContent = fmt(e.k) + " of " + fmt(tg.k);
    $("kFill").style.width = Math.min(100, e.k / tg.k * 100) + "%";
    $("rFind").textContent = finding(tg, e, left);
    $("sumLine").textContent = "P " + e.p + "/" + tg.p + " · F " + e.f + "/" + tg.f + " · C " + e.c + "/" + tg.c;
    var kp = Math.min(100, e.k / tg.k * 100);
    $("m-k").textContent = fmt(Math.abs(left)); $("m-ku").textContent = over ? "over" : "left";
    $("mf-k").style.width = kp + "%"; $("mc-k").className = "mc4 k" + (over ? " over" : "");
    [["p", e.p, tg.p], ["f", e.f, tg.f], ["c", e.c, tg.c]].forEach(function (d) {
      tween($("v-" + d[0]), d[1]);
      $("t-" + d[0]).textContent = "/ " + d[2] + " g";
      $("f-" + d[0]).style.width = Math.min(100, d[1] / d[2] * 100) + "%";
      $("mc-" + d[0]).className = "mc " + d[0] + (d[1] > d[2] ? " over" : "");
      $("m-" + d[0]).textContent = d[1];
      $("mf-" + d[0]).style.width = Math.min(100, d[1] / d[2] * 100) + "%";
      $("mc4-" + d[0]).className = "mc4 " + d[0] + (d[1] > d[2] ? " over" : "");
    });
  }

  function rowHtml(m) {
    var id = m[0], b = mealView(id), pick = pickFor(id), done = isDone(id), skd = isSkipped(id);
    var names = m[6].map(function (cat) { return shortName(cat, pick[cat]); }).join(" · ");
    var sn = done && snapOf(TODAY, id);
    if (sn) {
      var off = [], on = [];
      sn.parts.forEach(function (pt) { if (pt.off) off.push(pt.name.toLowerCase()); else if (eatable(pt)) on.push(pt.name.split(",")[0]); });
      if (off.length) names = on.join(" · ") + " · skipped " + off.join(", ");
    }
    if (skd) names = "Skipped";
    return '<div class="mslot" data-m="' + id + '"><div class="mrow' + (done ? " done" : "") + (skd ? " skipped" : "") + '">' +
      '<button class="mopen" data-open="' + id + '" aria-label="' + m[2] + ', details">' +
        '<span class="mtm">' + m[1] + '</span>' +
        '<span class="mbody"><span class="mn">' + m[2] + '</span><span class="ms">' + names + "</span></span>" +
        '<span class="mkc">' + (skd ? "—" : b.tot.k) + "</span></button>" +
      (skd ? '<button class="chk undo" data-unskip="' + id + '" aria-label="Undo skip of ' + m[2] + '">Undo</button>'
           : '<button class="chk" data-ate="' + id + '" aria-pressed="' + done + '" aria-label="' + (done ? "Undo " + m[2] : "Mark " + m[2] + " eaten") + '"></button>') + "</div></div>";
  }

  function cardHtml(m) {
    var id = m[0], b = selView(id), hits = methodsFor(id);
    return '<div class="mslot next" data-m="' + id + '"><div class="mcard">' +
      '<div class="mhead"><h3>' + m[2] + '</h3><span class="tm">' + m[1] + "</span></div>" +
      '<div class="mac">' + macLine(b.tot) + "</div>" + trimNote(id) +
      '<div class="items">' + itemsHtml(b.parts, id) + "</div>" + skipSlot(b) +
      (b.allOff ? '<button class="bigbtn skip" data-skipmeal="' + id + '">Skip ' + m[2].toLowerCase() + "</button>" : '<button class="bigbtn" data-ate="' + id + '">Ate it</button>') +
      '<div class="two"><button class="sbtn" data-open="' + id + '">Change foods</button>' +
      (hits.length ? '<button class="sbtn rec" data-rec="' + id + '">Recipes · ' + hits.length + "</button>" : "") +
      "</div></div></div>";
  }

  function renderMeals() {
    var nx = nextMeal(), html = "", eaten = MEALS.filter(function (m) { return isDone(m[0]); }), ek = 0;
    if (eaten.length) {
      eaten.forEach(function (m) { ek += mealView(m[0]).tot.k; });
      html += '<div class="egroup' + (eatenOpen ? " open" : "") + (justAte ? " just" : "") + '" data-m="eg">' +
        '<button class="ehead" data-egroup aria-expanded="' + eatenOpen + '"><span class="ek">Eaten</span><span class="ec">' + eaten.length + " of " + MEALS.length +
        '</span><span class="ev">' + fmt(ek) + ' kcal</span><i class="chev"></i></button>' +
        '<div class="ebody"><div>' + eaten.map(rowHtml).join("") + "</div></div></div>";
    }
    MEALS.forEach(function (m) {
      if (isDone(m[0])) return;
      html += m[0] === nx ? cardHtml(m) : rowHtml(m);
    });
    if (!nx) {
      var nsk = MEALS.filter(function (m) { return isSkipped(m[0]); }).length;
      html += '<div class="alldone"><b>Done.</b> ' + (nsk ? (MEALS.length - nsk) + " meals logged, " + nsk + " skipped." : "All five meals are logged.") + "</div>";
    }
    $("meals").innerHTML = html;
    justAte = null;
  }

  function renderOffPlan() {
    var ex = S.extras[TODAY] || [], tot = 0;
    ex.forEach(function (e) { tot += e.k || 0; });
    $("offTot").textContent = ex.length ? "+" + fmt(tot) + " kcal" : "";
    $("offplan").innerHTML = ex.map(function (e, i) {
      return '<div class="xrow"><div class="xb"><b>' + esc(e.n) + "</b><span>" + (e.k || 0) + " kcal · " + (e.p || 0) + "P " + (e.f || 0) + "F " + (e.c || 0) + "C" +
        (e.src === "estimate" ? " · estimate" : (e.src === "label" ? " · label" : (e.src === "database" ? " · USDA" : ""))) + '</span></div>' +
        '<button class="pbtn" data-od="' + i + '" aria-label="Remove ' + esc(e.n) + '">' + ICON_X + "</button></div>";
    }).join("") + '<button class="srow" data-sheet="add"><span class="sk">' + (ex.length ? "Add more" : "Add off-plan food") + '</span><i class="chev"></i></button>';
  }
```

## 5. Search screen

A bottom sheet with a segmented control (Search · Describe · Label · Numbers; Describe and Label only appear when Claude is available). Search is offline and instant: every typed word must start a word in the USDA description, and plain raw foods rank first.

**Styles** (sheet, option list, segmented control, add-food extras)

<sub>`src/head.html` lines 280–333</sub>

```css
  /* ── bottom sheet ── */
  .sheetwrap { position: fixed; inset: 0; z-index: 60; }
  .scrim { position: absolute; inset: 0; background: var(--scrim); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); opacity: 0; transition: opacity .24s ease; touch-action: none; }
  .panel {
    position: absolute; left: 0; right: 0; bottom: 0; margin: 0 auto; max-width: 600px; max-height: 92%;
    display: flex; flex-direction: column; background: var(--card); border-radius: 24px 24px 0 0;
    transform: translateY(105%); transition: transform .34s var(--ease);
    padding-bottom: env(safe-area-inset-bottom, 0px);
    box-shadow: 0 -10px 36px rgba(0,0,0,0.30); /* taste-skill-ignore: a sheet floats */
  }
  .sheetwrap.open .scrim { opacity: 1; }
  .sheetwrap.open .panel { transform: none; }
  .grab { flex: none; width: 38px; height: 5px; border-radius: 3px; background: var(--fg-3); opacity: 0.55; margin: 9px auto 0; }
  .phead { flex: none; display: flex; align-items: center; gap: 4px; padding: 6px 8px 8px 12px; }
  .pbtn {
    flex: none; width: 44px; height: 44px; border: 0; background: none; cursor: pointer; border-radius: 50%;
    display: flex; align-items: center; justify-content: center; color: var(--fg-2); transition: background-color .14s ease;
  }
  .pbtn:active { background: var(--fill); }
  .pbtn svg { width: 20px; height: 20px; display: block; }
  .pt { flex: 1; min-width: 0; padding: 0 4px; }
  .pt b { display: block; font-size: 21px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.25; }
  .pt span { display: block; font-family: var(--mono); font-size: 12.5px; color: var(--fg-2); margin-top: 2px; font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pbody { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 8px 16px 16px; }
  .pfoot { flex: none; padding: 10px 16px 14px; display: flex; flex-direction: column; gap: 8px; border-top: 1px solid var(--line); }
  .plabel { font-size: 14px; font-weight: 600; color: var(--fg-2); padding: 0 4px 8px; }
  .fgroup { background: var(--fill); border-radius: var(--r-card); overflow: hidden; }
  .frow {
    width: 100%; display: flex; align-items: center; gap: 12px; min-height: 56px; padding: 0 16px;
    background: none; border: 0; border-top: 1px solid var(--line); text-align: left; cursor: pointer; position: relative; transition: background-color .14s ease;
  }
  .fgroup > :first-child { border-top: 0; }
  .frow:active { background: var(--card); }
  .fk { flex: none; width: 84px; font-size: 14px; color: var(--fg-2); text-transform: capitalize; }
  .fv { flex: 1; min-width: 0; font-size: 17px; font-weight: 500; }
  .fsel {
    -webkit-appearance: none; appearance: none; flex: 1; min-width: 0; height: 100%; min-height: 56px; border: 0; background: transparent; color: var(--fg);
    font-family: var(--sans); font-size: 17px; font-weight: 500; padding: 0; cursor: pointer;
  }
  .fsel:focus-visible { outline: 2px solid var(--teal); outline-offset: -3px; border-radius: var(--r-ctl); }
  .opt { width: 100%; display: flex; align-items: center; gap: 12px; min-height: 62px; padding: 8px 16px; background: none; border: 0; border-top: 1px solid var(--line); text-align: left; cursor: pointer; transition: background-color .14s ease; }
  .opt:first-child { border-top: 0; }
  .opt:active { background: var(--card); }
  .opt .ob { flex: 1; min-width: 0; display: block; }
  .opt .on1 { display: block; font-size: 17px; font-weight: 500; }
  .opt .on2 { display: block; font-family: var(--mono); font-size: 12.5px; color: var(--fg-3); margin-top: 1px; font-variant-numeric: tabular-nums; }
  .opt.sel .on1 { color: var(--teal); font-weight: 600; }
  .opt .tick { flex: none; width: 10px; height: 18px; border: solid var(--teal); border-width: 0 2.4px 2.4px 0; transform: rotate(43deg) scale(0.7); opacity: 0; transition: transform .24s var(--ease), opacity .16s ease; margin-right: 4px; }
  .opt.sel .tick { transform: rotate(43deg) scale(1); opacity: 1; }

  .trow { width: 100%; display: flex; align-items: center; gap: 14px; min-height: 62px; padding: 8px 16px; background: none; border: 0; border-top: 1px solid var(--line); text-align: left; cursor: pointer; transition: background-color .14s ease; }
  .trow:first-child { border-top: 0; }
  .trow:active { background: var(--card); }
  .trow .tb { flex: 1; min-width: 0; display: block; }
```

<sub>`src/head.html` lines 446–470</sub>

```css
  /* ── coach note, add-food sheet ── */
  .trimnote { margin-top: 4px; font-family: var(--mono); font-size: 12.5px; color: var(--bronze); font-variant-numeric: tabular-nums; }
  .seg { display: flex; gap: 4px; padding: 4px; margin-bottom: 4px; background: var(--fill); border-radius: var(--r-ctl); }
  .segb { flex: 1; min-width: 0; min-height: 40px; border: 0; border-radius: 11px; background: transparent; color: var(--fg-2); font-size: 14.5px; font-weight: 600; cursor: pointer; transition: background-color .18s ease, color .18s ease; }
  .segb.on { background: var(--card); color: var(--fg); }
  .segb:focus-visible { outline: 2px solid var(--teal); outline-offset: -2px; }
  .aihint { margin: 10px 4px 0; font-size: 13.5px; line-height: 1.45; color: var(--fg-2); }
  .bigbtn.alt { margin-top: 12px; background: transparent; color: var(--teal); border: 1.5px solid var(--teal); }
  .bigbtn.wait { margin-top: 12px; background: var(--fill); color: var(--fg-2); }
  .bigbtn:disabled { opacity: 0.4; cursor: default; }
  .vh { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; }
  .photobtn { display: flex; align-items: center; justify-content: center; min-height: 54px; margin-top: 12px; padding: 0 16px; text-align: center; border-radius: var(--r-ctl); border: 1.5px dashed var(--line-ctl); color: var(--fg); font-size: 15.5px; font-weight: 600; cursor: pointer; }
  .photobtn:active { background: var(--fill); }
  .vh:focus-visible + .thumb, .vh:focus-visible ~ .aihint { outline: 0; }
  .photobtn:focus-within { outline: 2px solid var(--teal); }
  .thumb { display: block; width: 100%; max-height: 88px; object-fit: cover; margin-top: 12px; border-radius: var(--r-ctl); background: var(--fill); }
  .lblhead { margin-top: 16px; padding: 0 4px; scroll-margin-top: 8px; }
  .flabel { scroll-margin-top: 8px; }
  .lblhead b { display: block; font-size: 18px; font-weight: 700; letter-spacing: -0.01em; }
  .lblhead span { font-size: 14.5px; color: var(--fg-2); }
  .amtin { display: flex; gap: 8px; }
  .amtin input { flex: 0 0 38%; }
  .amtsel { -webkit-appearance: none; appearance: none; flex: 1; min-width: 0; height: 52px; padding: 0 14px; border: 1px solid transparent; border-radius: var(--r-ctl); background: var(--fill); color: var(--fg); font-family: var(--sans); font-size: 16px; font-weight: 500; }
  .amtsel:focus-visible { outline: 0; border-color: var(--teal); }

```

**Search code**

<sub>`src/js-search.js`, whole file</sub>

```js
  // ── Food search: the USDA table that ships inside this file. Offline, exact, no Claude needed. ──
  var DBR = null;
  function dbLoad() {
    if (DBR) return DBR;
    var el = document.getElementById("foodsDB"), out = [];
    (el ? el.textContent : "").split("\n").forEach(function (ln) {
      var a = ln.split("\t");
      if (a.length < 6) return;
      out.push({ id: a[0], d: a[1], dl: a[1].toLowerCase(), k: +a[2], p: +a[3], f: +a[4], c: +a[5], por: a[6] || "" });
    });
    DBR = out;
    return out;
  }
  function wordAt(dl, tok) {
    var p = dl.indexOf(tok);
    while (p >= 0) {
      if (p === 0 || !/[a-z0-9]/.test(dl.charAt(p - 1))) return p;
      p = dl.indexOf(tok, p + 1);
    }
    return -1;
  }
  // Every word must start a word in the description. Plain, short, raw entries rank first.
  function searchFoods(q) {
    var toks = q.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    if (!toks.length) return [];
    var db = dbLoad(), res = [], i, j;
    for (i = 0; i < db.length; i++) {
      var r = db[i], dl = r.dl, ok = true, score = 0;
      for (j = 0; j < toks.length; j++) {
        var pos = wordAt(dl, toks[j]);
        if (pos < 0) { ok = false; break; }
        score += pos === 0 ? 0 : 14 + Math.min(pos, 60) / 4;
        var after = dl.charAt(pos + toks[j].length), after2 = dl.charAt(pos + toks[j].length + 1);
        var whole = !/[a-z0-9]/.test(after) || (after === "s" && !/[a-z0-9]/.test(after2));
        if (whole) score -= 14;                                    // "egg" is Egg, not Eggplant
      }
      if (!ok) continue;
      score += dl.length / 4 + (dl.split(",").length - 1) * 3;
      if (dl.indexOf(toks[0] + ",") === 0) score -= 8;
      if (dl.indexOf(", " + toks[0] + ",") >= 0) score -= 8;                // "Fish, salmon, ..." counts as salmon
      if (/, whole\b/.test(dl)) score -= 3;               // "Rice, white..." before "Rice noodles"
      if (/, raw\b|, fresh\b/.test(dl)) score -= 12;
      if (!/dry|dried|powder|canned|evaporated|condensed|frozen/.test(q.toLowerCase()) && /\b(dry|dried|powder|evaporated|condensed|canned)\b/.test(dl)) score += 10;
      if (/\bcooked\b|\broasted\b|\bboiled\b/.test(dl)) score -= 4;
      if (/^[A-Z0-9'&-]{3,}\b/.test(r.d)) score += 10;                          // a brand name first
      res.push([score, i]);
    }
    res.sort(function (a, b) { return a[0] - b[0]; });
    return res.slice(0, 12).map(function (x) { return db[x[1]]; });
  }
  function cleanName(d) { return d.replace(/\s*\([^)]*\)/g, "").replace(/\s+/g, " ").trim(); }
  function hitsHtml() {
    if (!sh.q || !sh.q.trim()) return '<p class="aihint" style="margin-top:12px">Type a food, like orange juice or chicken breast. Values are USDA, per 100 g.</p>';
    if (!sh.hits.length) return '<p class="aihint" style="margin-top:12px">Nothing matches that. Try fewer words, or use Describe or Label.</p>';
    return '<div class="fgroup" style="margin-top:12px">' + sh.hits.map(function (r, i) {
      return '<button class="opt" data-hit="' + i + '"><span class="ob"><span class="on1">' + esc(cleanName(r.d)) + '</span><span class="on2">per 100 g · ' + r.k + " kcal · " + r.p + "P " + r.f + "F " + r.c + "C</span></span></button>";
    }).join("") + "</div>";
  }
  // The portions a food comes with: cup, tbsp, slice and so on, each as grams for one.
  function unitsOf(r) {
    var u = [{ v: "g", l: "g", g: 1 }], flOz = 0;
    r.por.split("|").forEach(function (x) {
      var a = x.split("~");
      if (a.length < 3) return;
      var amt = +a[0], mod = a[1], g = +a[2];
      if (!(amt > 0) || !(g > 0)) return;
      var per = g / amt;
      if (mod === "fl oz") flOz = per;
      var lab = mod.length > 30 ? mod.slice(0, 28) + "…" : mod;
      u.push({ v: "p" + u.length, l: lab + " (" + Math.round(per) + " g)", g: per });
    });
    if (flOz) u.splice(1, 0, { v: "ml", l: "ml", g: flOz / 29.5735 });
    return u;
  }
  function findBlock() {
    var q = '<label class="flabel" for="qIn">Search foods</label>' +
      '<input id="qIn" type="search" autocomplete="off" enterkeyhint="search" placeholder="Orange juice, chicken breast, oats…" value="' + esc(sh.q || "") + '">';
    if (sh.pick) {
      var r = sh.pick;
      return '<div class="lblhead"><b>' + esc(cleanName(r.d)) + '</b><span>USDA per 100 g · ' + r.k + " kcal · " + r.p + "P " + r.f + "F " + r.c + 'C</span></div>' +
        '<button class="sbtn" style="margin-top:10px;flex:none;width:100%" data-unpick>Search for something else</button>';
    }
    return q + '<div id="qRes">' + hitsHtml() + "</div>";
  }
  function pickFood(i) {
    var r = sh.hits[i]; if (!r) return;
    sh.pick = r; sh.units = unitsOf(r); sh.err = "";
    var liquid = sh.units.some(function (u) { return u.v === "ml"; });
    sh.amt = liquid ? { n: 250, u: "ml" } : { n: 100, u: "g" };
    sh.draft = { name: "", k: "", p: "", f: "", c: "", src: "database" };
    sh.note = ""; sh.ready = true; foodCalc(); paintSheet(); toForm();
  }
  // grams eaten -> macros, from the per-100 g row
  function foodCalc() {
    var r = sh.pick, a = sh.amt; if (!r || !a || !(a.n > 0)) return;
    var un = null;
    sh.units.forEach(function (u) { if (u.v === a.u) un = u; });
    if (!un) return;
    var g = a.n * un.g, f = g / 100;
    sh.draft.k = String(Math.round(r.k * f)); sh.draft.p = String(r1(r.p * f)); sh.draft.f = String(r1(r.f * f)); sh.draft.c = String(r1(r.c * f));
    var amtText = a.u === "g" ? Math.round(g) + " g" : (a.u === "ml" ? a.n + " ml" : a.n + " × " + un.l.replace(/ \(.*$/, ""));
    var short = cleanName(r.d).split(",").slice(0, 2).join(",").trim();
    sh.draft.name = (short + " (" + amtText + ")").slice(0, 60);
    sh.note = "About " + Math.round(g) + " g from the USDA table." + (a.u === "ml" ? " Millilitres use this food’s own density." : "");
  }
  function calcAmount() { if (sh.tab === "find") foodCalc(); else labelCalc(); }
```

**Sheet shell and the Add view**

<sub>`src/js-today.js` — openSheet, closeSheet, phead, paintSheet, viewAdd</sub>

```js
  function openSheet(s) {
    if (s.view === "add") { s.tab = "find"; s.q = ""; s.hits = []; s.pick = null; s.units = []; s.draft = { name: "", k: "", p: "", f: "", c: "", src: "manual" }; s.ready = false; s.note = ""; s.err = ""; s.busy = ""; s.dText = ""; s.label = null; s.thumb = ""; }
    sh = s; paintSheet(); hideToast();
    var w = $("sheetWrap");
    clearTimeout(closeT);
    w.hidden = false; void w.offsetWidth; w.classList.add("open");
  }

  function closeSheet() {
    var w = $("sheetWrap");
    if (sh && sh.ctl) { try { sh.ctl.abort(); } catch (e) {} }
    if (sh && sh.thumb) { try { URL.revokeObjectURL(sh.thumb); } catch (e2) {} }
    sh = null; w.classList.remove("open");
    clearTimeout(closeT);
    closeT = setTimeout(function () { if (!sh) w.hidden = true; }, 340);
  }

  function phead(title, sub, back) {
    return '<div class="grab"></div><div class="phead">' +
      (back ? '<button class="pbtn" data-back aria-label="Back">' + ICON_BACK + "</button>" : "") +
      '<div class="pt"><b>' + title + "</b>" + (sub ? "<span>" + sub + "</span>" : "") + "</div>" +
      '<button class="pbtn" data-close aria-label="Close">' + ICON_X + "</button></div>";
  }

  function paintSheet() {
    var h = sh.view === "meal" ? viewMeal() : sh.view === "pick" ? viewPick() : sh.view === "rec" ? viewRec()
          : sh.view === "add" ? viewAdd() : sh.view === "photo" ? viewPhoto() : viewList(sh.view);
    $("panel").innerHTML = h;
  }

  function viewAdd() {
    var d = sh.draft, ex = S.extras[TODAY] || [], tab = sh.tab;
    var tabs = [["find", "Search"]];
    if (AI.text) tabs.push(["desc", "Describe"]);
    if (AI.images) tabs.push(["photo", "Label"]);
    tabs.push(["num", "Numbers"]);
    if (!tabs.some(function (t) { return t[0] === tab; })) tab = sh.tab = "num";
    var seg = tabs.length > 1 ? '<div class="seg" role="tablist" aria-label="How to add it">' + tabs.map(function (t) {
      return '<button role="tab" class="segb' + (t[0] === tab ? " on" : "") + '" aria-selected="' + (t[0] === tab) + '" data-tab="' + t[0] + '">' + t[1] + "</button>";
    }).join("") + "</div>" : "";

    var top = "", showForm = tab === "num" || sh.ready;
    if (tab === "find") {
      top = findBlock();
    } else if (tab === "desc") {
      top = '<label class="flabel" for="dText">What did you have, and how much?</label>' +
        '<input id="dText" type="text" autocomplete="off" enterkeyhint="go" placeholder="Fresh orange juice, 300 ml" value="' + esc(sh.dText || "") + '">' +
        (sh.busy === "desc"
          ? '<button class="bigbtn wait" data-stop>Estimating… tap to stop</button>'
          : '<button class="bigbtn alt" id="dGo">Estimate</button>') +
        '<p class="aihint">Claude estimates this from typical values. Check the numbers before you add it.</p>';
    } else if (tab === "photo") {
      top = '<label class="photobtn" for="lblFile">' + (sh.thumb ? "Take or choose another photo" : "Take or choose a photo of the back of the pack") + "</label>" +
        '<input class="vh" type="file" id="lblFile" accept="' + AI.types + '">' +
        (sh.thumb ? '<img class="thumb" src="' + sh.thumb + '" alt="Your label photo">' : "") +
        (sh.busy === "photo" ? '<button class="bigbtn wait" data-stop>Reading the label… tap to stop</button>' : "") +
        '<p class="aihint">Show the brand and the nutrition table. Claude reads it for this entry. The photo is not saved.</p>';
    }
    var amount = "";
    if (tab === "photo" && sh.label && sh.ready) {
      var L = sh.label, opts = [];
      if (L.per || (L.per100 && L.sa)) opts.push(["serv", "serving" + (sh.amt.n === 1 ? "" : "s") + (L.sa ? " (" + L.sa + " " + L.bu + ")" : "")]);
      if (L.per100 || (L.per && L.sa)) opts.push([L.bu, L.bu]);
      amount = '<div class="lblhead"><b>' + esc(L.brand || "Unknown brand") + "</b><span>" + esc(L.product || "") + "</span></div>" +
        '<div class="amtrow"><label class="flabel" for="aAmt">How much did you eat?</label>' +
        '<div class="amtin"><input id="aAmt" class="m" type="number" inputmode="decimal" step="any" value="' + sh.amt.n + '">' +
        '<select id="aUnit" class="amtsel" aria-label="Unit">' + opts.map(function (o) {
          return '<option value="' + o[0] + '"' + (o[0] === sh.amt.u ? " selected" : "") + ">" + o[1] + "</option>";
        }).join("") + "</select></div></div>";
    }
    if (tab === "find" && sh.pick && sh.ready) {
      amount = '<div class="amtrow"><label class="flabel" for="aAmt">How much did you have?</label>' +
        '<div class="amtin"><input id="aAmt" class="m" type="number" inputmode="decimal" step="any" value="' + sh.amt.n + '">' +
        '<select id="aUnit" class="amtsel" aria-label="Unit">' + sh.units.map(function (o) {
          return '<option value="' + esc(o.v) + '"' + (o.v === sh.amt.u ? " selected" : "") + ">" + esc(o.l) + "</option>";
        }).join("") + "</select></div></div>";
    }
    var form = "";
    if (showForm) {
      form = amount + '<label class="flabel" for="fName">Name</label><input id="fName" type="text" autocomplete="off" placeholder="Shawarma, 2 biscuits…" value="' + esc(d.name) + '">' +
        '<label class="flabel" for="fKcal">Calories</label><input id="fKcal" class="m" type="number" inputmode="numeric" step="any" placeholder="kcal" value="' + esc(d.k) + '">' +
        '<div class="flabel">Macros in grams, if you know them</div>' +
        '<div class="fin3"><input id="fP" class="m" type="number" inputmode="decimal" step="any" placeholder="Protein" aria-label="Protein grams" value="' + esc(d.p) + '">' +
        '<input id="fF" class="m" type="number" inputmode="decimal" step="any" placeholder="Fat" aria-label="Fat grams" value="' + esc(d.f) + '">' +
        '<input id="fC" class="m" type="number" inputmode="decimal" step="any" placeholder="Carbs" aria-label="Carb grams" value="' + esc(d.c) + '"></div>' +
        (sh.note ? '<p class="aihint" id="aNote">' + esc(sh.note) + "</p>" : "");
    }
    var err = sh.err ? '<p class="ferr" id="fErr">' + esc(sh.err) + "</p>" : '<p class="ferr" id="fErr" hidden></p>';
    var list = ex.length ? '<div class="plabel" style="padding-top:22px">Logged today</div><div class="fgroup">' + ex.map(function (e, i) {
      return '<div class="xrow"><div class="xb"><b>' + esc(e.n) + "</b><span>" + (e.p || 0) + "P · " + (e.f || 0) + "F · " + (e.c || 0) + "C" + (e.src === "estimate" ? " · estimate" : (e.src === "label" ? " · label" : "")) + '</span></div><span class="xk">' + (e.k || 0) +
        ' kcal</span><button class="pbtn" data-xdel="' + i + '" aria-label="Remove ' + esc(e.n) + '">' + ICON_X + "</button></div>";
    }).join("") + "</div>" : "";
    return phead("Off-plan food", "Counts toward today", false) +
      '<div class="pbody">' + seg + top + form + err + list + "</div>" +
      '<div class="pfoot"><button class="bigbtn" id="fAdd"' + (addValid() ? "" : " disabled") + '>Add to today</button></div>';
  }
```

## 6. Food detail / logging modal

After a result is tapped, the same sheet switches to the amount form: quantity and unit (g, ml, or the food's own portions such as "cup" or "slice"), an editable name, calories, and three macros, all pre-filled from the USDA row and recalculated as the amount changes. "Add to today" enables once name and calories are valid, and the entry appears under "Logged today" with a remove button.

**Styles** (forms)

<sub>`src/head.html` lines 366–384</sub>

```css
  /* ── forms in the sheet ── */
  .flabel { display: block; font-size: 14px; color: var(--fg-2); padding: 12px 4px 7px; }
  .fin3 { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 8px; }
  .pbody input {
    width: 100%; min-width: 0; -webkit-appearance: none; appearance: none; height: 52px;
    background: var(--fill); border: 1px solid transparent; border-radius: var(--r-ctl); color: var(--fg);
    padding: 0 14px; font-family: var(--sans); font-size: 17px; font-weight: 500;
  }
  .pbody input::placeholder { color: var(--fg-3); }
  .pbody input:focus-visible { outline: 0; border-color: var(--teal); }
  .pbody input.m { font-family: var(--mono); font-variant-numeric: tabular-nums; }
  .ferr { margin: 10px 4px 0; font-size: 14px; color: var(--signal); line-height: 1.4; }
  .xrow { display: flex; align-items: center; gap: 12px; min-height: 60px; padding: 6px 4px 6px 16px; border-top: 1px solid var(--line); }
  .xrow:first-child { border-top: 0; }
  .xrow .xb { flex: 1; min-width: 0; }
  .xrow .xb b { display: block; font-size: 17px; font-weight: 500; }
  .xrow .xb span { font-family: var(--mono); font-size: 12.5px; color: var(--fg-3); }
  .xrow .xk { font-family: var(--mono); font-size: 14px; color: var(--fg-2); font-variant-numeric: tabular-nums; }

```

<sub>`src/head.html` lines 462–470</sub>

```css
  .lblhead { margin-top: 16px; padding: 0 4px; scroll-margin-top: 8px; }
  .flabel { scroll-margin-top: 8px; }
  .lblhead b { display: block; font-size: 18px; font-weight: 700; letter-spacing: -0.01em; }
  .lblhead span { font-size: 14.5px; color: var(--fg-2); }
  .amtin { display: flex; gap: 8px; }
  .amtin input { flex: 0 0 38%; }
  .amtsel { -webkit-appearance: none; appearance: none; flex: 1; min-width: 0; height: 52px; padding: 0 14px; border: 1px solid transparent; border-radius: var(--r-ctl); background: var(--fill); color: var(--fg); font-family: var(--sans); font-size: 16px; font-weight: 500; }
  .amtsel:focus-visible { outline: 0; border-color: var(--teal); }

```

**Logging code**

<sub>`src/js-search.js` — unitsOf, pickFood, foodCalc, calcAmount</sub>

```js
  function unitsOf(r) {
    var u = [{ v: "g", l: "g", g: 1 }], flOz = 0;
    r.por.split("|").forEach(function (x) {
      var a = x.split("~");
      if (a.length < 3) return;
      var amt = +a[0], mod = a[1], g = +a[2];
      if (!(amt > 0) || !(g > 0)) return;
      var per = g / amt;
      if (mod === "fl oz") flOz = per;
      var lab = mod.length > 30 ? mod.slice(0, 28) + "…" : mod;
      u.push({ v: "p" + u.length, l: lab + " (" + Math.round(per) + " g)", g: per });
    });
    if (flOz) u.splice(1, 0, { v: "ml", l: "ml", g: flOz / 29.5735 });
    return u;
  }

  function pickFood(i) {
    var r = sh.hits[i]; if (!r) return;
    sh.pick = r; sh.units = unitsOf(r); sh.err = "";
    var liquid = sh.units.some(function (u) { return u.v === "ml"; });
    sh.amt = liquid ? { n: 250, u: "ml" } : { n: 100, u: "g" };
    sh.draft = { name: "", k: "", p: "", f: "", c: "", src: "database" };
    sh.note = ""; sh.ready = true; foodCalc(); paintSheet(); toForm();
  }

  function foodCalc() {
    var r = sh.pick, a = sh.amt; if (!r || !a || !(a.n > 0)) return;
    var un = null;
    sh.units.forEach(function (u) { if (u.v === a.u) un = u; });
    if (!un) return;
    var g = a.n * un.g, f = g / 100;
    sh.draft.k = String(Math.round(r.k * f)); sh.draft.p = String(r1(r.p * f)); sh.draft.f = String(r1(r.f * f)); sh.draft.c = String(r1(r.c * f));
    var amtText = a.u === "g" ? Math.round(g) + " g" : (a.u === "ml" ? a.n + " ml" : a.n + " × " + un.l.replace(/ \(.*$/, ""));
    var short = cleanName(r.d).split(",").slice(0, 2).join(",").trim();
    sh.draft.name = (short + " (" + amtText + ")").slice(0, 60);
    sh.note = "About " + Math.round(g) + " g from the USDA table." + (a.u === "ml" ? " Millilitres use this food’s own density." : "");
  }

  function calcAmount() { if (sh.tab === "find") foodCalc(); else labelCalc(); }
```

<sub>`src/js-today.js` — syncAdd, addValid, toForm, addExtra</sub>

```js
  function syncAdd() {
    if (!sh || sh.view !== "add") return;
    var g = function (id) { var e = document.getElementById(id); return e ? e.value : null; };
    var v;
    if ((v = g("dText")) !== null) sh.dText = v;
    if ((v = g("qIn")) !== null) sh.q = v;
    if ((v = g("fName")) !== null) sh.draft.name = v;
    if ((v = g("fKcal")) !== null) sh.draft.k = v;
    if ((v = g("fP")) !== null) sh.draft.p = v;
    if ((v = g("fF")) !== null) sh.draft.f = v;
    if ((v = g("fC")) !== null) sh.draft.c = v;
  }

  function addValid() { return !!(sh && sh.draft && sh.draft.name.trim() && isFinite(parseFloat(sh.draft.k)) && parseFloat(sh.draft.k) >= 0); }

  function toForm() {
    var el = document.querySelector("#panel .lblhead") || document.querySelector("#panel label[for=fName]");
    if (el && el.scrollIntoView) el.scrollIntoView({ block: "start", behavior: RM() ? "auto" : "smooth" });
  }

  function addExtra() {
    syncAdd();
    var d = sh.draft, n = d.name.trim(), k = parseFloat(d.k);
    if (!n || !isFinite(k) || k < 0) { sh.err = "Give it a name and a calorie figure. A rough number beats no number."; paintSheet(); return; }
    if (!S.extras[TODAY]) S.extras[TODAY] = [];
    S.extras[TODAY].push({ n: n, k: Math.round(k), p: r1(num(d.p)), f: r1(num(d.f)), c: r1(num(d.c)), src: d.src || "manual" });
    save(); closeSheet(); refresh();
    toast(n + " added · " + Math.round(k) + " kcal", function () {
      var l = S.extras[TODAY]; if (l && l.length) { l.pop(); save(); refresh(); }
    });
  }
```

The planned-meal sheet (tap a meal, untick what you did not eat, swap foods) is `viewMeal` in `src/js-today.js`:

<sub>`src/js-today.js` — viewMeal</sub>

```js
  function viewMeal() {
    var id = sh.meal, m = mealById(id), done = isDone(id), skd = isSkipped(id), b = done ? mealView(id) : selView(id), pick = pickFor(id), hits = methodsFor(id);
    var foods = m[6].map(function (cat) {
      return '<button class="frow" data-cat="' + cat + '"><span class="fk">' + cat + '</span><span class="fv">' + esc(food(cat, pick[cat])[1]) + '</span><i class="chev"></i></button>';
    }).join("");
    if (pick.protein && RED[pick.protein]) {
      var cur = S.done[id] || "medium-rare";
      foods += '<label class="frow"><span class="fk">Cooked</span><select class="fsel" data-done="' + id + '" aria-label="How to cook it">' +
        ["rare", "medium-rare", "medium", "medium-well", "well done"].map(function (d) {
          return '<option value="' + d + '"' + (d === cur ? " selected" : "") + ">" + d + "</option>";
        }).join("") + "</select></label>";
    }
    if (pick.protein === "egx") {
      var ew = wholeEggs(id);
      foods += '<label class="frow"><span class="fk">Eggs</span><select class="fsel" data-eggs="' + id + '" aria-label="Whole eggs in the mix">' +
        [0, 1, 2, 3, 4, 5, 6].map(function (n) {
          return '<option value="' + n + '"' + (n === ew ? " selected" : "") + ">" + n + " whole, rest whites</option>";
        }).join("") + "</select></label>";
    }
    return phead(m[2], m[1] + " · " + macLine(b.tot), false) +
      '<div class="pbody"><div class="items big">' + itemsHtml(b.parts, skd ? null : id) + "</div>" + (done ? doneSlot(id) : (skd ? "" : skipSlot(b) + trimNote(id))) +
      '<div class="plabel">Foods</div><div class="fgroup">' + (done ? foods.replace(/data-cat=/g, 'disabled data-x=') : foods) + "</div></div>" +
      '<div class="pfoot">' + (skd ? '<button class="bigbtn" data-unskip="' + id + '">Undo skip</button>'
        : (!done && b.allOff ? '<button class="bigbtn skip" data-skipmeal="' + id + '">Skip ' + m[2].toLowerCase() + "</button>"
        : '<button class="bigbtn' + (done ? " on" : "") + '" data-ate="' + id + '">' + (done ? "Undo eaten" : "Ate it") + "</button>")) +
      (hits.length ? '<button class="sbtn rec" data-rec="' + id + '">Recipes · ' + hits.length + "</button>" : "") + "</div>";
  }
```

## 7. Things worth a reviewer's eye

Observed from the screenshots and the code. These are not confirmed defects.

- **Search results show raw USDA names**, such as "Orange juice, chilled, includes from concentrate, with added calcium". They wrap to two lines and push other results off-screen. A shortened display name might scan faster.
- **The primary button is dimmed on the Search screen while results show.** "Add to today" is disabled until a result is picked, and the disabled state is 40% opacity. It may read as broken, not as "pick something first".
- **Describe and Label are hidden when Claude isn't reachable**, so the segmented control shows two tabs in that case (as in the screenshots) and four when it is.
- **Accent colour carries meaning twice**: teal is both "protein" and "primary action/active". Checked for contrast, but a reviewer may see ambiguity.
- **Mono figures at 12–13 px** in secondary lines (macro line under each search result, kcal line under each meal) are the smallest text in the app.
- **Not verified on a real phone**: the on-screen keyboard behaviour inside the sheets (handled with `visualViewport`, tested only in desktop Chromium).
- **Automated checks**: a lint tool flags "cramped padding" on the macro cells; the insets measure 10–14 px, so I treated it as a false positive.
