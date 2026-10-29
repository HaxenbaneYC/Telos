# Telos

A personal training and nutrition app Youssef built for himself, plus a website
to follow. One user. Not a product, not a startup. Keep it that way.

---

## Who this is for

Youssef Christofides, 25, architectural engineer in Dubai. Desk job, office
hours 10:00–19:00, gym after work. Started a 13-week cut on **28 Oct 2026** at
75 kg, aiming for ~68–69 kg at 12–13 % body fat. Aesthetic goal, in his words:
six pack, V taper, lean but still full.

He is not a developer. Explain a change in one line, not a lecture.

### How he wants to be talked to

- Direct. No fluff, no preamble, no restating the request.
- Pushback over agreement. If an idea is wrong, say so and say why.
- Backed by evidence, not by theory and not over-explained. One sentence of
  reasoning, not a paragraph of citations.
- He will ask to cut harder than is sensible. Hold the line and explain the
  trade in one sentence. He has asked for water fasts before; the answer was
  no, and it stays no.
- "Not woke" nutrition, his phrase: five whole eggs is fine, no cholesterol
  hand-wringing, red meat and saturated fat are not villains.

---

## The plan this app runs on

Start 2026-10-28, target 69 kg, 13 weeks.

| Weeks | Phase      | kcal  | P   | F  | C   | Notes                                    |
|-------|------------|-------|-----|----|-----|------------------------------------------|
| 1–2   | Re-entry   | 2,350 | 185 | 78 | 215 | Steps 5k→8k, 3–4 RIR, small deficit      |
| 3–8   | The work   | 2,240 | 191 | 74 | 200 | Steps 10k, full intensity, 1 run/ride wk |
| 9     | Diet break | 2,700 | 185 | 85 | 285 | Maintenance over Christmas, deliberate   |
| 10–13 | The finish | 2,150 | 195 | 70 | 185 | Steps 10–12k, hold volume, no extra cardio |

Training is a seven-day **rotation**, not weekdays: Push, Pull, Legs, 5K run or bike,
Upper, Delts/arms/abs/neck, Rest, then round again. Day one (Wed 28 Oct 2026) is Push.
Plus a **daily 3 km bike ride**, logged from the first day.
Supplements he already takes: D3+K2, omega 3, magnesium, zinc, selenium,
tongkat ali, boron, creatine 5 g daily.

Food rule: real food, cooked by himself. No cream, no bottled dressings, no
packaged sauces, no protein bars. Chicken and rice is the default and that is
fine — the recipes exist so he doesn't quit out of boredom by week three.

---

## The app

The shipped file is still one self-contained `coach.html`: markup, styles, script
and the food table in a single file, no framework, no dependencies except the
Google Fonts link. Open it in a browser and it runs.

It is now **built from `src/`** so it stays editable:

```
python3 build.py             # coach.html          (live: no sample data, key telos_v2)
python3 build.py --preview   # coach-preview.html  (sample data, key telos_mock2)
```

Edit `src/*`, never the generated HTML. `build.py` concatenates `head.html`
(CSS, markup, state), `js-data.js` (meal engine, recipes, plan data),
`js-today.js`, `js-search.js`, `js-tabs.js`, `js-init.js`, and embeds
`data/foods.tsv` in a `<script type="text/plain" id="foodsDB">` block. Vanilla
ES5 `var` JS throughout. `PREVIEW` at the top of the script switches the
storage key and the seeding.

Published as a private Claude artifact (the live build, titled "Telos Redesign").
To redeploy, publish the built file to the same artifact URL.

**Logging starts today only.** The live build has no sample data: food and
training are empty until he logs them.

### The phone app

`python3 build.py` also writes `docs/index.html` and `docs/sw.js`: the same app as a complete page with a
manifest, icons (`tools/make-icons.py`) and an offline service worker. Serve `docs/` over https (GitHub
Pages from main /docs, or any static host) and "Add to Home Screen" gives a full-screen app that opens
without signal. Data stays in that phone's browser storage; the install is a separate copy from the Claude
artifact, so logs do not carry over. Describe and Label need Claude, so they are hidden in the installed
app. A new build changes the service worker's version; the app picks it up on the next online open.
Pages publishes only `docs/`, so keep personal notes (this file, `data/`, `src/`) out of it.

