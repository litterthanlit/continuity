# Flow Benchmark, Layered Handoffs and Match Cuts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove the flow moves on a real film (re-cut `example-launch`), then make handoffs layered (staggered, parallax by depth) and match cuts physical (velocity carried through the cut, shape and colour matched), validated against that re-cut.

**Architecture:** First a benchmark: score today's `example-launch`, re-cut it with the existing `carry`/`portal`, and score it again, so later engine work is judged against a real film rather than a gallery. The engine work then rests on one foundation: additive offset channels (`shiftX`/`shiftY`) and an `impulse` ease. Without them a transition cannot move an element that is also running its own entrance. Layered handoffs are transition tweens on each top-level storyboard element: depth from its role, order from its anchor. Match v2 measures the partner's velocity, fill and corner at prepare, the same way `match` already measures its place.

**Tech Stack:** TypeScript, the motion evaluator (`src/motion/evaluate.ts`, `easing.ts`), transitions (`src/motion/transitions.ts`), the browser runtime (`src/runtime/index.ts`), vitest (+ `CT_SLOW=1`), the `ct` CLI and the `critic` agent.

**Spec:** the user's request (2026-11-06, in session): *"there's a lot of room for improvement in terms of flow, match cuts, transitions, it still feels very rigid compared to actual motion design"*, then *"have transitions and match cuts been fixed?"* → this plan. It also builds on `docs/decisions/0010-flow-through-the-cut.md`, whose "Not done yet" list is items 1 and 3 here.

## Global Constraints

- A frame is a pure function of t: no clock, no randomness, no state between frames. Everything measured is measured once at prepare (as `match`/`portal`/`focus` already are).
- `example-launch` stays in the `calm` register: `carry` distance ≤ 15, no spring on a full-frame move, at most two accent transition types (`transition-language`), one expressive moment per scene.
- `match` and `carry` are cuts, not accents; `portal` and `dip` are accents.
- New transition params are validated per type in `src/spec/storyboard.ts` (`PARAMS` + `TransitionSchema`), and every addition is documented in `catalog.md` via `npx ct docs`.
- A film is done only when CLAUDE.md's definition of done holds: `ct check` 0 errors, warnings justified, stills and sheet read, critic ≥ 4/5 on every axis, `ct check --deep` once, `ct render` QC clean.
- Built alone (`--scene`), a scene's neighbours are placeholders. Measured and layered transitions must degrade to their plain form, never error (as `morph` already does in `build.ts` `transitionOf`).

## Review Focus

