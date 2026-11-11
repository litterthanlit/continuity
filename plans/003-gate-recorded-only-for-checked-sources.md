# Plan 003: A gate result is recorded only for the sources that were checked

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 25ad21d..HEAD -- src/cli/commands/check.ts src/cli/lib/store.ts src/cli/commands/gate-status.ts src/cli/commands/status.ts`
> If any of these changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. One expected difference: plan 004
> changes line 23 of `check.ts` to `const scene = sceneFlag(a);` and adds
> `sceneFlag` to its `args.js` import. That is not a mismatch for this plan.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `25ad21d`, 2026-11-11

## Why this matters

`ct check` is the gate: a project is "done" only when its current sources have
passed it, and the Stop hook enforces that by asking `ct gate-status`. Today
`ct check` builds the project, audits it in a browser for 20 seconds to several
minutes, and only then asks "which iteration are the sources on disk?" and
writes the pass or fail onto that one. If a file changed while the audit ran —
a parallel scene-builder, a second tool call, a person — the new, unchecked
sources get an iteration marked `gate.ok: true`. The Stop hook then lets "done"
through for code no browser ever saw, and `ct score` can mark it best.

After this plan a check whose sources moved under it records nothing, reports
one clear error and exits 1, so the gate can only pass for what it tested.

A second, smaller defect in the same area is fixed too: when the same sources
occur twice in the history (after an undo or `ct restore`), `ct check` writes
to the newest iteration while `ct gate-status` and `ct status` read the oldest.

## Current state

Files and their roles:

- `src/cli/commands/check.ts` — the `ct check` command. Lines 32–42 are the
  bookkeeping this plan moves.
- `src/cli/lib/store.ts` — the iteration store: `state.json` per project under
  `projects/<slug>/.continuity/`, one record per distinct version of the sources.
- `src/cli/commands/gate-status.ts` — what the Stop hook calls; line 52 looks up
  the iteration for the current sources.
- `src/cli/commands/status.ts` — `ct status`; line 22 does the same lookup.
- `src/build/build.ts:172` — `const hash = sourceHash(slug, src).combined;` is
  taken at the **start** of the build and returned as `build.hash`.
- `src/build/hash.ts` — `sourceHash(slug)` hashes the project's files plus the
  engine source.

`src/cli/commands/check.ts` today, in full:

```ts
import { join } from "node:path";
import { rel } from "../../paths.js";
import { countBySeverity, type Finding } from "../../spec/findings.js";
import { flagBool, requireSlug } from "../lib/args.js";
import { hfCheck } from "../lib/check.js";
import type { Command } from "../lib/command.js";
import { log, step } from "../lib/log.js";
import { probeProject } from "../lib/probe.js";
import { emitResult } from "../lib/result.js";
import { buildAndLint, buildSummary, report } from "../lib/project.js";
import { currentIteration, updateIteration, writeFindings } from "../lib/store.js";

export const check: Command = {
  name: "check",
  summary: "THE GATE: lint + browser audits (layout, overlap, contrast, motion assertions, safe areas, type size). Records the result on the current iteration.",
  usage:
    "ct check <project> [--scene <id>] [--deep] [--json] [--snapshots]\n" +
    "  --scene  isolated check of one scene (parallel builders); not the project gate\n" +
    "  --deep   also verify generated motion assertions in HyperFrames (slow; run before delivery)",
  async run(a) {
    const slug = requireSlug(a);
    const json = flagBool(a, "json");
    const scene = typeof a.flags.scene === "string" ? a.flags.scene : undefined;
    const { build, findings } = await buildAndLint(slug, { scene });
    if (!json) log(buildSummary(build));
    const all: Finding[] = [...findings];
    if (build.ok) {
      if (!json) step("browser audit (HyperFrames check + Continuity probe)…");
      const [hf, probe] = await Promise.all([hfCheck(build, { snapshots: flagBool(a, "snapshots"), scene, deep: flagBool(a, "deep") }), probeProject(build, { scene })]);
      all.push(...hf.findings, ...probe);
    }
    // Scene mode builds the other scenes as placeholders: only this scene's findings count,
    // and the result is not the project gate.
    const scoped = scene ? all.filter((f) => !f.scene || f.scene === scene) : all;
    const it = currentIteration(slug);
    writeFindings(it.dir, scene ? `findings-${scene}.json` : "findings.json", scoped);
    const c = countBySeverity(scoped);
    if (!scene) updateIteration(slug, it.n, { gate: { ok: c.errors === 0, errors: c.errors, warnings: c.warnings, at: new Date().toISOString() } });
    emitResult({ iteration: it.n, scene: scene ?? null, findingsFile: join(it.dir, scene ? `findings-${scene}.json` : "findings.json") });
    const passed = report(`check (iteration ${it.n}${scene ? `, scene ${scene}` : ""})`, scoped, { json });
    if (!json) log(`findings → ${rel(join(it.dir, scene ? `findings-${scene}.json` : "findings.json"))}${scene ? "  (scene check — run the full `ct check` before calling the project done)" : ""}`);
    return passed ? 0 : 1;
  },
};
```

The parts of `src/cli/lib/store.ts` this plan builds on (lines 1–5 and 87–130):

```ts
import { closeSync, cpSync, existsSync, mkdirSync, openSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { sourceHash } from "../../build/hash.js";
import { projectDir, stateDir } from "../../paths.js";
import type { Finding } from "../../spec/findings.js";
```

```ts
/** The iteration matching the project's current sources (created on first use). */
export function currentIteration(slug: string): { n: number; dir: string; record: IterationRecord; isNew: boolean } {
  return withStateLock(slug, () => currentIterationUnlocked(slug));
}
```

```ts
export function updateIteration(slug: string, n: number, patch: Partial<IterationRecord>) {
  …
}

export function writeFindings(dir: string, name: string, findings: Finding[]) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, name), JSON.stringify(findings, null, 2) + "\n");
}