### Data

Everything lives in `localStorage` under `telos_v2` (v1 held the test entries and is erased on first open;
bump the number to start everyone fresh). Nothing is uploaded
anywhere, including weekly photos (resized to <=440 px JPEG on the client).
**Keep it that way.** Every read and write is wrapped in try/catch; the app
must render with storage empty.

The only thing that leaves the device is a Claude call he triggers himself
(Describe, Label photo), through the artifact `sample` capability. It asks for
consent per call, the photo is never stored, and the buttons are hidden when
the capability is missing.

### Structure

Four tabs, in this order: **Today, Train, Food, Trend.** Today and Train come
first on purpose; Trend is last.

- **Today** - summary card with the one-sentence finding, 13-week strip, the
  next meal as an open card (everything else is a row), a folded "Eaten" group,
  off-plan food, checklist, supplements, and a mini sticky calorie/macro bar that
  slides in on scroll. Meals open in a bottom sheet. Every change has an undo toast.
- **Train** - today's session from the rotation, a 7-day "Next 7 days" list, the
  daily 3 km bike tick, back-from-time-off notes.
- **Food** - recipes only: search, chips (Pasta, Rice, Potato, Eggs and yogurt,
  Sauces), "healthy but fun" plus the simple staples. The food rule and protein
  swaps live in one accordion at the bottom. He does not want a Food tab that is
  just reference tables.
- **Trend** - weight (chart fitted to the data), measurements and taper gap,
  photos, weekly analysis, phases. The weigh-in is a morning log here, not on Today.

### Other days

The Today screen can show any day since the start: arrows step a day, the date opens a "Days" list
(calories against target for each day, a 7-day average). `DAY` is the day being viewed; every meal,
off-plan and checklist control works on it, so a past day can be reviewed, filled in, corrected or
cleared ("Clear this day's food", with undo). The plan, target and carry-over are computed for that
day's phase. No coach trimming on past days; an overshoot yesterday still lowers today's target.
Weight, training and trend stay on today. `tests/day-history.js` covers it.

### Meals, partial meals, skipped meals

`MEALS` holds five slots as a **share of the day**, so they rescale when the phase
changes. `buildMeal()` solves in three passes (carb and fat sources carry protein
of their own). Portions are rounded to how they are served before macros are counted.
`PIECE` counts eggs, slices, bananas; `egx` is the mixed-eggs composite.

Items in a meal are toggles. Tap what you did not eat: the meal's numbers drop.
Untick **every** item and the card offers "Skip <meal>", which marks it skipped
(`S.skipped`, with undo). On an already-eaten meal, unticking items in the sheet
edits what counts, and unticking the last one returns the meal to not eaten.
"Undo eaten" restores the whole meal. Eaten meals are frozen in snapshots
(`S.snap[date][mealId]`) so later coaching never rewrites history.

### Off-plan food

Add from the sheet by four routes: **Search** (7,831 USDA foods, offline, per
100 g, with portions and ml via density), **Describe** (type what and how much;
Claude estimates), **Label** (photo of the nutrition panel; Claude reads it),
**Numbers** (type kcal and macros). Off-plan rows can be removed with undo. The
USDA table is built by `data/build-foods.py` from his nutrition database.

### The coach rule

He wants flexible, not too flexible. If a day is projected over target:

- 150 kcal or less over: no change.
- Beyond that, the meals still to eat give up the difference today: fat first
  (up to half of the fat left), then carbs (up to a quarter, never the pre-gym
  meal), never protein. Capped at 250 kcal.
- Whatever is still over 150 comes off tomorrow's target, up to 300.

These numbers (`COACH`) are judgment, adjustable.

### The day adds up

`dayPlan()` builds all five slots together. A slot is solved against its share, but breakfast has no
fat source and bananas and bread are coarse steps, so the leftover for the day goes to the slots that
can take it in small steps (rice, potato, oil, chicken, yogurt, nuts); pieces never absorb it. The
plan does not depend on what has been eaten; only the coach trim recalculates the slots still to come,
and eaten slots stay as planned. Fat that cannot go lower (fatty meat, eggs) is traded against carbs so
the calories still add up. Default day lands within 3% of the phase calories, one- and two-food swaps
within about 6%. Known: the plan table's own macros do not sum to its calories (weeks 1-2: 2,302 vs
2,350; diet break: 2,645 vs 2,700), which is most of the remaining gap.

