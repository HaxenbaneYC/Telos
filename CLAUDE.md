# Telos

A personal training and nutrition app, one user. Not a product, not a startup. Keep it that way.

Notes about the owner (who he is, how he wants to be talked to, body goals, health items) are kept
privately, not in this public repo. Style that matters here: direct, short, no fluff; explain a change
in one line; he is not a developer; pushback over agreement.

---

## The plan this app runs on

Start 2026-11-22, 13 weeks. (Restarted: the first attempt began 28 Oct and stopped after about a week; weight
on the restart was 77 kg, one weigh-in. The phase numbers were kept: 2 kg moves maintenance by about 50 kcal.)

| Weeks | Phase      | kcal  | P   | F  | C   | Notes                                    |
|-------|------------|-------|-----|----|-----|------------------------------------------|
| 1–2   | Re-entry   | 2,350 | 185 | 78 | 215 | Steps 5k→8k, 3–4 RIR, small deficit      |
| 3–4   | The work   | 2,240 | 191 | 74 | 200 | Steps 10k, full intensity, 1 run/ride wk |
| 5     | Diet break | 2,700 | 185 | 85 | 285 | Maintenance over Christmas (20–26 Dec)   |
| 6–9   | The work   | 2,240 | 191 | 74 | 200 | Back to the deficit, same as weeks 3–4   |
| 10–13 | The finish | 2,150 | 195 | 70 | 185 | Steps 10–12k, hold volume, nothing harder than the walks |