export function readFindings(dir: string, name: string): Finding[] {
  …
}
```

`currentIteration` returns the last iteration when its hash equals the current
sources' hash, and otherwise creates a new one (it only ever compares with the
last). `it.record.hash` is therefore the hash of the sources on disk *now*.

`src/cli/commands/gate-status.ts`, lines 9 and 51–53:

```ts
import { readState } from "../lib/store.js";
```

```ts
    const { combined } = sourceHash(slug);
    const it = readState(slug).iterations.find((i) => i.hash === combined);
    const passing = Boolean(it?.gate?.ok);
```

`src/cli/commands/status.ts`, lines 7 and 22:

```ts
import { iterationDir, readState } from "../lib/store.js";
```

```ts
      current: s.iterations.find((i) => i.hash === combined)?.n ?? null,
```

Repo conventions that apply:

- TypeScript ES modules, 2-space indent, double quotes, semicolons. Relative
  imports end in `.js` even though the files are `.ts`.
- ESLint fails on unused imports (`@typescript-eslint/no-unused-vars`), so
  remove an import when its last use goes.
- A finding has the shape in `src/spec/findings.ts`:
  `{ source, rule, severity, message, suggestion?, scene?, element?, time? }`,
  with `source` one of `"schema" | "build" | "lint" | "hf-lint" | "check" | "probe" | "render" | "critic"`.
- Comments are rare, full sentences, and say why.
- Tests are vitest files named `tests/<name>.test.ts`; `tests/paths.test.ts` is
  the exemplar for temp-directory tests.
- `src/paths.ts` computes the work root **once, when it is first imported**
  (`$CT_ROOT`, else the nearest `continuity.json`). A test that needs its own
  repo must set `CT_ROOT` before anything imports `src/paths.ts`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install (only if `node_modules` is missing) | `pnpm install --frozen-lockfile` | exit 0 |
| One test file | `npx vitest run tests/store.test.ts` | all pass |
| Typecheck | `pnpm typecheck` | exit 0 |
| Lint | `pnpm lint` | exit 0 |
| Everything | `pnpm verify` | exit 0; at `25ad21d` the suite is 288 passed, 26 skipped |

## Scope

**In scope** (the only files you should modify):
- `src/cli/lib/store.ts`
- `src/cli/commands/check.ts`
- `src/cli/commands/gate-status.ts`
- `src/cli/commands/status.ts`
- `tests/store.test.ts` (create)
- `plans/README.md` (status row only)

**Out of scope** (do NOT touch, even though they look related):
- `src/build/build.ts` and `src/build/hash.ts` — `build.hash` already exists;
  what the hash covers is a separate finding.
- `src/cli/commands/render.ts`, `stills.ts`, `sheet.ts`, `beats.ts`,
  `iterate.ts` — they also call `currentIteration`, but they store evidence,
  not the gate. Leave them.
- `withStateLock` and the lock's timing in `store.ts` — a separate finding.
- `plugin/hooks/stop-gate.mjs` — it only reads `ct gate-status`.
- Line 23 of `check.ts` (how `--scene` is read) — plan 004 owns it.

## Git workflow

- Branch: `advisor/003-gate-recorded-only-for-checked-sources` (or the branch your operator gave you).
- One commit per step is fine, or one for the plan. Message style is a plain
  sentence with an area prefix, for example
  `Contrast over a moving field is sampled through the scene`.
  Suggested: `Gate: a check records only the sources it audited`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Write the failing tests

Create `tests/store.test.ts` with exactly this content:

```ts
/**
 * The iteration store against a throwaway repo. The work root is fixed when src/paths.ts is first
 * imported, so CT_ROOT is set before the store is imported: every import of engine code in this
 * file is dynamic for that reason. Do not add a static import of anything under src/.
 */
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

