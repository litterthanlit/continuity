# Plan 010: `"after:card-2"` means the element card-2

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 09b0d13..HEAD -- src/motion/dsl.ts tests/time-refs.test.ts`
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

Motion code names times with strings such as `"b1"`, `"b1+0.2"`, `"end-0.5"` and
`"after:title"`. The parser reads a trailing `-N` as an offset in seconds, but
ids may end in `-N` too: the kit generates `<id>-0`, `<id>-1`, … for list items,
and beats may be named `drop-2`. So `"after:card-2"` is read as "2 seconds
before `card` ends": silently the wrong time when `card` has motion, a
misleading error when it does not. After this plan a string that names an
existing beat or an element with motion is taken whole; only otherwise is the
tail read as an offset.

## Current state

- `src/motion/dsl.ts` — `MotionBuilder.time(at)` matches
  `/^\s*([A-Za-z_][\w:.-]*?)\s*(?:([+-])\s*(\d*\.?\d+))?\s*$/`. The reference
  group is lazy, so the offset group takes `-2` whenever it can.
- `endOf(el)` returns when an element's last tween ends, and throws
  `"after:<el>" — no motion declared on "<el>" yet.` when it has none.
- Unchanged behaviour to keep: `"b1-0.5"`, `"end-0.5"`, `"beat:4-0.05"` and
  `"after:card-0.1"` (where no element `card-0.1` exists) are still a reference
  plus an offset.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install (only if `node_modules` is missing) | `PUPPETEER_SKIP_DOWNLOAD=1 pnpm install --frozen-lockfile` | exit 0 |
| The new tests | `npx vitest run tests/time-refs.test.ts` | all pass |
| Typecheck and lint | `pnpm typecheck && pnpm lint` | exit 0 |
| Everything | `pnpm verify` | exit 0; at `09b0d13` the suite is 304 passed, 26 skipped |

Conventions: TypeScript ES modules, 2-space indent, double quotes, semicolons;
relative imports end in `.js`. Comments are rare, full sentences, and say why.
The code and tests below were run against `09b0d13` before this plan was written:
the tests fail without the change and pass with it, and the whole suite
(including the browser suite) passes with it.

## Scope

**In scope**: `src/motion/dsl.ts` (`time` and a new private `refTime` only), `tests/time-refs.test.ts` (create), `plans/README.md` (status row).

**Out of scope**: the storyboard's id rules, `endOf`, `onMusic` and `push` (plan 009 changes those last two — different parts of the same file; run the plans one after the other).

## Git workflow

- Branch: `advisor/010-time-refs-with-numbered-ids` (or the branch your operator gave you).
- One commit. Message style is a plain sentence with an area prefix. Suggested: `Motion: "after:card-2" follows card-2`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Write the failing tests

Create `tests/time-refs.test.ts` with exactly this content:

```ts
import { describe, expect, it } from "vitest";
import { MotionBuilder } from "../src/motion/dsl.js";