Training is a seven-day **rotation**, not weekdays: Push, Pull, Legs, 5K run or bike,
Upper, Delts/arms/abs/neck, Rest, then round again. Day one (Sun 22 Nov 2026) is Push.
The rotation follows what was **done**, not the calendar (`rotState()`): a skipped day keeps the same
session owed; doing a different one (Upper on a Legs day) leaves Legs owed and Upper is skipped when the
round reaches it. Any session can be logged from the chips on Train (`S.sess[date]` = index 0–6, which
also ticks the checklist's "trained"). `tests/rotation.js`.
Plus a **daily 3 km bike ride**, logged from the first day. Push, Pull and Upper end with a 20-minute easy
incline walk (10–12%, about 5 km/h, talking pace; alternatives and the why in the Train tab's Notes). He asked
for light cardio for fat burn; it is not counted in calories and should not be eaten back.

**Meals are decided, not chosen (KISS, from 23 Nov).** He asked for no food options. Breakfast is eggs,
sourdough and 360 ml semi-skimmed milk for his coffee, three cappuccinos (`MILK`, counted when breakfast is ticked). Snack is
Greek yogurt and peanuts, pre-gym a banana. Dinner comes from `MENU`, seven dinners on a loop from
`MENU_START`, each with an easy veg; it is cooked for two and **lunch is the box from the night before**
(`dishFor()`: lunch is yesterday's dish). The box portion is sized for the day it is eaten, so every
day adds up on its own; the dinner card and the Food tab give the pan total (`cookParts()`: tonight's
plate plus tomorrow's box). His ingredients: chicken breast and thigh, steak, lean beef mince, rice,
pasta, potato and sweet potato in the air fryer, wraps, eggs, sourdough, Greek yogurt, milk.
**All weights are before cooking** (raw meat, dry rice and pasta): that is what he weighs to cook.


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
python3 build.py             # coach.html          (live: no sample data, key telos_v3)
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
Icon and manifest URLs carry `?v=<hash of the icons>` (build.py) and the service worker never serves them, so
"Add to Home Screen" always gets the current logo; iOS only takes the icon from Safari, with signal.
Live at **https://haxenbaneyc.github.io/Telos/** (capital T: the path is case-sensitive; GitHub Pages, main /docs,
repo is public). A push to main redeploys it in about a minute. Pages publishes only `docs/`.

### Launch safety (installed app)

A cold start must paint at once. Google Fonts load from a script, never a render-blocking `<link>`: a stalled
request used to leave the screen black. The service worker serves the saved page first and fetches the new one for
next time (an update shows on the second open). If the app has not started after 6 s, a plain screen shows the error
and a "Reload the app" button that clears the saved app files; the log (localStorage) is never touched.
On iOS the installed app has its own storage: deleting the home-screen icon deletes the log.

### Data

Everything lives in `localStorage` under `telos_v3` (the 22 Nov restart; v2 holds the first attempt and is left
alone, v1 held test entries and is erased on first open; bump the number to start everyone fresh). Nothing is uploaded
anywhere, including weekly photos (resized to <=440 px JPEG on the client).
**Keep it that way.** Every read and write is wrapped in try/catch; the app
must render with storage empty.

The only things that leave the device are a lookup he triggers himself. Inside the Claude artifact that is
Describe and Label through the `sample` capability (consent per call). In the installed phone app there is no
Claude to ask, so Describe and Label call api.anthropic.com directly with his own API key, kept in this phone's
storage under `telos_apikey` (never in the log, never in the repo). Photos are shrunk to 1600 px, sent once and
never stored. Without a key the two tabs show a "Turn on lookups" card; the free web lookup below needs no key.

### Structure

Four tabs, in this order: **Today, Train, Food, Trend.** Today and Train come
first on purpose; Trend is last.

- **Today** - summary card with the one-sentence finding, 13-week strip, the
  next meal as an open card (everything else is a row), a folded "Eaten" group,
  off-plan food, a three-item checklist (protein, steps, trained; no supplements list, he asked
  for it gone), and a mini sticky calorie/macro bar that
  slides in on scroll. Meals open in a bottom sheet. Every change has an undo toast.
- **Train** - today's session from the rotation, a 7-day "Next 7 days" list, the
  daily 3 km bike tick, back-from-time-off notes.
- **Food** - this week's seven dinners (what goes in the pan for two, and how to cook it), then a
  shopping list for the next seven days (`renderShop()`: every breakfast, snack, banana and dinner pan,
  weights before cooking, rounded up to what you can buy; ticks are for the trip and not saved).
  The recipe library, finishers and protein-swap tables were deleted on his say (Nov 2026).
- **Other activity** (bottom of the Train tab's top block) - a run, bike, scooter or walk with km and/or minutes,
  for today (`S.acts[date]`, list of `{t, km, min}`). Counted in distance only, never in calories; the daily 3 km tick stays separate.
- **Trend** - weight (chart fitted to the data), measurements and taper gap,
  photos, weekly analysis, phases. The weigh-in is a morning log here, not on Today; its arrows
  pick the day, so a missed weight or sleep can be filled in back to the start (`tests/morning-past.js`).

### Other days

The Today screen can show any day since the start: arrows step a day, the date opens a "Days" list
(calories against target for each day, a 7-day average). `DAY` is the day being viewed; every meal,
off-plan and checklist control works on it, so a past day can be reviewed, filled in, corrected or
cleared ("Clear this day's food", with undo). The plan, target and carry-over are computed for that
day's phase. No coach trimming on past days; an overshoot yesterday still lowers today's target.
Training and the trend view stay on today (weight and sleep have their own day arrows on Trend). `tests/day-history.js` covers it.

### Meals, partial meals, skipped meals

`MEALS` holds five slots as a **share of the day**, so they rescale when the phase
changes. Lunch and dinner have the same share. Fixed parts (the milk, each dish's veg) come off a slot's
target before the rest is solved (`fixedParts()`). There is no food picker any more; `S.picks` is ignored. `buildMeal()` solves in three passes (carb and fat sources carry protein
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
**Numbers** (type kcal and macros). Off-plan rows can be removed with undo.

Restaurant and brand items are not in the USDA table, so there is a **free web lookup**: when search finds
nothing useful, "Look it up on the web" opens a web search in a new tab, he copies the line with the numbers, and
the Numbers tab has a paste box (and a "Paste from clipboard" button) whose parser (`parseNutrition`) fills
calories, protein, fat and carbs, reading "25 g protein, 22 g fat" and "Protein 25 g  Fat 22 g" alike and
skipping saturated fat and sugars. Entries from it are marked "web". The **paid lookup** (phone app, own key)
calls Sonnet 5.5 with the web search tool (a few cents per lookup) for Describe, and reads a label photo for
Label; a paused turn is continued, and an account with web search off falls back to an estimate and says so.
Tests: `tests/paste-numbers.js`, `tests/api-lookup.js` (mock API). The
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

`dayPlan()` builds all five slots together (`planOn(d)` for any day, cached). A slot is solved against its share, but breakfast has no
fat source and bananas and bread are coarse steps, so the leftover for the day goes to the slots that
can take it in small steps (rice, potato, oil, chicken, yogurt, nuts); pieces never absorb it. The
plan does not depend on what has been eaten; only the coach trim recalculates the slots still to come,
and eaten slots stay as planned. Fat that cannot go lower (fatty meat, eggs) is traded against carbs so
the calories still add up. Every day of the 13 weeks on the menu lands within about 3.5% of the phase
calories and 1% of protein (`tests/day-accuracy.js`). The coach trim never touches lunch: the box is cooked. Known: the plan table's own macros do not sum to its calories (weeks 1-2: 2,302 vs
2,350; diet break: 2,645 vs 2,700), which is most of the remaining gap.

### Stored data is untrusted

`normalizeState()` runs on load and coerces every key into the shape the code reads, dropping anything
that does not fit (wrong types, odd keys, bad photos). Add a key to `S` and you add it there. Other tabs
that save are picked up through the `storage` event; past midnight the page reloads so "today" is today.

### Recipes

The only methods are the seven `MENU` dinners (`methodsFor()` returns the dish's method for dinner and
nothing else). The old library (`LIB`, `FIN`, `RECIPES`) was deleted to keep it simple; it is in git history.
If he supplies a recipe book, new dinners go into `MENU` (protein and carb from `FOODS`, one easy veg).

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

The **tau**, the Greek first letter of *telos*: a bar whose right end turns down where the path arrives,
the end a thing is aimed at. Replaced the tapered-stem mark (now in `brand/previous/`) in Oct 2026. Full kit
in `brand/`: lockups (horizontal, stacked), symbol, wordmark, one-colour versions, a small-size cut,
favicon set and a one-page guide (`brand/TELOS-LOGO-GUIDE.md`). `tools/build-logo-kit.py` regenerates the SVGs from numbers.

Small-size cut (used for the app icon, header mark and favicon), 256 grid:

```
M34 50H146A76 76 0 0 1 222 126V170H178V126A32 32 0 0 0 146 94H34ZM68 88H112V218H68Z
```

Icon and header: basalt `#0A0C0B` tau on a teal `#2A9D8A` tile (5.9:1; chalk on teal is only 2.2:1, so not
that). On dark grounds the symbol is teal with a chalk wordmark; on light, deep teal `#0F6B5E` with basalt.
The inline SVG in `src/head.html` (header mark and data-URI favicon) and `tools/make-icons.py` (PWA icons) hold
the same shape; change all three together. Wordmark in the app header stays live text, IBM Plex Mono, 0.26em, uppercase.

---

## Working rules

- The deliverable is one self-contained HTML file. Edit `src/`, run `build.py`.
  No npm, no framework.
- Vanilla JS, `var`, no transpiling.
- Test before claiming it works. `tests/` has activity, rotation, morning-past, day-accuracy, day-history, paste-numbers, api-lookup, storage-fuzz, injection and mobile-scan
  (Playwright). Render it in a real browser at 320, 360, 390 and 430 px and look at it. Past
  failures all shipped because nobody opened the page.
- Keep it simple. His words: KISS. Don't add features he didn't ask for.

---

## Not done yet

- **Recipes from a recipe book**: to be supplied; add as `MENU` dinners with macros from the USDA table.
- **The website**: the next phase, not started.
- **Notifications** to remind him to log: deferred.
- Real-device check of the on-screen keyboard in the sheets.