let root: string;
let store: typeof import("../src/cli/lib/store.js");
let sourceHash: typeof import("../src/build/hash.js").sourceHash;
const previousRoot = process.env.CT_ROOT;
const sceneFile = () => join(root, "projects", "demo", "scenes", "a.tsx");

beforeAll(async () => {
  root = mkdtempSync(join(tmpdir(), "ct-store-"));
  writeFileSync(join(root, "continuity.json"), "{}");
  mkdirSync(join(root, "projects", "demo", "scenes"), { recursive: true });
  writeFileSync(join(root, "projects", "demo", "storyboard.json"), "{}");
  writeFileSync(sceneFile(), "export default 1;\n");
  process.env.CT_ROOT = root;
  const paths = await import("../src/paths.js");
  // If this fails, src/paths.ts was imported before CT_ROOT was set and the tests would write into the real repo.
  expect(paths.PROJECTS_DIR).toBe(join(root, "projects"));
  store = await import("../src/cli/lib/store.js");
  ({ sourceHash } = await import("../src/build/hash.js"));
});

afterAll(() => {
  if (previousRoot === undefined) delete process.env.CT_ROOT;
  else process.env.CT_ROOT = previousRoot;
  rmSync(root, { recursive: true, force: true });
});

describe("recordCheck", () => {
  it("records the gate on the iteration of the sources that were audited", () => {
    const r = store.recordCheck("demo", sourceHash("demo").combined, []);
    expect(r.stale).toBe(false);
    expect(existsSync(r.findingsFile!)).toBe(true);
    expect(store.readState("demo").iterations.at(-1)!.gate?.ok).toBe(true);
  });

  it("records nothing when the sources changed while the check ran", () => {
    const built = sourceHash("demo").combined;
    writeFileSync(sceneFile(), "export default 2;\n");
    const r = store.recordCheck("demo", built, []);
    expect(r.stale).toBe(true);
    expect(r.findingsFile).toBeNull();
    expect(r.findings.map((f) => `${f.severity}:${f.rule}`)).toEqual(["error:sources-changed"]);
    const last = store.readState("demo").iterations.at(-1)!;
    expect(last.hash).toBe(sourceHash("demo").combined);
    expect(last.gate).toBeUndefined();
    expect(existsSync(join(store.iterationDir("demo", last.n), "findings.json"))).toBe(false);
  });

  it("a scene check stores its findings and never sets the gate", () => {
    writeFileSync(sceneFile(), "export default 3;\n");
    const r = store.recordCheck("demo", sourceHash("demo").combined, [], "a");
    expect(r.findingsFile!.endsWith("findings-a.json")).toBe(true);
    expect(store.readState("demo").iterations.at(-1)!.gate).toBeUndefined();
  });

  it("an error finding records a failed gate", () => {
    writeFileSync(sceneFile(), "export default 4;\n");
    store.recordCheck("demo", sourceHash("demo").combined, [{ source: "lint", rule: "read-time", severity: "error", message: "x" }]);
    expect(store.readState("demo").iterations.at(-1)!.gate).toMatchObject({ ok: false, errors: 1 });
  });
});