1. **An element with its own entrance during a layered handoff** (a headline rising on beat 0 of the incoming scene). Expected: the two compose; the headline both rises and trails the plane. Test: Task 3, `it("a layered handoff composes with the element's own entrance")`.
2. **A storyboard listing a parent and its child** (`rail` and `plan` inside it). Expected: only the parent takes the handoff; the child moves with it, not twice. Test: Task 3, `it("only top-level elements take the handoff")`.
3. **A match whose partner is at rest at the cut.** Expected: exactly today's behaviour (ease `out`, no impulse), so `_launch`'s match is unchanged. Test: Task 4, `it("a match from rest is today's match")`, plus the existing `measured geometry` slow test kept green.
4. **A match partner with a transparent or image background.** Expected: no fill interpolation, no crash; the shape still matches its corner. Test: Task 4, `it("fill matches only between two solid fills")`.
5. **A scene built alone (`ct check --scene plan`) whose join is layered or a match v2.** Expected: it builds, degrading to plain push/carry/match without errors. Test: Task 3 and Task 4, one `--scene` build assertion each.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/motion/types.ts` | new channels `shiftX`, `shiftY` (px, additive), `paint` (0..1), `corner` (px); `EaseSpec` `impulse`; `Tween.paint`; measure kinds `matchVelocity` and `matchShape` |
| `src/motion/easing.ts` | `impulse` ease |
| `src/motion/evaluate.ts` | shift composes into the translate; shutter speed counts shift; `paint`/`corner` to CSS |
| `src/motion/layers.ts` (create) | `layerPlan(elements, dir)`: depth by role, order by anchor, the per-element offset and delay |
| `src/motion/transitions.ts` | `layers` param on `push`/`pushUp`/`carry`; match v2 tweens |
| `src/build/build.ts` | top-level element lists per scene, passed into `transitionTweens` |
| `src/runtime/index.ts` | `resolveMeasured`: `matchVelocity`, `matchShape` |
| `src/spec/storyboard.ts` | `layers` param |
| `projects/example-launch/` | the re-cut (Tasks 1 and 5) |
| `projects/_flow/` | a layered carry and a match v2 for gallery and regression |
| `docs/decisions/0012-layers-and-match.md` (create) | decisions and the benchmark numbers |

---

### Task 1: Benchmark — score today's film, re-cut it with carry and portal, score again

**Files:**
- Modify: `projects/example-launch/storyboard.json` (transitions and motion notes), `projects/example-launch/scenes/*.tsx` (only the motion needed so each join carries something), `projects/example-launch/treatment.md` (transition row)

**Interfaces:**
- Produces: two scored iterations of `example-launch` (baseline `B0`, re-cut `B1`) and the critic's pairwise verdict, recorded with `ct score` / `ct verdict`. Task 5 is judged against `B1`.

- [ ] **Step 1: Baseline.** Run `npx ct check example-launch` and `npx ct render example-launch --draft`, then `npx ct motion example-launch`. Dispatch the `critic` agent on that iteration and record its scores: `npx ct score example-launch --intent N --composition N --typography N --temporal N --craft N --file <critique.md>`. Note this iteration number as `B0`.

- [ ] **Step 2: Re-cut the joins.** Make exactly these transitions (durations inside each type's range):

  | Join | Was | Becomes |
  |---|---|---|
  | hook → studio | cut | cut, with an exit into it or an entrance on it so `dead-cut` does not fire |
  | studio → plan | push | `{ "type": "portal", "via": "plan", "duration": 0.9 }`: into the rail's Plan tile |
  | plan → check | push | `{ "type": "carry", "dir": "left", "distance": 12, "duration": 0.5 }` |
  | check → measure | push | `{ "type": "carry", "dir": "left", "distance": 12, "duration": 0.5 }` |
  | measure → critic | push | `{ "type": "carry", "dir": "left", "distance": 12, "duration": 0.5 }` |
  | critic → end | dip | dip (unchanged: the chapter break before the end card) |

  Per motion-craft §8: give the outgoing scene of each carry a drift or an exit in its direction of travel, and start each chapter's first entrance at beat 0 travelling the same way. Update the storyboard `motion` notes on both sides of every join to say what carries it.

- [ ] **Step 3: Gate.** Run `npx ct check example-launch`. Expected: 0 errors; no `dead-cut`, `static-edit` or `transition-language` findings.

- [ ] **Step 4: Look.** Run `npx ct render example-launch --draft`. Extract frames at the middle of each join from the MP4 with ffmpeg and read them. Check the portal's window stays on the Plan tile and that no edge shows during a carry. At most 3 visual rounds.

- [ ] **Step 5: Score and compare.** Dispatch the `critic` on the re-cut, then run `npx ct score …` (iteration `B1`) and have the critic judge `B0` against `B1` pairwise (the `critique` skill's compare method). Record the result with `npx ct verdict example-launch <B0> <B1> --winner <n> --reason "…"`. If `B0` wins, `npx ct restore example-launch <B0>` and report BLOCKED with the critic's reasons: the flow moves failed their first real test, and the plan's later tasks need rethinking.

- [ ] **Step 6: Commit** `git commit -m "example-launch: the chapters flow (portal from the rail, carries between steps)"`.

---

### Task 2: Additive offsets and the impulse ease

**Files:**
- Modify: `src/motion/types.ts`, `src/motion/easing.ts`, `src/motion/evaluate.ts`, `src/lint/timeline.ts:106` (`LITT_PROPS` gains `shiftX`, `shiftY`, `paint`, `corner`)
- Test: `tests/motion.test.ts`

**Interfaces:**
- Produces:
  - `PROPS` gains `"shiftX"`, `"shiftY"` (px, base 0), `"paint"` (0..1, base 1) and `"corner"` (px, base 0). `SPATIAL_PROPS` gains `shiftX` and `shiftY`.
  - `EaseSpec` gains `{ type: "impulse" }`, with `e(u) = (27/4)·u·(1−u)²`. That is 0 at both ends, peaks at 1 when u = 1/3, and starts with slope 27/4. A tween on it with range `[0, peak]` starts moving at `peak·27/(4·duration)` and comes back to rest.
  - The translate becomes `x + shiftX`, `y + shiftY`. `shiftX`/`shiftY` are separate channels, so they compose with an element's own `x`/`y` tweens.
  - The shutter's speed counts `x + shiftX` (and `y + shiftY`).
  - `Tween.paint?: [string, string]` (CSS colours). With `paint` animated, `background-color: color-mix(in oklab, <paint[1]> p%, <paint[0]>)`. With `corner` animated, `border-radius: <corner>px`.

- [ ] **Step 1: Write the failing tests**

```ts
it("shift adds to x: an element's own move and a handoff compose", () => {
  // compileScene a scene with one tween x [0,100] over 0..1 and one shiftX [0,40] over 0..1, both linear;
  // transformAt = styleOf(sampleScene(c, t).get(key)).transform
  expect(transformAt(scene, "a.el", 0.5)).toContain("translate3d(70px,0px,0px)");
});
it("impulse leaves at rest, starts at 27/4 slope, peaks at a third", () => {
  const e = easeFn({ type: "impulse" });
  expect(e(0)).toBe(0); expect(e(1)).toBeCloseTo(0, 9);
  expect(e(1 / 3)).toBeCloseTo(1, 9); expect(e(1e-4) / 1e-4).toBeCloseTo(27 / 4, 2);
});
it("the shutter sees a fast shift", () => { /* shiftX [0,600] over 0.3 s → c.shutter has the key */ });
it("paint mixes two fills; corner is px", () => {
  expect(styleOf({ paint: 0.25, corner: 12 }, undefined, undefined, undefined, ["#000000", "#ffffff"]).backgroundColor)
    .toBe("color-mix(in oklab, #ffffff 25%, #000000)");
});
```
(Thread `paint` through `styleOf` the same way `tape` is threaded. `StyleOut` gains `backgroundColor`, and the runtime applies it alongside `borderRadius`.)

- [ ] **Step 2: Run** `npx vitest run tests/motion.test.ts`. Expected: the 4 new tests fail.
- [ ] **Step 3: Implement** the channels, ease and style output. Find where the runtime writes `StyleOut` to the element (`src/runtime/index.ts`), and add `backgroundColor` there.
- [ ] **Step 4: Run** `pnpm verify`. Expected: green. Goldens must be unchanged, because no existing tween uses the new channels: run `CT_SLOW=1 npx vitest run tests/browser.slow.test.ts -t golden`.
- [ ] **Step 5: Commit** `git commit -m "Motion: additive shift channels, the impulse ease, paint and corner"`.

---

### Task 3: Layered handoffs

**Files:**
- Create: `src/motion/layers.ts`
- Modify: `src/motion/transitions.ts` (`TransitionParam` + `layers` on `push`, `pushUp`, `carry`; `Ctx` gains `elements`), `src/build/build.ts:334-342` (pass the element lists), `src/spec/storyboard.ts` (`layers: z.boolean().optional()`), `projects/_flow/storyboard.json` (`detail → next` becomes `{ "type": "carry", "dir": "left", "distance": 12, "layers": true }`), `plugin/skills/motion-craft/SKILL.md` §8 (a "Layered handoffs" recipe), `plugin/skills/continuity/reference/api.md`
- Test: `tests/transitions.test.ts`, `tests/lint.test.ts` (build-level), `tests/browser.slow.test.ts`

**Interfaces:**
- Consumes: `shiftX`/`shiftY` (Task 2).
- Produces:
  ```ts
  /** `ElementRole` is new: export it from src/spec/storyboard.ts as `z.infer` of ElementSchema's `role` enum. */
  export interface LayerElement { id: string; role: ElementRole; anchor?: string }
  export interface LayerStep { id: string; depth: number; delay: number }
  /** Top-level elements in handoff order for a direction of travel; depth by role. */
  export function layerPlan(elements: LayerElement[], dir: PlanarDir, d: number): LayerStep[];
  export const LAYER_DEPTH: Record<ElementRole, number>;
  ```
  - `LAYER_DEPTH`: `headline title body label caption stat cta logo` = 1.0; `ui` = 0.6; `decor media` = 0.35.
  - Order: by anchor column, A→F for `dir: "left"`, F→A for `right`; by row, 1→6 for `up`, 6→1 for `down`. Elements with no anchor go last.
  - `delay` = order index × `staggers.list` (0.04), capped so the last delay ≤ 0.3·d.
  - `transitionTweens(spec, out, into, frame, elements?: { out: LayerElement[]; in: LayerElement[] })`. The build passes only top-level ids: a storyboard element is dropped when one of its ancestors in the rendered view is also a storyboard element.
  - With `layers: true`, each layer element gets these tweens on top of the plane's:
    - **Outgoing:** a shift along the axis `[0, sign·depth·LAYER_TRAVEL·frame]`. It starts at `os + delay`, ends with the plane, and uses the plane's ease (push `inOut`, carry t²).
    - **Incoming:** `[−sign·depth·LAYER_TRAVEL·frame, 0]`. It starts at `delay`, lasts the plane's in-duration, and uses ease `out`.
    - `LAYER_TRAVEL = 0.08` (8% of the frame along the axis).

- [ ] **Step 1: Write the failing tests**

```ts
it("layerPlan orders along the travel and depths by role", () => {
  const p = layerPlan([{ id: "chart", role: "ui", anchor: "D2:F5" }, { id: "title", role: "headline", anchor: "A3" }, { id: "dot", role: "decor" }], "left", 0.5);
  expect(p.map((s) => s.id)).toEqual(["title", "chart", "dot"]);
  expect(p.map((s) => s.depth)).toEqual([1, 0.6, 0.35]);
  expect(p[2].delay).toBeLessThanOrEqual(0.15 + 1e-9);
});
it("a layered carry shifts each element on top of the plane", () => { /* tweens on b.title shiftX start at -0.08·1920·0.6… etc. */ });
it("without layers, push and carry are unchanged", () => { /* deep-equal to today's tweens */ });
it("only top-level elements take the handoff", async () => { /* build _flow; `bars` inside a parent listed in elements gets no shift tween */ });
it("a layered handoff composes with the element's own entrance", () => { /* sample: element y from its rise AND shiftX from the handoff both non-zero mid-transition */ });
it("built alone, a layered join degrades to the plain move", async () => { /* buildProject("_flow", { only: "next" }) → no errors, no shift tweens */ });
```

- [ ] **Step 2: Run** `npx vitest run tests/transitions.test.ts tests/lint.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `layers.ts`, the transition changes and the build hand-off. The build reads roles and anchors from `sb.scenes[i].elements` and parents from the `views` HTML it already keeps.
- [ ] **Step 4: Run** `pnpm verify`, then `npx ct check _flow` (0 errors).
- [ ] **Step 5: Look.** Run `npx ct strip _flow --scene next` and read the image: the paths must show a wave, with the copy leading and the chart trailing. Then run `npx ct render _flow --draft` and read MP4 frames at the carry's cut ± 2 frames. **Tuning range:** `LAYER_TRAVEL` 0.05–0.12 and the depth values ±0.1. If you change a value, update the test and record it.
- [ ] **Step 6: Commit** `git commit -m "Transitions: layered handoffs, depth by role, order by anchor"`.

