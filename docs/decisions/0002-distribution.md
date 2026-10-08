# 0002 — Distribution: npm package + Claude Code plugin

**Status:** accepted · 2026-10-08

## Context

Continuity started as a repo you work *inside*: projects lived next to the engine,
`pnpm ct` ran the CLI through a repo-specific tsconfig, and the agent layer lived in
`.claude/`. To be usable from any repo it has to ship in two halves that users can
install independently:

- the **engine + `ct` CLI** — an npm package, so each repo pins its own version;
- the **agent layer** (skills, agents, commands, hooks) — a Claude Code plugin.

## Decisions

### 1. Two roots
`src/paths.ts` separates `PKG_ROOT` (where the package is installed: engine source,
templates, dependencies) from `WORK_ROOT` (the user's repo: `$CT_ROOT`, else the
nearest `continuity.json`, else the nearest `package.json`). Projects, builds, renders
and locks live under `WORK_ROOT`; nothing is ever written into `node_modules`
(`scripts/pack-smoke.mjs` asserts this). Dependency files (fonts, HyperFrames) resolve
with `createRequire` from `PKG_ROOT`, never by joining onto a `node_modules` path, so
npm hoisting and pnpm's strict layout both work.

### 2. Ship TypeScript, run it with tsx
User scenes are `.tsx` and must be compiled at run time anyway, so tsx is already a
runtime dependency. Shipping the engine as TS keeps one module graph (no `dist/` vs
`src/` copies) — which matters because of decision 3. Kit files carry
`@jsxRuntime automatic` / `@jsxImportSource preact` pragmas so they compile correctly
from `node_modules`, where tsx ignores tsconfig.

### 3. One copy of the engine and of preact
The kit keeps the active scene in module state (`src/kit/context.ts`), and Preact
vnodes must come from the same Preact the renderer uses. `bin/ct.mjs` therefore
registers (a) tsx with a generated tsconfig (`build/.ct/tsconfig.json`: preact JSX,
`include` over the projects dir and the `.continuity` snapshot dot-dirs) and (b) a Node
resolve hook (`bin/loader-hooks.mjs`) that maps `continuity`,
`@litterthanlit/continuity`, `preact` and `preact/*` to the package's own copies for
every importer. Scenes keep writing `import … from "continuity"` regardless of the npm
name (the bare name was taken). `ct init` also writes `projects/tsconfig.json` with the
same mapping for editors, and scopes `projects/` as ESM (`{"type":"module"}`), since a
CommonJS repo would otherwise load scenes as CJS.

### 4. HyperFrames is a runtime dependency
It renders, lints and checks, so users need it. It is Apache-2.0 and has no GSAP npm
dependency; GSAP only appears inside its optional Studio UI bundle, which Continuity
never loads into a composition. `ct licenses` audits the installed production graph
(pnpm in this repo, a `createRequire` walk elsewhere) against an OSI allowlist.

### 5. The plugin is the single source of the agent layer
`plugin/` holds skills, agents, commands and hooks; `.claude-plugin/marketplace.json`
at the repo root lists it (`source: "./plugin"`). This repo's `.claude/skills`,
`.claude/agents` and `.claude/commands` are symlinks into `plugin/` rather than an
enabled local marketplace, because cloud sessions don't load `extraKnownMarketplaces`.
The repo does not also enable the plugin, so nothing fires twice.

Plugin hooks find the repo's own `node_modules/.bin/ct` and `continuity.json`, so they
use whatever version that repo pinned, and they are silent no-ops in repos that don't use
Continuity. Plugins cannot grant permissions; `ct init` merges `Bash(npx ct:*)` into the
repo's `.claude/settings.json`.

Namespacing renames things: `/continuity:make-video`, agent `continuity:critic`. The
command `/critique` became `/review` because it collided with the `critique` skill.

### 6. Determinism outside this repo's ESLint
The ESLint determinism rules only run here. A static source lint (`src/lint/source.ts`:
`nondeterministic-api`, `css-animation`) runs inside `ct lint`, so user repos keep the
guard.

## Verification
- `scripts/pack-smoke.mjs` installs the packed tarball into a fresh repo under npm and
  pnpm and drives `init → new → lint → build`; `--browser` adds `check → render`. CI runs
  the browserless variant.
- `claude plugin validate ./plugin --strict`. An isolated install
  (`CLAUDE_CONFIG_DIR=…`) lists the namespaced commands, skills and agents and receives
  the SessionStart toolchain report.
- Golden frames are unchanged by the launcher, and the engine hash is identical whether
  the package is installed by npm or by pnpm.

## Consequences
- Users need Node ≥ 22, ffmpeg and a headless Chrome on their machine (`ct doctor`
  explains). A Docker image is the planned fix.
- `projects/tsconfig.json` pins resolved paths; re-run `npx ct init` after upgrading.
- Versions of `package.json` and `plugin.json` move together (enforced by a test and
  by the release workflow).
