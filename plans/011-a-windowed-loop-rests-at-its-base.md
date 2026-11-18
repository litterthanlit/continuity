# Plan 011: A loop outside its window writes its resting value

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 09b0d13..HEAD -- src/motion/evaluate.ts tests/loops.test.ts`
> If any of these changed since this plan was written, the diff in Step 2 may
> not apply; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `09b0d13`, 2026-11-18

## Why this matters

Continuity's central promise is that a frame is a pure function of time: frames
are seeked, not played, and renders are byte-identical across worker counts. A
loop with a window breaks it. `m.blink(id, { at, until })` (and `m.retype(…, { caret })`,
which uses it) animates opacity only between `at` and `until`. Outside that
window the evaluator returns no value for the property, so the runtime writes
nothing and the element keeps whatever the previous seek left on it. A frame
after the window therefore depends on which frame was drawn before it: a caret
freezes at its last blink value in one worker and shows fully in another that
started later. After this plan a loop outside its window returns the property's
resting value, so every frame writes it.

## Current state

- `src/motion/evaluate.ts` — `sampleScene`: inside the loop over an element's
  loops, `if (t < l.start || (l.end !== null && t > l.end)) continue;`.
- `src/runtime/index.ts` — `apply` only writes a style when the sampled value is
  defined (`if (s.opacity !== undefined) st.opacity = s.opacity;`). Not changed.
- `baseValue(bases, target, prop)` in `evaluate.ts` is the resting value a loop
  already oscillates around (1 for opacity).

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install (only if `node_modules` is missing) | `PUPPETEER_SKIP_DOWNLOAD=1 pnpm install --frozen-lockfile` | exit 0 |
| The new tests | `npx vitest run tests/loops.test.ts` | all pass |
| Typecheck and lint | `pnpm typecheck && pnpm lint` | exit 0 |
| Everything | `pnpm verify` | exit 0; at `09b0d13` the suite is 304 passed, 26 skipped |

Conventions: TypeScript ES modules, 2-space indent, double quotes, semicolons;
relative imports end in `.js`. Comments are rare, full sentences, and say why.
The code and tests below were run against `09b0d13` before this plan was written:
the tests fail without the change and pass with it, and the whole suite
(including the browser suite) passes with it.

## Scope

**In scope**: `src/motion/evaluate.ts` (the one `continue` in `sampleScene`), `tests/loops.test.ts` (create), `plans/README.md` (status row).

**Out of scope**: `src/runtime/index.ts`, `MotionBuilder.loop` / `blink` / `retype`, the golden files under `tests/golden/`.

## Git workflow

- Branch: `advisor/011-a-windowed-loop-rests-at-its-base` (or the branch your operator gave you).
- One commit. Message style is a plain sentence with an area prefix. Suggested: `Motion: a loop outside its window writes its resting value`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Write the failing tests

Create `tests/loops.test.ts` with exactly this content:

```ts
import { describe, expect, it } from "vitest";
import { MotionBuilder } from "../src/motion/dsl.js";
import { compileScene, sampleScene } from "../src/motion/evaluate.js";
import type { SceneTimeline } from "../src/motion/types.js";

const scene = (mb: MotionBuilder): SceneTimeline => ({ scene: mb.scene, start: 0, duration: mb.duration, beats: mb.beats, tweens: mb.tweens, loops: mb.loops });
const opacity = (m: MotionBuilder, id: string, t: number) => sampleScene(compileScene(scene(m), {}, 30), t).get(id)?.opacity;

describe("a loop with a window (frames are seeked, so every frame writes its value)", () => {
  it("rests at the base before its start and after its end", () => {
    const m = new MotionBuilder("s", 4, {});
    m.blink("caret", { at: 1, until: 2 });
    expect(opacity(m, "s.caret", 0.5)).toBe(1);
    expect(opacity(m, "s.caret", 2.5)).toBe(1);
    expect(opacity(m, "s.caret", 1.5)).not.toBeUndefined();
  });

  it("two windows on one element: between them and inside the second", () => {
    const m = new MotionBuilder("s", 6, {});
    m.blink("caret", { at: 1, until: 2 });
    m.blink("caret", { at: 4 });
    expect(opacity(m, "s.caret", 3)).toBe(1);
    const inside = [4.1, 4.3, 4.6, 4.8].map((t) => opacity(m, "s.caret", t));
    expect(inside.every((v) => v !== undefined)).toBe(true);
    expect(new Set(inside).size).toBeGreaterThan(1);
  });
});
```

**Verify**: `npx vitest run tests/loops.test.ts` → 2 failed (both receive `undefined`).

### Step 2: Make the change

Apply exactly this diff (by hand, or save it to a file and run `git apply <file>`). Do not change anything else in these files.

```diff
diff --git a/src/motion/evaluate.ts b/src/motion/evaluate.ts
index 746d802..1c7d6c9 100644
--- a/src/motion/evaluate.ts
+++ b/src/motion/evaluate.ts
@@ -282,7 +282,12 @@ export function sampleScene(c: CompiledScene, t: number): Map<string, Values> {
     const loops = c.loops.get(key);
     if (loops) {
       for (const l of loops) {
-        if (t < l.start || (l.end !== null && t > l.end)) continue;
+        // Outside its window a loop rests at the base, written out: frames are seeked, so one that
+        // wrote nothing would keep whatever the last seek drew.
+        if (t < l.start || (l.end !== null && t > l.end)) {
+          if (v[l.prop] === undefined) v[l.prop] = baseValue(c.bases, key.split("::")[0], l.prop);
+          continue;
+        }
         const base = v[l.prop] ?? baseValue(c.bases, key.split("::")[0], l.prop);
         v[l.prop] = base + l.amplitude * Math.sin(2 * Math.PI * ((t - l.start) / l.period + l.phase));
       }
```

**Verify**: `npx vitest run tests/loops.test.ts` → 2 passed, and `npx vitest run tests/motion.test.ts` → all pass.

If a headless Chrome is available (`node bin/ct.mjs doctor` shows `✔ chrome`), also run
`CT_SLOW=1 npx vitest run tests/browser.slow.test.ts -t "golden"` → 4 passed. The golden frames must not change; do **not** set `CT_UPDATE_GOLDEN`. Without a browser, skip this and say so in your report.

### Step 3: Full verification

**Verify**: `pnpm typecheck && pnpm lint` → exit 0, then `pnpm verify` → exit 0 with 0 failed.

## Test plan

`tests/loops.test.ts`: a windowed blink samples to the resting opacity before its start and
after its end and to a value inside it; with two windows on one element, the
gap between them rests and the second window still oscillates.

## Done criteria

- [ ] `npx vitest run tests/loops.test.ts` → all pass
- [ ] `pnpm verify` exits 0
- [ ] `git status --short` lists only: `src/motion/evaluate.ts`, `tests/loops.test.ts` and `plans/README.md`
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The diff in Step 2 does not apply cleanly, or its context lines do not match the file.
- In Step 1 the new tests do not fail the way the step says (the defect is not reproducing).
- After Step 2 a test in another file fails.
- The golden-frame run fails. A shipped gallery then depended on the stale value; report which project and time. Do not regenerate goldens.

## Maintenance notes

- The resting value is the neutral one (opacity 1), the same the loop already uses inside its window. An element that should be hidden outside the window needs an opacity tween, as before.
- `src/motion` is part of the engine hash, so every project starts a new iteration on its next `ct` command.
- Not covered: a browser test that renders the same windowed blink with 1 and 4 workers and compares frames (`scripts/gl-bench.mjs --determinism` is the tool).
