# Plan 009: A track with no tempo is an error, not infinite scenes

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 09b0d13..HEAD -- src/spec/storyboard.ts src/motion/dsl.ts tests/no-tempo.test.ts`
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

When the music analyser finds no tempo (silence, an ambient pad, a short
stinger) it returns `bpm: 0` and no beats. The storyboard then divides by that
bpm: a scene timed `{ "beats": 4 }` gets a duration of `Infinity`, a beat
`{ "beat": 0 }` resolves to `NaN`, and `"beat:0"` in motion code gives a
tween a `NaN` start. Every lint comparison against `NaN` is false, so the gate
says nothing, and `NaN` is written into the built page as `null`. After this
plan each of those is a clear error that names the fix (`"bpm"` on `"music"`).

## Current state

- `src/spec/storyboard.ts` — `resolveTiming` computes `const step = 60 / (grid?.bpm ?? sb.bpm ?? 120);`.
  `??` does not catch `0`.
- `src/motion/dsl.ts` — `onMusic` calls `musicAt(…, 60 / m.bpm)`; `push` rejects a
  negative start but lets `NaN` through (`NaN < 0` is false).
- A track with hits but no tempo can still be used with `{ "hit": N }` and
  `"hit:N"`; this plan keeps that working. A track given an explicit `"bpm"`
  has a tempo and is unaffected.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install (only if `node_modules` is missing) | `PUPPETEER_SKIP_DOWNLOAD=1 pnpm install --frozen-lockfile` | exit 0 |
| The new tests | `npx vitest run tests/no-tempo.test.ts` | all pass |
| Typecheck and lint | `pnpm typecheck && pnpm lint` | exit 0 |
| Everything | `pnpm verify` | exit 0; at `09b0d13` the suite is 304 passed, 26 skipped |

Conventions: TypeScript ES modules, 2-space indent, double quotes, semicolons;
relative imports end in `.js`. Comments are rare, full sentences, and say why.
The code and tests below were run against `09b0d13` before this plan was written:
the tests fail without the change and pass with it, and the whole suite
(including the browser suite) passes with it.

## Scope

**In scope**: `src/spec/storyboard.ts` (`resolveTiming` only), `src/motion/dsl.ts` (`onMusic` and `push` only), `tests/no-tempo.test.ts` (create), `plans/README.md` (status row).

**Out of scope**: `src/audio/analyze.ts` (returning 0 bpm for a tempo-less track is correct), `MotionBuilder.time` (plan 010 changes it — these two plans edit different parts of `dsl.ts`; run them one after the other).

## Git workflow

- Branch: `advisor/009-a-track-with-no-tempo-is-an-error` (or the branch your operator gave you).
- One commit. Message style is a plain sentence with an area prefix. Suggested: `Music: a track with no tempo is an error where beats are counted`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Write the failing tests

Create `tests/no-tempo.test.ts` with exactly this content:

```ts
import { describe, expect, it } from "vitest";
import type { BeatAnalysis } from "../src/audio/analyze.js";
import { musicGrid, sceneMusic } from "../src/audio/grid.js";
import { MotionBuilder } from "../src/motion/dsl.js";
import { parseStoryboard } from "../src/spec/storyboard.js";

/** What the analyser returns for silence, a pad or a short stinger: no tempo, no beats. */
const flat: BeatAnalysis = { sampleRate: 22050, duration: 4, bpm: 0, beatsPerBar: 4, beats: [], downbeats: [], onsets: [], envelope: { hop: 0.01, values: [] } };
const grid = musicGrid(flat, { start: 0, offset: 0 });
const sb = (scenes: unknown[]) => ({ title: "t", format: { aspect: "16:9", fps: 30 }, music: { src: "assets/music.wav" }, scenes });
const scene = (id: string, duration: unknown, more: Record<string, unknown> = {}) => ({ id, duration, intent: "test scene", ...more });