### Stored data is untrusted

`normalizeState()` runs on load and coerces every key into the shape the code reads, dropping anything
that does not fit (wrong types, odd keys, bad photos). Add a key to `S` and you add it there. Other tabs
that save are picked up through the `storage` event; past midnight the page reloads so "today" is today.

### Recipes

`LIB` (methods) plus `FIN` (finishers) and `RECIPES` (sauces and bases). They are
**complete meals**, protein and carb cooked together, not fragments. `methodsFor()`
matches protein and carb and falls back to protein-only with `swap: true`.
Recipes open as in-place accordions. White-sauce pasta (cornflour, milk, garlic,
parmesan, or yogurt base) is the example of the style he wants: healthy but fun.
He will supply a recipe book; add from it, keep the simple ones.

Write methods in your own words. Do not reproduce a book's or website's text.

---

## Design

Redesigned as a **phone-first personal app** (Oct 2026). He approved the glass
look "if implemented right". The skills installed for design (impeccable,
design-taste-frontend, ui-ux-pro-max) were explicitly allowed to override the
earlier look; the identity below stayed.

### Identity that stays

| Token  | Hex       | Use                                      |
|--------|-----------|------------------------------------------|
| Basalt | `#0A0C0B` | Page ground                              |
| Teal   | `#2A9D8A` | Primary accent, active state, good       |
| Bronze | `#B08455` | Secondary accent, times, caution         |
| Chalk  | `#D8D2C4` | The mark on teal                         |
| Red    | `#FF5C45` | **Over target. Nothing else, ever.**     |

Red is used only for a macro or calorie figure going past its number. It is
not used on Trend or Food at all (teal good, bronze caution, ink stop).
Dark-first with a light theme; tokens declared for `:root`, the dark media
query guarded by `:root:not([data-theme="light"])`, and `[data-theme="dark"]`.

### Type

IBM Plex Sans for labels and prose (sentence case). IBM Plex Mono for figures
only. Keep text large; he asked for bigger text already.

### Glass and motion

Glass on the chrome (header, nav) and the summary card over a soft wash. Solid
under data: sheets and cards stay opaque so numbers are legible. Motion is
feedback (number tweens, FLIP row moves, sheet slide) and respects
`prefers-reduced-motion`.

### Phone rules

Targets of 44 px and up, no horizontal scroll from 320 to 430 px, "Ate it"
visible on the first screen down to 360x740, keyboard-aware sheets
(visualViewport). Real-device keyboard behaviour is still unverified.

---

## The logo

A tapered stem arriving on a base bar — the moment of arrival, since *telos*
means the end a thing is aimed at. The taper is the V-taper, built into the
geometry.

```
M102 26H154L147 180H109Z M22 180h212v46H22Z
```

viewBox `0 0 256 256`. One path. Chalk on teal, 56 px corner radius as an icon.
Lives in the app header as an inline SVG and as a data-URI favicon.

Two earlier rounds were rejected outright. A third concept — a T carved out of
a solid square — audited perfectly and was dropped anyway because it sat beside
npm's icon as visibly the same family.

Wordmark: TELOS in IBM Plex Mono, 0.26em letter-spacing, uppercase.

---

## Working rules

- The deliverable is one self-contained HTML file. Edit `src/`, run `build.py`.
  No npm, no framework.
- Vanilla JS, `var`, no transpiling.
- Test before claiming it works. `tests/` has day-accuracy, storage-fuzz, injection and mobile-scan
  (Playwright). Render it in a real browser at 320, 360, 390 and 430 px and look at it. Past
  failures all shipped because nobody opened the page.
- Keep it simple. His words: KISS. Don't add features he didn't ask for.
- Logo exploration is deliberately **last**; the mark is untouched for now.

---

## Not done yet

- **Recipes from his book**: he will supply it; convert to recipes with macros
  from the USDA table.
- **The website**: the next phase, not started.
- **Notifications** to remind him to log: deferred by him.
- **Body fat baseline**: he still owes a DEXA or InBody reading.
- Protein powder and creatine were to be bought "from next Monday".
- **Logo exploration** (last).
- Real-device check of the on-screen keyboard in the sheets.
