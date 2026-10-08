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
   motion), run `npx ct stills <p>` and look. Fix composition and type before
   animating anything.
3. **Motion.** Add motion with presets and tokens. Choreograph: one focal point at a
   time, lead → follow, everything eases and settles.
4. **Gate:** `npx ct check <p>` must report **0 errors**. Treat warnings as defects
   unless you can say why the craft is right anyway (then `allow: ["rule-id"]` with a
   comment).
5. **Look:** `npx ct sheet <p>` (rhythm, hierarchy, continuity) and
   `npx ct stills <p>` (type, detail). **Read the PNGs.** Never claim visual quality
   you have not looked at.
6. **Critique → fix**, at most **3 rounds** of visual iteration. Keep the best
   version (`npx ct status <p>`); revert rather than polish a regression.
7. **Render:** `npx ct render <p> --draft` while iterating; final `npx ct render <p>`.

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

- `npx ct check <p>` → 0 errors; every remaining warning justified.
- You have read the latest `sheet.png` and the settled stills, and the critique
  scores ≥ 4/5 on every axis (see the `critique` skill).
- `npx ct check <p> --deep` passed once before the final render (adds HyperFrames'
  verification of the generated motion assertions).
- `npx ct render <p>` succeeded with clean render QC.
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
| `plugin/` | **the agent layer — source of truth** (shipped as the Claude Code plugin): `skills/` (`continuity` start here, `motion-craft`, `kinetic-type`, `product-launch`, `critique`, `hyperframes-ref`), `agents/` (`director`, `scene-builder`, `critic`), `commands/` (`/make-video`, `/iterate`, `/review`, `/render`, `/setup`), `hooks/` (edit → `ct lint`; Stop → blocks "done" until changed projects pass `ct check`) |
| `.claude/` | this repo's session config: `skills`/`agents`/`commands` are symlinks into `plugin/`; `settings.json` wires `plugin/hooks/*`; `hooks/session-start.sh` installs deps in cloud sessions |
| `bin/ct.mjs` | the `ct` launcher (tsx + scene tsconfig + `continuity`/preact alias hook) |
| `src/mcp/` | the MCP server: each tool runs a `ct` child process (`run.ts`) and reads its `CT_RESULT_FILE` result; `files.ts` is the project-source sandbox |
| `Dockerfile`, `.github/workflows/docker.yml` | images: `toolchain` (pinned Chrome + ffmpeg) and `ct` (default, entrypoint `ct`); CI runs the browser suite inside `toolchain`; release pushes both to GHCR |
| `templates/` | `project/` (what `ct new` copies) and `init/` (what `ct init` writes into a user's repo) |
| `projects/_kit`, `_defects*` | component gallery (reference) and seeded-defect fixtures (tests) |
| `docs/decisions/` | architecture decisions |

## Commands

```
npx ct init                    # (user repos) config, projects dir, CLAUDE.md block, permissions
npx ct new <slug> --aspect 9:16 --theme mono-dark
npx ct lint <slug> [--storyboard | --scene id]   # fast static gate (also runs on every edit via hook)
npx ct check <slug> [--scene id]  # THE gate (browser audits) — the full run records the iteration
npx ct timeline <slug>        # every tween with numbers
npx ct stills <slug> [--beats | --at 1.2,3 | --scene id]
npx ct sheet <slug> [--anchors] [--scene id]
npx ct strip <slug> --scene id    # onion skin: motion paths in one image
npx ct render <slug> [--draft]
npx ct motion <slug>          # motion-energy chart of the render: rhythm, dead zones, jolts
npx ct score|compare|verdict|restore <slug> …   # critique bookkeeping, keep the best
npx ct status <slug> · npx ct report <slug> · npx ct licenses · npx ct doctor
npx ct mcp [--config]          # MCP server (stdio) for other agent clients — tools wrap these commands
pnpm verify                    # typecheck + eslint + unit tests (engine changes)
CT_SLOW=1 pnpm test            # + browser tests: seeded defects, golden frames
```

## Packaging (this repo is also the product)

- npm package `@litterthanlit/continuity` (bin `ct`, ships `bin/ src/ templates/` as
  TypeScript run by tsx). `npx ct` works here through a `link:.` self-dependency,
  so the repo exercises the published launcher every day.
- Claude Code plugin `continuity` from `plugin/`, listed by `.claude-plugin/marketplace.json`.
  Edit skills/agents/commands/hooks **in `plugin/`** (the `.claude/` paths are symlinks).
  Keep `plugin/.claude-plugin/plugin.json` `version` equal to `package.json` (a test checks).
- Commands report machine-readable results with `emitResult()` (`src/cli/lib/result.ts`) —
  the MCP tools depend on them; a new command or field the agent needs goes there too.
- Paths: engine files resolve from `PKG_ROOT`; projects/build/out from `WORK_ROOT`
  (nearest `continuity.json`). Never join paths onto `node_modules` — use `resolveDep`.
- Before a release: `pnpm verify`, `CT_SLOW=1 pnpm test`, `node scripts/pack-smoke.mjs --browser`
  (and `--pm pnpm`), `claude plugin validate ./plugin --strict`. Release = push a `v*` tag.
