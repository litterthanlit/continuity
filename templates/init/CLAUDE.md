## Continuity (motion design videos as code)

This repo makes videos with [Continuity](https://github.com/litterthanlit/continuity).
Projects live in `projects/<slug>/` (brief.md, storyboard.json, scenes/<id>.tsx).
**Load the `continuity` skill before any video work** — it explains the loop,
the tools and which craft skills to load. `/continuity:make-video <brief>` runs
the whole studio (director → parallel scene-builders → gate → critic → render).

Hard rules:
- **Plan before pixels:** brief.md → storyboard.json → style frames → motion.
- **Motion is data:** animate only via `motion: (m) => …` in scene files. Never CSS
  `animation`/`transition`, `setTimeout`, `requestAnimationFrame`, `Date.now`,
  `Math.random` — frames are seeked, not played (`npx ct lint` enforces this).
- **Ids:** anything animated, and all text, gets `ct="id"` matching the storyboard.
  Copy lives in `storyboard.json` (`scenes[].text`); views read `text.<id>`.
- **Tokens first** (durations, eases, staggers); text stays above the legibility floor.
- **One look:** one type kit per video (storyboard `type`, `typography` skill) and one
  transition language (≤ 2 types besides cuts, `motion-craft` skill).
- **Never edit `build/`** — it is generated.
- **Done means:** `npx ct check <p>` 0 errors (`--deep` once before the final
  render), you have *read* the latest sheet.png and stills, critique ≥ 4/5 on every
  axis, `npx ct render <p>` with clean QC, and `projects/<p>/.continuity/report.md`.
