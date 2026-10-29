# Telos

My health tracking app. A phone-first, single-file web app for food, training and weight, with a 13-week cut plan built in.

- `coach.html` is the app. Open it in a browser, or publish it as a private Claude artifact.
- Edit `src/`, then run `python3 build.py` to rebuild `coach.html` (`--preview` makes `coach-preview.html` with sample data).
- `data/foods.tsv` is the offline USDA food table; `data/build-foods.py` regenerates it.
- `CLAUDE.md` has the full project notes.
- `docs/` is the installable phone app (manifest, icons, offline service worker). Publish it with GitHub Pages (Settings, Pages, deploy from `main` `/docs`) or any static host, then Add to Home Screen.
- `tests/` has the Playwright checks: `node tests/day-accuracy.js`, `storage-fuzz.js`, `injection.js`, `mobile-scan.js`.
- Live app: https://haxenbaneyc.github.io/Telos/ (open on a phone, then Add to Home Screen).
