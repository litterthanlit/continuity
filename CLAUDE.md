# Continuity — agent constitution

Continuity is a harness for making **state-of-the-art motion design videos as code**
(Linear/Vercel/Stripe-grade product launches, kinetic typography, social cuts).
You author scenes in TypeScript; HyperFrames renders them deterministically; the
`ct` CLI gives you **eyes** (stills, contact sheets) and **gates** (lint, check).

Your job is not "make it render". It is **make it excellent, and prove it**.

## The loop (always)

```
brief.md → storyboard.json → style frames → scenes → GATE → LOOK → fix → … → render
```

1. **Plan before pixels.** Fill `brief.md`, then write `storyboard.json` (scenes,
   durations, beats, copy, element ids, motion intent). Planning is the single
   biggest quality lever — never start coding scenes from a one-line prompt.
2. **Style frames.** Build each scene's *settled* layout first (view only, minimal
   motion), run `pnpm ct stills <p>` and look. Fix composition and type before
   animating anything.
3. **Motion.** Add motion with presets and tokens. Choreograph: one focal point at a
   time, lead → follow, everything eases and settles.
4. **Gate:** `pnpm ct check <p>` must report **0 errors**. Treat warnings as defects
   unless you can say why the craft is right anyway (then `allow: ["rule-id"]` with a
   comment).
5. **Look:** `pnpm ct sheet <p>` (rhythm, hierarchy, continuity) and
   `pnpm ct stills <p>` (type, detail). **Read the PNGs.** Never claim visual quality
   you have not looked at.
6. **Critique → fix**, at most **3 rounds** of visual iteration. Keep the best
   version (`pnpm ct status <p>`); revert rather than polish a regression.
7. **Render:** `pnpm ct render <p> --draft` while iterating; final `pnpm ct render <p>`.

## Hard rules

- **Motion is data.** Animate only through `motion: (m) => …` in scene files. Never
  CSS `animation`/`transition`, `setTimeout`, `requestAnimationFrame`, `Date.now`,
  `Math.random` (ESLint enforces this). Frames are *seeked*, not played.
- **Ids.** Anything you animate, or any text, gets a `ct="id"` prop. Ids match the
  storyboard's `elements`. `scene` and `camera` are reserved.
- **Copy lives in the storyboard** (`scenes[].text`); views read `text.<id>`.
- **Tokens first.** Durations: `instant fast base slow hero linger`. Eases:
  `enter exit standard hero inOut snappy gentle bouncy`. Staggers:
  `char word line list grid`. Raw numbers need a reason.
- **Layout** inside `<Safe>` (16:9 title-safe) or `<Safe zone="social">` (9:16).
  Text never below the legibility floor (26px landscape, 34px portrait).
- **Never edit `build/`** — it is generated. Edit `projects/<slug>/…`.
- **Open source only.** No GSAP, no fonts outside the theme registry, no network
  assets at render time.

## Definition of done

- `pnpm ct check <p>` → 0 errors; every remaining warning justified.
- You have read the latest `sheet.png` and the settled stills, and the critique
  scores ≥ 4/5 on every axis (see the `critique` skill).
- `pnpm ct check <p> --deep` passed once before the final render (adds HyperFrames'
  verification of the generated motion assertions).
- `pnpm ct render <p>` succeeded with clean render QC.
- `projects/<p>/.continuity/report.md` summarises what was made and known gaps.

## Where things are

| Path | What |
|---|---|
| `projects/<slug>/` | brief.md, storyboard.json, theme.ts (optional), scenes/<id>.tsx, assets/ |
| `projects/<slug>/.continuity/` | iterations (findings, stills, sheets, renders) — gitignored |
| `src/motion/` | tokens, presets, DSL, evaluator, transitions |
| `src/kit/` | scene components (Stage, Safe, Headline, …) |
| `src/themes/` | `mono-dark`, `light-editorial`, `vivid-gradient` |
| `src/lint/timeline.ts` | motion lint rules (`RULES` explains each) |
| `.claude/skills/` | `continuity` (start here), `motion-craft`, `kinetic-type`, `product-launch`, `critique`, `hyperframes-ref` |
| `.claude/agents/` | `director`, `scene-builder`, `critic` — orchestrated by `/make-video`, `/iterate`, `/critique`, `/render` |
| `.claude/hooks/` | edit → `ct lint` feedback; Stop → blocks "done" until changed projects pass `ct check`; SessionStart → install |
| `projects/_kit`, `_defects*` | component gallery (reference) and seeded-defect fixtures (tests) |
| `docs/decisions/` | architecture decisions |

## Commands

```
pnpm ct new <slug> --aspect 9:16 --theme mono-dark
pnpm ct lint <slug> [--storyboard | --scene id]   # fast static gate (also runs on every edit via hook)
pnpm ct check <slug> [--scene id]  # THE gate (browser audits) — the full run records the iteration
pnpm ct timeline <slug>        # every tween with numbers
pnpm ct stills <slug> [--beats | --at 1.2,3 | --scene id]
pnpm ct sheet <slug> [--anchors] [--scene id]
pnpm ct strip <slug> --scene id    # onion skin: motion paths in one image
pnpm ct render <slug> [--draft]
pnpm ct motion <slug>          # motion-energy chart of the render: rhythm, dead zones, jolts
pnpm ct score|compare|verdict|restore <slug> …   # critique bookkeeping, keep the best
pnpm ct status <slug> · pnpm ct report <slug> · pnpm ct licenses
pnpm verify                    # typecheck + eslint + unit tests (engine changes)
CT_SLOW=1 pnpm test            # + browser tests: seeded defects, golden frames
```