describe("iterationForHash", () => {
  it("returns the newest iteration with that hash", () => {
    const gate = { ok: true, errors: 0, warnings: 0, at: "" };
    const state = {
      verdicts: [],
      iterations: [
        { n: 1, hash: "aaa", createdAt: "" },
        { n: 2, hash: "bbb", createdAt: "" },
        { n: 3, hash: "aaa", createdAt: "", gate },
      ],
    };
    expect(store.iterationForHash(state, "aaa")?.n).toBe(3);
    expect(store.iterationForHash(state, "zzz")).toBeUndefined();
  });
});
```

**Verify**: `npx vitest run tests/store.test.ts` → all 5 tests fail with
`store.recordCheck is not a function` or `store.iterationForHash is not a function`.
The `beforeAll` itself must **not** fail. If it does, see STOP conditions.

### Step 2: Add `iterationForHash` and `recordCheck` to the store

In `src/cli/lib/store.ts`:

1. Change line 5 from

   ```ts
   import type { Finding } from "../../spec/findings.js";
   ```

   to

   ```ts
   import { countBySeverity, type Finding } from "../../spec/findings.js";
   ```

2. Insert this block directly after the `readFindings` function and before the
   `/** Restore a previous iteration's sources … */` comment:

   ```ts
   /** The newest iteration recorded for these sources (a hash recurs after an undo or a restore). */
   export function iterationForHash(state: ProjectState, hash: string): IterationRecord | undefined {
     return state.iterations.findLast((i) => i.hash === hash);
   }

   export interface CheckRecord {
     iteration: number;
     /** Where the findings were written; null when nothing was recorded. */
     findingsFile: string | null;
     /** The findings to report (with `sources-changed` added when the sources moved). */
     findings: Finding[];
     /** The sources changed while the check ran: nothing was recorded. */
     stale: boolean;
   }

   /**
    * Store a check's findings and, for a full check, its gate result on the iteration of the sources
    * that were audited. `builtHash` is the build's hash, taken before the audit: if the sources on
    * disk no longer match it, the result belongs to an earlier version and nothing is recorded.
    */
   export function recordCheck(slug: string, builtHash: string, findings: Finding[], scene?: string): CheckRecord {
     const it = currentIteration(slug);
     if (it.record.hash !== builtHash) {
       const changed: Finding = {
         source: "check",
         rule: "sources-changed",
         severity: "error",
         message: "the project's sources changed while the check was running, so this result is for an earlier version and was not recorded",
         suggestion: `run \`npx ct check ${slug}\` again`,
       };
       return { iteration: it.n, findingsFile: null, findings: [...findings, changed], stale: true };
     }
     const name = scene ? `findings-${scene}.json` : "findings.json";
     writeFindings(it.dir, name, findings);
     const c = countBySeverity(findings);
     if (!scene) updateIteration(slug, it.n, { gate: { ok: c.errors === 0, errors: c.errors, warnings: c.warnings, at: new Date().toISOString() } });
     return { iteration: it.n, findingsFile: join(it.dir, name), findings, stale: false };
   }
   ```

**Verify**: `npx vitest run tests/store.test.ts` → 5 passed.

### Step 3: Make `ct check` record through `recordCheck`

In `src/cli/commands/check.ts`:

1. Delete line 1, `import { join } from "node:path";`.
2. Change `import { countBySeverity, type Finding } from "../../spec/findings.js";`
   to `import type { Finding } from "../../spec/findings.js";`.
3. Change `import { currentIteration, updateIteration, writeFindings } from "../lib/store.js";`
   to `import { recordCheck } from "../lib/store.js";`.
4. Replace everything from the line `const scoped = scene ? …` through
   `return passed ? 0 : 1;` (nine lines) with:

   ```ts
       const scoped = scene ? all.filter((f) => !f.scene || f.scene === scene) : all;
       // The audit ran on the sources as they were when the build started (build.hash): the result
       // is recorded for those sources only, never for an edit that landed while it ran.
       const rec = recordCheck(slug, build.hash, scoped, scene);
       emitResult({ iteration: rec.iteration, scene: scene ?? null, findingsFile: rec.findingsFile });
       const passed = report(`check (iteration ${rec.iteration}${scene ? `, scene ${scene}` : ""})`, rec.findings, { json });
       if (!json && rec.findingsFile) log(`findings → ${rel(rec.findingsFile)}${scene ? "  (scene check — run the full `ct check` before calling the project done)" : ""}`);
       return passed ? 0 : 1;
   ```

   The two comment lines above `const scoped` ("Scene mode builds the other
   scenes as placeholders…") stay as they are.

**Verify**: `pnpm typecheck` → exit 0, and `pnpm lint` → exit 0.

### Step 4: Read the newest iteration in `gate-status` and `status`

1. `src/cli/commands/gate-status.ts`: change the import on line 9 to
   `import { iterationForHash, readState } from "../lib/store.js";` and line 52 to

   ```ts
       const it = iterationForHash(readState(slug), combined);
   ```

2. `src/cli/commands/status.ts`: change the import on line 7 to
   `import { iterationDir, iterationForHash, readState } from "../lib/store.js";`
   and line 22 to

   ```ts
         current: iterationForHash(s, combined)?.n ?? null,
   ```

**Verify**: `pnpm typecheck` → exit 0, and
`grep -rn "iterations.find(" src/cli/commands/gate-status.ts src/cli/commands/status.ts`
prints nothing.

### Step 5: Full verification

**Verify**: `pnpm verify` → exit 0; 0 failed, and the passed count is 5 higher
than before this plan.

### Step 6 (only if a headless Chrome is available): the real command still records

Run `node bin/ct.mjs doctor`. If it does not show a `✔ chrome` line, skip this
step and say so in your report.

```bash
node bin/ct.mjs check _smoke; echo "exit $?"
```

Expected: the output contains a line starting `check (iteration ` and a line
starting `findings → projects/_smoke/.continuity/iterations/`, and the exit
code is `0` or `1` (either is acceptable here; this step proves the command
still runs and records, not that `_smoke` passes on your Chrome).

Then `git status --short` must show no change under `projects/` (the evidence
folder is gitignored).

## Test plan

- New file `tests/store.test.ts`, five tests, all browserless:
  - a check with unchanged sources records the gate and writes `findings.json`;
  - **the regression**: an edit between the build and the record gives
    `stale: true`, a `sources-changed` error, no gate and no findings file on
    the new iteration;
  - a scene check writes `findings-<scene>.json` and never sets the gate;
  - an error finding records `gate.ok: false`;
  - `iterationForHash` returns the newest iteration with a given hash.
- The temp-repo set-up follows `tests/paths.test.ts` (`mkdtempSync` under the
  OS temp dir) and `tests/mcp.test.ts` (`CT_ROOT` selects the repo).
- `check.ts` itself needs a browser, so its use of `recordCheck` is covered by
  the typecheck and the optional Step 6, not by a unit test.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npx vitest run tests/store.test.ts` → 5 passed
- [ ] `pnpm verify` exits 0
- [ ] `grep -n "currentIteration\|updateIteration\|writeFindings" src/cli/commands/check.ts` prints nothing
- [ ] `grep -c "recordCheck(slug, build.hash, scoped, scene)" src/cli/commands/check.ts` → `1`
- [ ] `grep -rn "iterations.find(" src/cli/commands/gate-status.ts src/cli/commands/status.ts` prints nothing
- [ ] `git status --short` lists only the five in-scope source and test files plus `plans/README.md`
- [ ] No directory `projects/demo` exists in the repo (`ls projects/demo` fails): the tests must not have written into the real repo
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The excerpts in "Current state" do not match the live code, other than the
  line-23 difference named in the drift check.
- In Step 1 the `beforeAll` fails on `expect(paths.PROJECTS_DIR).toBe(…)`. That
  means something imported `src/paths.ts` before the test set `CT_ROOT`; the
  remaining tests would write into the real repo. Do not work around it by
  removing the assertion.
- After Step 2 a test in another file starts failing in `pnpm test`. The likely
  cause is `CT_ROOT` leaking out of this test file; report it rather than
  changing other tests.
- `Array.prototype.findLast` is rejected by the typecheck (it should not be:
  `tsconfig.json` sets `lib` to ES2023).
- You find yourself wanting to change `build.ts`, `hash.ts` or the lock.

## Maintenance notes

- `build.hash` is taken at the start of `buildProject`, a moment before the
  scene files are imported. An edit in that sliver is still not detected; the
  window is milliseconds instead of the length of the audit.
- When a check reports `sources-changed`, the right response is to run it again
  once the edits have stopped. Agents will meet this when a scene-builder is
  still writing; that is the gate working.
- Any new command that records a gate must go through `recordCheck`, never
  `updateIteration({ gate })` directly.
- `iterationForHash` is the single way to ask "which iteration is this hash".
  `currentIteration` still creates a second iteration when sources return to an
  earlier state; making it reuse the earlier one is a possible follow-up, and
  it would change iteration numbering, so it was left out.
- Related findings recorded in `plans/README.md` and not fixed here: the engine
  hash does not cover `src/spec` or `src/lint`; `ct score` and `ct verdict`
  write state without the state lock.
- A reviewer should check that `ct check --json` still prints one JSON document
  and that the MCP `check` tool's `findingsFile` is allowed to be `null`.