describe("a track with no tempo", () => {
  it("is a storyboard issue when a scene is counted in beats", () => {
    const r = parseStoryboard(sb([scene("a", { beats: 4 }), scene("b", 2)]), { grid });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.issues.join("\n")).toMatch(/no tempo could be found/);
  });

  it("is a storyboard issue when a beat is counted on the music", () => {
    const r = parseStoryboard(sb([scene("a", 2, { beats: [{ id: "b1", at: { beat: 0 } }] })]), { grid });
    expect(r.ok).toBe(false);
  });

  it("is fine under scenes timed in seconds", () => {
    const r = parseStoryboard(sb([scene("a", 2, { beats: [{ id: "b1", at: 0.5 }] })]), { grid });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.scenes[0].duration).toBe(2);
  });

  it('makes "beat:0" in motion code an error, never a NaN start', () => {
    const m = new MotionBuilder("s", 2, {}, undefined, undefined, undefined, sceneMusic(grid, 0, 2, 30));
    expect(() => m.enter("x", "fade", { at: "beat:0" })).toThrow(/no tempo could be found/);
    expect(m.tweens).toEqual([]);
  });
});
```

**Verify**: `npx vitest run tests/no-tempo.test.ts` → 3 failed, 1 passed (the seconds-only case passes before and after).

### Step 2: Make the change

Apply exactly this diff (by hand, or save it to a file and run `git apply <file>`). Do not change anything else in these files.

```diff
diff --git a/src/spec/storyboard.ts b/src/spec/storyboard.ts
index 9a691b4..d9bfdab 100644
--- a/src/spec/storyboard.ts
+++ b/src/spec/storyboard.ts
@@ -234,7 +234,14 @@ function round(n: number) {
  * the music.
  */
 function resolveTiming(sb: z.infer<typeof StoryboardSchema>, grid: MusicGrid | undefined, issues: string[]): Storyboard {
-  const step = 60 / (grid?.bpm ?? sb.bpm ?? 120);
+  // A track with no tempo to count (silence, a pad, a stinger) analyses to 0 bpm. Dividing by it made
+  // every scene timed in beats infinitely long, with no finding; say so instead.
+  const tempo = grid && grid.bpm > 0 ? grid.bpm : undefined;
+  const counted = (at: unknown) => typeof at === "object" && at !== null && ("beat" in at || "bar" in at);
+  if (grid && !tempo && sb.scenes.some((s) => typeof s.duration !== "number" || s.beats.some((b) => counted(b.at)))) {
+    issues.push('music: no tempo could be found in the track, so nothing can be counted in beats or bars — set "bpm" on "music", or time the scenes in seconds');
+  }
+  const step = 60 / (tempo ?? sb.bpm ?? 120);
   const fps = sb.format.fps;
   let t = 0;
   const scenes = sb.scenes.map((s, i): SceneSpec => {
diff --git a/src/motion/dsl.ts b/src/motion/dsl.ts
index cce104e..4510ba9 100644
--- a/src/motion/dsl.ts
+++ b/src/motion/dsl.ts
@@ -164,6 +173,7 @@ export class MotionBuilder {
     const m = this.music;
     if (!m) throw new MotionError(`[${this.scene}] "${kind}:${n}" needs music — add "music" to the storyboard.`);
     if (kind === "hit" && !Number.isInteger(n)) throw new MotionError(`[${this.scene}] hits are counted in whole numbers ("hit:${Math.floor(n)}").`);
+    if (kind !== "hit" && !(m.bpm > 0)) throw new MotionError(`[${this.scene}] "${kind}:${n}" — no tempo could be found in the track. Set "bpm" on "music" in the storyboard.`);
     const t = musicAt(m, kind === "beat" ? { beat: n } : kind === "bar" ? { bar: n } : { hit: n }, 0, 60 / m.bpm);
     if (t === undefined) throw new MotionError(`[${this.scene}] there is no hit ${n} in this scene (it has ${m.hits.length}).`);
     // On the video's frames, as the storyboard's beats are: rounding on the scene's clock could
@@ -673,6 +683,7 @@ export class MotionBuilder {
   }
 
   private push(t: Tween) {
+    if (!Number.isFinite(t.start)) throw new MotionError(`[${this.scene}] ${t.target} starts at a time that is not a number.`);
     if (t.start < 0) throw new MotionError(`[${this.scene}] ${t.target} starts before the scene (${t.start}s).`);
     if (!(t.duration >= 0)) throw new MotionError(`[${this.scene}] ${t.target} has an invalid duration.`);
     const clean = Object.fromEntries(Object.entries(t).filter(([, v]) => v !== undefined)) as unknown as Tween;
```

**Verify**: `npx vitest run tests/no-tempo.test.ts` → 4 passed, and `npx vitest run tests/music.test.ts tests/motion.test.ts` → all pass.

### Step 3: Full verification

**Verify**: `pnpm typecheck && pnpm lint` → exit 0, then `pnpm verify` → exit 0 with 0 failed.

## Test plan

`tests/no-tempo.test.ts`: a scene counted in beats, and a beat counted on the music, are each a
storyboard issue; scenes timed in seconds still parse; `"beat:0"` in motion code
throws and adds no tween.

## Done criteria

- [ ] `npx vitest run tests/no-tempo.test.ts` → all pass
- [ ] `pnpm verify` exits 0
- [ ] `git status --short` lists only: `src/spec/storyboard.ts`, `src/motion/dsl.ts`, `tests/no-tempo.test.ts` and `plans/README.md`
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The diff in Step 2 does not apply cleanly, or its context lines do not match the file.
- In Step 1 the new tests do not fail the way the step says (the defect is not reproducing).
- After Step 2 a test in another file fails.

## Maintenance notes

- `src/motion` is part of the engine hash, so every project starts a new iteration on its next `ct` command.
- `push` now refuses any non-finite start, whatever its cause; a new source of `NaN` times will surface there.