---

### Task 4: Match cuts v2 — velocity, fill and corner

**Files:**
- Modify: `src/motion/transitions.ts` (`match` build), `src/runtime/index.ts` (`resolveMeasured`), `src/motion/types.ts` (measure kinds), `projects/_flow/` (add a match join whose outgoing element is moving at the cut and whose pair has different fills and radii), `plugin/skills/motion-craft/SKILL.md` §8, `api.md`
- Test: `tests/transitions.test.ts`, `tests/browser.slow.test.ts`

**Interfaces:**
- Consumes: `shiftX`/`shiftY`, `impulse`, `paint`, `corner`, `Tween.paint` (Task 2).
- Produces: `match` emits, per pair, three tweens on `<into>.<b>`, all at `[0, d]`:
  1. **Place.** Today's place tween (measure `match`), unchanged.
  2. **Velocity.** Measure `{ kind: "matchVelocity"; from: string }`: `shiftX`/`shiftY` `[0, 0]` on the `impulse` ease (placeholder).
  3. **Shape.** Measure `{ kind: "matchShape"; from: string }`: `paint` `[0, 1]` and `corner` `[0, 0]` (placeholder).
  
  At prepare:
  - **Velocity.** `v` = (A's frame centre at `out.duration` − at `out.duration − 1/fps`) · fps, in frame px/s, converted to B's px through `k`. If `|v| ≥ 60` px/s: set the velocity tween's ranges to `[0, 4·v·d/27]` per axis, and switch the place tween's ease to `inOut`, so the start velocity is exactly `v`. Otherwise both stay as today (ease `out`, impulse range `[0, 0]`).
  - **Shape.**
    - If A's and B's computed `background-color` are both opaque (alpha ≥ 0.99) and neither has a `background-image`, set `paint` to `[A.bg, B.bg]`; otherwise drop the `paint` prop.
    - `corner` becomes `[A.radius·kA/kB, B.radius]`, in B's own px.

- [ ] **Step 1: Write the failing tests**

```ts
it("a match from rest is today's match", () => { /* run({type:"match",pairs:["logo"]}): place tween ease "out"; velocity tween ranges [0,0] */ });
it("match emits place, velocity and shape tweens per pair", () => { /* measure kinds match, matchVelocity, matchShape on b.<id> */ });
// slow, projects/_flow (the new match join):
it("the incoming element leaves the cut at its partner's speed", async () => { /* displacement over the first 2 frames ≈ partner's last-frame velocity within 15% */ });
it("the shape is matched: first frame has the partner's fill and corner, then settles", async () => { /* getComputedStyle at cut+0 ≈ A.bg, A.radius; at cut+d = B.bg, B.radius */ });
it("fill matches only between two solid fills", async () => { /* a pair with a gradient/transparent side: no paint channel, no error */ });
it("built alone, a match v2 join degrades to today's match", async () => { /* buildProject("_flow", { only: <incoming scene> }) → no errors */ });
```
Also keep the existing `measured geometry (projects/_launch …)` slow test green. It is the "from rest" regression.

- [ ] **Step 2: Run** the focused tests. Expected: FAIL.
- [ ] **Step 3: Implement.** Both new measure kinds read A with the outgoing scene applied at `out.duration` (and `− 1/fps` for velocity), exactly as `match` already does.
- [ ] **Step 4: Run** `pnpm verify` and `CT_SLOW=1 npx vitest run tests/browser.slow.test.ts -t "match|measured"`. Expected: PASS. Then `npx ct check _flow` and `npx ct check _launch`: 0 errors each.
- [ ] **Step 5: Look.** Run `npx ct render _flow --draft` and read frames at the match cut −2, −1, 0, +1, +2 and +d. Pass when the element appears to keep moving through the cut, and its fill and corner turn into its own without a pop.
- [ ] **Step 6: Commit** `git commit -m "Match cuts: velocity carried through the cut, fill and corner matched"`.

---

### Task 5: Re-cut with the new moves, judge against the benchmark, record it

**Files:**
- Modify: `projects/example-launch/storyboard.json` (`layers: true` on the three carries; at least one `match` where an element plausibly continues, e.g. a chapter's label on one carry), scene motion as needed
- Create: `docs/decisions/0012-layers-and-match.md`
- Modify: `plugin/skills/critique/SKILL.md` (Temporal/Craft rows: layered handoffs and physical match cuts as signs of flow), `npx ct docs` output

**Interfaces:**
- Consumes: Task 1's `B1` iteration; Tasks 3–4's `layers` and match v2.

- [ ] **Step 1: Apply** the moves, then run `npx ct check example-launch`. Expected: 0 errors, every warning justified.
- [ ] **Step 2: Look.** Run a draft render and read MP4 frames at each join. At most 3 visual rounds.
- [ ] **Step 3: Judge.** Dispatch the `critic`, then `npx ct score` (iteration `B2`) and a pairwise `B1` vs `B2` comparison with `ct verdict`. Keep the winner (`ct restore` if `B1` wins). If `B1` wins, the new moves did not improve a real film. Say so in 0012, with the critic's reasons, and keep the engine work for the galleries only.
- [ ] **Step 4: Deliver.** Run `npx ct check example-launch --deep` and `npx ct render example-launch` (QC clean), then `npx ct report example-launch`.
- [ ] **Step 5: Write 0012.** Record:
  - what layers and match v2 do;
  - the tuned constants;
  - the benchmark table (B0, B1, B2: five axis scores, mean, verdicts, and the `ct motion` dead-zone count at the joins);
  - what is still not done: a continuous world camera, and a velocity hand-off on plain cuts.
- [ ] **Step 6: Run** `pnpm verify` and `CT_SLOW=1 pnpm test`. Expected: green.
- [ ] **Step 7: Commit** `git commit -m "example-launch: layered carries and a physical match; 0012 with the benchmark"`.