describe("time references whose id ends in a number", () => {
  it('"after:card-2" follows the element card-2, not card minus 2 seconds', () => {
    const m = new MotionBuilder("s", 8, {});
    m.enter("card", "fade", { at: 0.5 });
    m.enter("card-2", "fade", { at: 3 });
    expect(m.time("after:card-2")).toBe(m.endOf("card-2"));
    expect(m.time("after:card-2+0.1")).toBeCloseTo(m.endOf("card-2") + 0.1, 3);
    expect(m.time("after:card")).toBe(m.endOf("card"));
  });

  it("a beat named drop-2 is that beat", () => {
    const m = new MotionBuilder("s", 8, { drop: 5, "drop-2": 1 });
    expect(m.time("drop-2")).toBe(1);
    expect(m.time("drop")).toBe(5);
    expect(m.time("drop-2+0.5")).toBe(1.5);
  });

  it("an offset still works where no such id exists", () => {
    const m = new MotionBuilder("s", 8, { b1: 2 });
    m.enter("card", "fade", { at: 0.5 });
    expect(m.time("b1-0.5")).toBe(1.5);
    expect(m.time("end-0.5")).toBe(7.5);
    expect(m.time("after:card-0.1")).toBeCloseTo(m.endOf("card") - 0.1, 3);
  });

  it("still explains a reference to nothing", () => {
    const m = new MotionBuilder("s", 8, { b1: 2 });
    expect(() => m.time("after:row-1")).toThrow(/no motion declared on "row-1"|no motion declared on "row"/);
    expect(() => m.time("nope")).toThrow(/Unknown beat "nope"/);
  });
});
```

**Verify**: `npx vitest run tests/time-refs.test.ts` → 2 failed, 2 passed. The failures are the `after:card-2` and `drop-2` cases.

### Step 2: Make the change

Apply exactly this diff (by hand, or save it to a file and run `git apply <file>`). Do not change anything else in these files.

```diff
diff --git a/src/motion/dsl.ts b/src/motion/dsl.ts
index cce104e..4510ba9 100644
--- a/src/motion/dsl.ts
+++ b/src/motion/dsl.ts
@@ -141,22 +141,31 @@ export class MotionBuilder {
   time(at: At | undefined, fallback = 0): number {
     if (at === undefined) return fallback;
     if (typeof at === "number") return at;
+    // The whole string first: an id may end in "-2" (card-2, drop-2), which is not "minus 2 seconds".
+    const whole = this.refTime(at.trim());
+    if (whole !== undefined) return round(whole);
     const m = /^\s*([A-Za-z_][\w:.-]*?)\s*(?:([+-])\s*(\d*\.?\d+))?\s*$/.exec(at);
     if (!m) throw new MotionError(`[${this.scene}] Can't parse time "${at}". Use seconds, "b1", "b1+0.2", "end-0.5", "after:el" or "beat:4".`);
     const [, ref, sign, num] = m;
     const offset = num ? (sign === "-" ? -1 : 1) * Number(num) : 0;
+    const base = this.refTime(ref);
+    if (base !== undefined) return round(base + offset);
+    // endOf explains an "after:" with nothing to follow.
+    if (ref.startsWith("after:")) return round(this.endOf(ref.slice(6)) + offset);
+    throw new MotionError(`[${this.scene}] Unknown beat "${ref}". Beats in this scene: ${Object.keys(this.beats).join(", ") || "(none)"}`);
+  }
+
+  /** The scene time a reference names (a beat, "start", "end", "after:el", "beat:4"), or undefined when it names nothing here. */
+  private refTime(ref: string): number | undefined {
+    if (ref === "end") return this.duration;
+    if (ref === "start") return 0;
     const onMusic = /^(beat|bar|hit):(\d*\.?\d+)$/.exec(ref);
-    let base: number;
-    if (ref === "end") base = this.duration;
-    else if (ref === "start") base = 0;
-    else if (ref.startsWith("after:")) base = this.endOf(ref.slice(6));
-    else if (onMusic) base = this.onMusic(onMusic[1] as "beat" | "bar" | "hit", Number(onMusic[2]));
-    else if (ref in this.beats) base = this.beats[ref];
-    else
-      throw new MotionError(
-        `[${this.scene}] Unknown beat "${ref}". Beats in this scene: ${Object.keys(this.beats).join(", ") || "(none)"}`,
-      );
-    return round(base + offset);
+    if (onMusic) return this.onMusic(onMusic[1] as "beat" | "bar" | "hit", Number(onMusic[2]));
+    if (ref.startsWith("after:")) {
+      const id = this.id(ref.slice(6));
+      return this.tweens.some((t) => t.target === id) ? this.endOf(ref.slice(6)) : undefined;
+    }
+    return ref in this.beats ? this.beats[ref] : undefined;
   }
 
   /** Scene time of the scene's Nth beat, bar or hit (0 = the first at or after its start). */
```

**Verify**: `npx vitest run tests/time-refs.test.ts` → 4 passed, and `npx vitest run tests/motion.test.ts tests/music.test.ts tests/transitions.test.ts` → all pass.

### Step 3: Full verification

**Verify**: `pnpm typecheck && pnpm lint` → exit 0, then `pnpm verify` → exit 0 with 0 failed.

## Test plan

`tests/time-refs.test.ts`: `"after:card-2"` and `"after:card-2+0.1"` follow `card-2`; a beat named
`drop-2` is that beat; offsets still work where no such id exists; a reference
to nothing still throws its explanation.

## Done criteria

- [ ] `npx vitest run tests/time-refs.test.ts` → all pass
- [ ] `pnpm verify` exits 0
- [ ] `git status --short` lists only: `src/motion/dsl.ts`, `tests/time-refs.test.ts` and `plans/README.md`
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The diff in Step 2 does not apply cleanly, or its context lines do not match the file.
- In Step 1 the new tests do not fail the way the step says (the defect is not reproducing).
- After Step 2 a test in another file fails.
- A project in `projects/` stops building (`pnpm test` runs `tests/lint.test.ts` over them): a shipped scene relied on the old reading. Report the scene and the string.

## Maintenance notes

- A string that is both an existing id and a shorter id plus an offset now means the id. That is the intended reading; say so in review if a scene depended on the other.
- `src/motion` is part of the engine hash, so every project starts a new iteration on its next `ct` command.
