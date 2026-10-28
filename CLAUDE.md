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

Training: push / pull / legs / upper, plus a delts-arms-abs-neck day.
Supplements he already takes: D3+K2, omega 3, magnesium, zinc, selenium,
tongkat ali, boron, creatine 5 g daily.

Food rule: real food, cooked by himself. No cream, no bottled dressings, no
packaged sauces, no protein bars. Chicken and rice is the default and that is
fine — the recipes exist so he doesn't quit out of boredom by week three.

---

## The app

One file: `coach.html`. Self-contained — markup, styles and script in the same
file, no build step, no framework, no dependencies except the Google Fonts
link. Open it in a browser and it runs.

Published as a private Claude artifact. To redeploy, publish the same file to
the same artifact URL.

### Data

Everything lives in `localStorage` under the key `telos_v1`. Nothing is
uploaded anywhere, including the weekly progress photos, which are resized to
~50 KB JPEGs on the client and stored locally. **Keep it that way.** He did not
ask for an account and does not want one.

Every read and write is wrapped in try/catch. The app must render correctly
when storage comes back empty.

### Structure

Four tabs: Today, Trend, Food, Train.

- **Today** — the macro totals, the five meal slots, the daily checklist,
  supplements. The weigh-in is deliberately *not* here; he objected to being
  asked for his weight every time he opened the app.
- **Trend** — weight, measurements (waist, shoulders, and the taper gap between
  them), weekly photos, and the weekly analysis.
- **Food** — the rule, the recipe library, protein swaps.
- **Train** — the week's split and each session.

### How a meal is built

`MEALS` holds five slots. Each slot stores its macros as a **share of the day**,
not as fixed grams, so every slot rescales automatically when the phase changes.
The shares sum to 1.00 on each macro.

`buildMeal()` solves in three passes, because carb and fat sources carry protein
of their own — rice, sourdough and peanuts were putting the day ~24 g of protein
and ~90 kcal over target before this was fixed. Protein is solved against what
is left *after* the carb and fat sources, not against the raw target.

Every portion is rounded to how it is actually served **before** its macros are
counted, so the numbers match what he ate rather than a half-egg fiction.

### Pieces vs grams

`PIECE` maps a food id to the weight of one piece. Foods in that map are
counted, not weighed: eggs, egg whites, sourdough slices, bananas, dates. The
row shows the count on the left and the piece noun on the right, with the gram
weight small and grey beside it so a scale still agrees.

`Eggs — mixed` (id `egx`) is a composite handled specially in `solveProtein()`:
it takes the number of whole eggs he asked for (a per-meal dropdown, default 3),
then tops the protein up with whites. It matches the egg recipes via a
`egx → egg` mapping in `methodsFor()`.

### Recipes

`LIB` holds 35 complete-meal methods plus 5 finishers. They are **complete
meals** — protein and carb cooked together with interleaved timing — not
separate "here's how to cook chicken" fragments. He complained about that
specifically.

`methodsFor()` matches protein AND carb. When no exact pairing exists it falls
back to protein-only and sets `swap: true`, which shows a note saying the method
was written for a different carb. 82 exact pairings, 71 fallbacks, no empty
combinations.

Recipes open as **in-place accordions** inside the meal card. Not a separate
page, not a swipe carousel — both were tried and rejected.

### Writing recipes

Research the technique, then write the method in your own words. Do not
reproduce a recipe's text from a website.

---

## Design

The look was arrived at over many rejected rounds. Don't drift from it.

### Palette

| Token    | Hex       | Use                                         |
|----------|-----------|---------------------------------------------|
| Basalt   | `#0A0C0B` | Page ground                                 |
| Teal     | `#2A9D8A` | Primary accent, figures, active state       |
| Bronze   | `#B08455` | Secondary accent, times, recipe labels      |
| Chalk    | `#D8D2C4` | The mark on teal                            |
| Red      | `#FF5C45` | **Over target. Nothing else, ever.**        |

Red earns its meaning by appearing nowhere else. Do not use it for decoration,
emphasis, errors, or anything but a macro going past its number.

### Type

IBM Plex Mono for display, labels and figures. IBM Plex Sans for prose.
He asked for bigger text once already — don't shrink it back.

### The glass

Glass on the chrome (header, nav) and the hero panel. Solid under data, because
blurred backgrounds behind numbers hurt legibility. An ambient radial-gradient
ground sits behind every tab, masked so it fades out by 92 % of the container —
it used to fade at 106 % and the glow was cut off by `overflow: hidden`, which
he spotted and hated.

Every theme token is declared three times: `:root`, then
`@media (prefers-color-scheme: dark)` guarded by `:root:not([data-theme="light"])`,
then `:root[data-theme="dark"]`.

### Things already asked for

- Seamless edges, no hard-clipped glows
- Colour and glow throughout the whole app, not just one screen
- A nav bar that is alive, not "dead"
- Smooth animation on clicking
- Bigger text

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

- Self-contained HTML, one file. No build step, no framework, no npm install.
- Vanilla JS, `var`, no transpiling. It has to run by double-clicking the file.
- Test before claiming it works. Render it in a real browser and look at it —
  a progress bar that silently did nothing for days (an inline `<span>` ignoring
  `width`) and a recipe sheet whose `display: flex` beat the browser's `hidden`
  attribute both shipped because nobody opened the page.
- Keep it simple. His words: KISS.
- Don't add features he didn't ask for.

---

## Not done yet

- **The website** — the next phase, not started.
- **Notifications** to remind him to log — he explicitly deferred these.
- **Body fat baseline** — he still owes a DEXA or InBody reading.
- Protein powder and creatine were to be bought "from next Monday".
