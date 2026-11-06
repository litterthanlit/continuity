# Moving Backgrounds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every frame's backdrop is either one flat colour or a bold gradient field that keeps moving. The faint top light (`bg="lit"`) is removed, and text stays legible over the moving colour.

**Architecture:** A gradient field is a fragment shader drawn on a raw WebGL2 canvas inside the Stage backdrop (no three.js). It is a pure function of (pixel, global seconds, preset). Two adjacent scenes on the same preset therefore show the same field at the cut, and the colour flows straight through it. Presets are theme data. The runtime draws every field on each `apply(scene, t)` from the scene's start plus `t`. Tweening the backdrop stays forbidden: the field moves by itself.

**Tech Stack:** TypeScript, Preact views, WebGL2 / GLSL ES 3.00, the existing esbuild runtime bundle, vitest (+ `CT_SLOW=1` browser tests through puppeteer and HyperFrames).

**Spec:** the user's request (2026-11-06): *"I don't want a slight gradient on the screen. Either one color or fun moving gradients. I still feel like we're not at production level quality yet."* Plus `docs/decisions/0006` §2 (material), which this plan amends, and `0009` (WebGL determinism), whose rules it keeps.

## Global Constraints

- No static gradient backdrop anywhere: a backdrop is `solid` (one colour), `grid` (hairlines on one colour) or `gradient` (a moving field). `lit` is removed, not deprecated.
- A frame is a pure function of t: no clock, no randomness, no state carried between frames (0001, 0009). The shader's noise is hash-based (no textures, no `Math.random`).
- Renders stay deterministic across workers: identical PNGs with 1 and 4 workers.
- No new dependencies. three.js is not loaded for gradients (`continuity-gl.js` stays three-only).
- The field is drawn at half resolution (960×540 for 1080p) and upscaled by the canvas; Stage grain stays on top at full resolution.
- Frame budget: the median `__ct.seek` on a gradient scene stays ≤ 25 ms over a solid one in SwiftShader.
- Tweening `<scene>.bg` stays a `material-motion` error. The field's motion is not on the timeline.
- Text over a field meets WCAG AA at every sampled time (HyperFrames `contrast_aa_failure`, which samples screenshot pixels).

## Review Focus

1. **An old project still using `bg="lit"`** (a user's repo, not just ours). Expected: the build fails with a `view` error naming `"lit"`, decision 0011 and the replacement, not a silent fallback to solid. Test: Task 2, `it("bg lit is a build error that names the replacement")`.
2. **Text over the bright part of a field** (white headline over the `ember` orange, or `aurora` on `litt-light`). Expected: `ct check` reports `check:contrast_aa_failure`. Test: Task 4, a seeded defect in `projects/_defects-layout`.
3. **Two adjacent scenes on the same preset, joined by a cut or a carry.** Expected: the field is continuous; the pixel at the frame centre is within 2/255 on the outgoing scene's last frame and the incoming scene's first frame. Test: Task 3, `it("the field flows straight through a cut")`.
4. **A portal or depth transition scaling a gradient scene.** Expected: the field scales with its scene root, so it reads as part of the shot, and no canvas edge shows while it is scaled down. Test: Task 4, stills of `_backgrounds` mid-portal, read by eye. The canvas fills its scene root, which the rig moves.
5. **Banding in the encoded MP4** (a slow dark gradient in 8-bit 4:2:0 H.264). Expected: no visible contour steps. Test: Task 3, the shader dithers with interleaved gradient noise ±0.5/255, and Task 4 reads a still cropped from the rendered MP4 (not a PNG still).

---

## File Structure

| File | Responsibility |
|---|---|
| `src/themes/gradients.ts` (create) | `GradientSpec`, the preset names, `resolveGradient(theme, name \| spec)`: theme tokens → linear-RGB uniforms |
| `src/runtime/gradient-shader.ts` (create) | the GLSL ES 3.00 vertex and fragment sources as exported strings |
| `src/runtime/gradient.ts` (create) | `mountGradients()`, `drawGradients(scene, globalT)`: WebGL2 setup, one draw per canvas per frame |
| `src/runtime/index.ts` (modify) | call the two above from `prepare()` and `apply()` |
| `src/kit/core.tsx` (modify) | `Stage`/`Backdrop`: `bg="gradient"`, the `gradient` prop, the `lit` error |
| `src/kit/ui.tsx` (modify) | `Card` gains `glass` (a floating surface over a field) |
| `src/themes/index.ts`, `src/build/css.ts` (modify) | drop `lit`, `material.light`, `.ct-lit`; add `gradient` to `StageBackground` |
| `src/lint/source.ts`, `src/lint/timeline.ts` (modify) | rule texts; `litt-gradient` also catches backdrop gradients in class lists and styles |
| `docs/decisions/0011-moving-backgrounds.md` (create) | the decision, amending 0006 §2 |
| `projects/_backgrounds/` (create) | gallery: solid, each preset, glass over a field, a carry and a portal between field scenes |
| every `bg="lit"` site (modify) | migration (list in Task 2) |

---

### Task 1: Gradient presets as theme data

**Files:**
- Create: `src/themes/gradients.ts`
- Modify: `src/themes/index.ts` (add `gradients?: Partial<Record<GradientName, GradientSpec>>` to `Theme` and to `ThemeOverrides`)
- Test: `tests/css.test.ts` (new `describe("gradient presets")`)

**Interfaces:**
- Produces:
  ```ts
  export const GRADIENT_NAMES = ["accent", "aurora", "ember"] as const;
  export type GradientName = (typeof GRADIENT_NAMES)[number];
  export interface GradientSpec {
    /** Exactly four colours, hex or a theme token name ("accent", "canvas"…). */
    colors: [string, string, string, string];
    /** The ground the colours float on (hex or token). */
    base: string;
    speed: number;  // field units per second
    scale: number;  // blob size; 1 = a blob is about a third of the frame
    warp: number;   // domain-warp strength, 0..1
  }
  export interface GradientUniforms { colors: number[]; base: [number, number, number]; speed: number; scale: number; warp: number; seed: number }
  export function resolveGradient(theme: Theme, g: GradientName | GradientSpec): GradientUniforms;
  ```
  `colors` is 12 numbers of linear RGB. `seed` is a stable hash of the preset name, or of the spec's JSON for a custom spec: the same preset in two scenes gives the same seed, which is what makes the field continuous across a cut.

- [ ] **Step 1: Write the failing tests**

```ts
describe("gradient presets", () => {
  it("has three bold presets; accent reads the theme's own tokens", () => {
    expect([...GRADIENT_NAMES]).toEqual(["accent", "aurora", "ember"]);
    const u = resolveGradient(littDark, "accent");
    expect(u.colors).toHaveLength(12);
    expect(u.base).toEqual(srgbToLinear(littDark.colors.canvas));
    expect(u.colors.slice(0, 3)).toEqual(srgbToLinear(littDark.colors.accent));
  });
  it("the same preset gives the same seed in every scene; a custom spec gets its own", () => {
    expect(resolveGradient(littDark, "aurora").seed).toBe(resolveGradient(littDark, "aurora").seed);
    expect(resolveGradient(littDark, "aurora").seed).not.toBe(resolveGradient(littDark, "ember").seed);
  });
  it("a brand theme overrides a preset", () => {
    const brand = { ...littDark, gradients: { ember: { colors: ["#ff0000", "#00ff00", "#0000ff", "canvas"], base: "canvas", speed: 0.2, scale: 1, warp: 0.5 } } } as Theme;
    expect(resolveGradient(brand, "ember").colors.slice(0, 3)).toEqual([1, 0, 0]);
  });
  it("rejects an unknown token", () => {
    expect(() => resolveGradient(littDark, { colors: ["nope", "#000", "#000", "#000"], base: "canvas", speed: 0.1, scale: 1, warp: 0 })).toThrow(/nope/);
  });
});
```

- [ ] **Step 2: Run** `npx vitest run tests/css.test.ts -t "gradient presets"`. Expected: FAIL, `GRADIENT_NAMES` is not exported.

- [ ] **Step 3: Implement `src/themes/gradients.ts`**, with `srgbToLinear(hex): [number, number, number]` exported for the test. Preset values, verbatim:

  | preset | colors | base | speed | scale | warp |
  |---|---|---|---|---|---|
  | `accent` | `accent`, `accent-text`, `accent-tint`, `canvas` | `canvas` | 0.12 | 1.0 | 0.6 |
  | `aurora` | `#2d57e5`, `#7b4dff`, `#1fb8c9`, `#e5487b` | `canvas` | 0.15 | 1.1 | 0.7 |
  | `ember` | `#ff5a1f`, `#ffb347`, `#b3200e`, `#1a0a05` | `#0a0908` | 0.12 | 0.9 | 0.6 |

  The seed is FNV-1a 32-bit over the name (or the JSON), mod 1000, then divided by 1000.

- [ ] **Step 4: Run** the same command. Expected: PASS.

- [ ] **Step 5: Commit** `git commit -m "Themes: gradient presets as data"`.

---

### Task 2: gradient in, lit out — kit, theme, migration, rules

**Files:**
- Modify: `src/kit/core.tsx:76-115`, `src/kit/ui.tsx:129-136`, `src/themes/index.ts:40-48,138,188`, `src/build/css.ts:102`, `src/build/build.ts` (no change needed if the runtime bundle already includes `gradient.ts` through `index.ts`; confirm)
- Test: `tests/kit.test.ts`, `tests/css.test.ts:52-53,103`

**Interfaces:**
- Consumes: `resolveGradient`, `GradientName`, `GradientSpec` (Task 1).
- Produces: `StageBackground = "solid" | "grid" | "gradient"`; `StageProps.gradient?: GradientName | GradientSpec` (default `"accent"`). With `bg="gradient"`, `Backdrop` renders `<canvas class="absolute inset-0 h-full w-full" data-ct-gradient={JSON.stringify(uniforms)} />` inside the `data-ct="<scene>.bg"` div. `CardProps.glass?: boolean` swaps `bg-surface-1 shadow-raised` for `ct-glass`.

- [ ] **Step 1: Write the failing tests**

```ts
it("a gradient stage carries its field's uniforms", () => {
  const html = renderInScene(<Stage bg="gradient" gradient="ember" />);
  expect(JSON.parse(attr(html, "data-ct-gradient")).seed).toBe(resolveGradient(littDark, "ember").seed);
});
it("bg lit is a build error that names the replacement", () => {
  expect(() => renderInScene(<Stage bg={"lit" as never} />)).toThrow(/"lit" was removed \(docs\/decisions\/0011\): use bg="solid" or bg="gradient"/);
});
it("a glass card floats: ct-glass instead of the raised surface", () => {
  expect(renderToString(<Card glass />)).toContain("ct-glass");
});
```
In `css.test.ts`, delete the `material.light` expectations and the `.ct-lit` one, and add `expect(css).not.toContain(".ct-lit")`.

- [ ] **Step 2: Run** `npx vitest run tests/kit.test.ts tests/css.test.ts`. Expected: the 3 new tests fail.

- [ ] **Step 3: Implement.** Remove `material.light` and its values (22 and 12) and the `.ct-lit` CSS. `Backdrop` throws the exact message above for `"lit"`. Update the doc comments on `StageBackground` and `Stage`: "a still colour, hairlines, or a field that keeps moving". Remove "Never glass" from `Card`'s comment and document `glass` instead: "a floating surface over a gradient field".

- [ ] **Step 4: Run** `pnpm verify`. Expected: typecheck fails only at the `bg="lit"` sites listed below; fix them in Steps 5–9 before committing.

**Migration and rules (same task):**
- Modify (scene by scene, the choice fixed here):
  - **→ `gradient`** (heroes and end cards, where the light used to be): `projects/example-launch/scenes/studio.tsx`, `end.tsx` (`accent`); `projects/example-beat/scenes/hook.tsx`, `end.tsx` (`aurora`); `projects/example-logo/scenes/end.tsx` (`accent`); `projects/example-type/scenes/hook.tsx`, `end.tsx` (`accent`); `templates/project/scenes/hook.tsx` (`accent`)
  - **→ `solid`**: `projects/_transitions/scenes/{push,wipe,crossfade}.tsx`, `projects/_type/scenes/{lockup,scale}.tsx`, `projects/_smoke/scenes/hello.tsx`, `projects/_flow/scenes/{detail,device}.tsx`, `projects/_defects/scenes/t3.tsx` (keep its seeded defect: read the file and confirm `lit` is not what it seeds)
  - comments that mention the light: `projects/example-launch/scenes/studio.tsx:4`, `lib/chapter.tsx:7`, `treatment.md`
- Modify: `src/lint/source.ts` (`litt-gradient`: the message now says "a backdrop is one colour or a moving field (Stage bg=\"gradient\")"; the pattern also matches `bg-radial-*`, `bg-linear-*`, `bg-conic-*`, `radial-gradient(`, `linear-gradient(` in a scene's class or style), `src/lint/timeline.ts:68` (`material-motion`: "Tween the backdrop never; a gradient field moves by itself")
- Modify docs: `plugin/skills/motion-craft/SKILL.md` §2 (material and light), `plugin/skills/product-launch/SKILL.md`, `plugin/skills/kinetic-type/SKILL.md`, `plugin/skills/motion-craft/recipes.md`, `plugin/skills/continuity/reference/api.md`, `plugin/skills/critique/SKILL.md` (the litt checklist gets "the backdrop is one colour or a moving field; a faint gradient is a defect"), `CLAUDE.md` (the "One look" line), `docs/decisions/0006` §2 (a "superseded by 0011" note, not a rewrite)
- Test: `tests/source-lint.test.ts`, goldens

- [ ] **Step 5: Write the failing source-lint test**

```ts
it("a hand-made backdrop gradient is litt-gradient", () => {
  expect(rulesIn(`<div class="absolute inset-0 bg-radial-[at_50%_0%] from-accent/20" />`)).toContain("litt-gradient");
  expect(rulesIn(`<div style={{ background: "linear-gradient(#000, #111)" }} />`)).toContain("litt-gradient");
});
```

- [ ] **Step 6: Run** `npx vitest run tests/source-lint.test.ts`. Expected: FAIL.

- [ ] **Step 7: Implement** the lint change, then the migration list above, then the skill and doc edits. Until Task 3 lands, a `gradient` stage draws nothing over the canvas, so it looks solid: an honest intermediate state.

- [ ] **Step 8: Run** `pnpm verify && npx ct docs`. Expected: green; `catalog.md` regenerated.

- [ ] **Step 9: Refresh the goldens deliberately.** `_smoke`, `_type` and `_transitions` change (lit → solid): run `CT_SLOW=1 CT_UPDATE_GOLDEN=1 npx vitest run tests/browser.slow.test.ts -t golden`, then `CT_SLOW=1 pnpm test`. Expected: 0 failures. Open `npx ct stills _transitions --at 3` before and after; the only difference should be the missing top glow.

- [ ] **Step 10: Commit** `git commit -m "Backgrounds: one colour or a field; lit is gone"`.

---

### Task 3: The field shader and its runtime

**Files:**
- Create: `src/runtime/gradient-shader.ts`, `src/runtime/gradient.ts`, `docs/decisions/0011-moving-backgrounds.md`
- Modify: `src/runtime/index.ts` (call `mountGradients()` in `prepare()` after `mountGl()`; in `apply(scene, t)` call `drawGradients(scene, sceneStart + t)`)
- Create: `projects/_backgrounds/` (storyboard and two scenes for now: `a` and `b`, both `bg="gradient" gradient="aurora"`, 2 s each, joined by a plain cut; the rest of the gallery comes in Task 4)
- Test: `tests/browser.slow.test.ts` (new `d("gradient fields (projects/_backgrounds)")`)

**Interfaces:**
- Consumes: `GradientUniforms` (Task 1), serialised onto `canvas[data-ct-gradient]` inside each `<scene>.bg` by `Backdrop` (Task 2).
- Produces: `mountGradients(): void`, which finds every `canvas[data-ct-gradient]`, creates one WebGL2 context per canvas with `preserveDrawingBuffer: true` and compiles one program per canvas. Also `drawGradients(scene: string, globalT: number): void`, which draws only that scene's canvases (`data-ct-scene` ancestor) and skips a canvas whose `globalT` equals its last draw.

- [ ] **Step 1: Write the failing browser tests** (pattern: the `measured geometry` test: build to a temp dir, `serveDir`, `withBrowser`, `page.evaluate`):

```ts
d("gradient fields (projects/_backgrounds)", () => {
  it("is a pure function of time: same t, same pixels; later t, different pixels", async () => {
    // seek(0.5) → canvas.toDataURL(); seek(1.5); seek(0.5) → toDataURL() again
    expect(again).toBe(first);
    expect(later).not.toBe(first);
  });
  it("the field flows straight through a cut", async () => {
    // centre pixel (readPixels via a 2D copy of the canvas) of scene a at a.start + a.duration - 1/30, and of b at b.start
    for (let k = 0; k < 3; k++) expect(Math.abs(lastA[k] - firstB[k])).toBeLessThanOrEqual(2);
  });
  it("fits the frame budget", async () => {
    // median of 30 seeks across scene a minus the median of 30 seeks with the canvas removed
    expect(medianGradient - medianSolid).toBeLessThanOrEqual(25);
  });
});
```

- [ ] **Step 2: Run** `CT_SLOW=1 npx vitest run tests/browser.slow.test.ts -t "gradient fields"`. Expected: FAIL, because the canvas never draws (it reads all-transparent).

- [ ] **Step 3: Implement the shader in `gradient-shader.ts`.** It is a full-screen triangle with uniforms `u_res`, `u_t` (= globalT × speed), `u_seed`, `u_colors[4]`, `u_base`, `u_scale`, `u_warp`. The fragment algorithm, which the tests do not pin:

  ```glsl
  vec2 p = (gl_FragCoord.xy / u_res - 0.5) * vec2(u_res.x / u_res.y, 1.0) / u_scale;
  // domain warp: two octaves of hash-based value noise, seeded
  vec2 q = p + u_warp * vec2(fbm(p + vec2(u_seed, u_t)), fbm(p + vec2(5.2 - u_seed, -u_t)));
  // four colour centres on incommensurate Lissajous paths
  const vec2 A = vec2(0.71, 0.53), B = vec2(0.97, 0.61), C = vec2(0.43, 0.89), D = vec2(0.59, 0.37);
  // c_i = 0.42 * vec2(sin(u_t * F_i.x + 6.28 * (u_seed + i * 0.25)), cos(u_t * F_i.y + 3.1 * i))
  // w_i = exp(-3.0 * dot(q - c_i, q - c_i))
  vec3 col = (u_base * 0.15 + Σ w_i * u_colors[i]) / (0.15 + Σ w_i);   // linear RGB
  col = linearToSrgb(col) + (ign(gl_FragCoord.xy) - 0.5) / 255.0;       // dither
  ```
  `ign` is interleaved gradient noise: `fract(52.9829189 * fract(dot(xy, vec2(0.06711056, 0.00583715))))`.

- [ ] **Step 4: Implement `gradient.ts`.** Size each canvas at half the composition (`width = W / 2`, `height = H / 2`, CSS 100%). Read uniforms from `data-ct-gradient`. Look up each scene's start in `data.timeline.scenes`. On context loss, throw (a render must not continue blank).

- [ ] **Step 5: Run** the slow tests. Expected: PASS.

- [ ] **Step 6: Verify determinism across workers.** Extend `scripts/gl-bench.mjs` so `--determinism` also counts `canvas[data-ct-gradient]` scenes, then run `node scripts/gl-bench.mjs _backgrounds --determinism 4`. Expected: `N of N frames byte-identical`.

- [ ] **Step 7: Write decision 0011.** It records: the user's rule (one colour or moving, never faint); the shader, and why WebGL2 (CSS blurred blobs cannot domain-warp and cost more per frame); continuity across cuts through global time and a shared seed; why the timeline does not drive the field (beat-synced surges are a possible follow-up channel, not built); the determinism and budget numbers measured in Steps 5–6.

- [ ] **Step 8: Commit** `git commit -m "Runtime: gradient fields, a pure function of global time (0011)"`.

---

### Task 4: Gallery, legibility, and looking at it

**Files:**
- Modify: `projects/_backgrounds/` (complete it: `solid` → `accent` → `aurora` → `ember` → `glass`, a scene with three `Card glass` panels over `aurora`, then `carry` → `portal` between two `aurora` scenes, each scene labelled with its name)
- Modify: `projects/_defects-layout/` (seed: a `fg` Body line over the bright part of an `ember` field, `litt-light`)
- Test: `tests/browser.slow.test.ts` (`"check:contrast_aa_failure"` already listed; the new seed must keep it firing *for the gradient element*: assert a finding whose `element` is the seeded id)

- [ ] **Step 1: Write the failing test.** In the seeded-defects test, add `expect(found.some((f) => f.rule === "contrast_aa_failure" && f.element?.endsWith("over-field"))).toBe(true)`.

- [ ] **Step 2: Run** `CT_SLOW=1 npx vitest run tests/browser.slow.test.ts -t "seeded layout"`. Expected: FAIL until the seed exists. If it still fails with the seed in place, HyperFrames' screenshot sampling does not see the canvas. Stop and report: the fix would be a probe that samples the frame under each text box, which is its own task.

- [ ] **Step 3: Build the gallery and gate it:** `npx ct check _backgrounds` → 0 errors.

- [ ] **Step 4: Look.** `npx ct render _backgrounds --draft`, then extract frames from the **MP4** (not stills): `ffmpeg -ss <t> -i out/_backgrounds/latest-draft.mp4 -frames:v 1 …` at the middle of each scene, at the carry's cut and at the portal's midpoint. Read them. Pass when:
  - no banding contours in the dark parts of `accent` and `ember`;
  - the field visibly moves between two frames 1 s apart;
  - colour is continuous across the carry's cut;
  - glass panels read as frosted over the field.

  Fix what fails before Step 5. At most 3 rounds (CLAUDE.md).

- [ ] **Step 5: Final render.** `npx ct check _backgrounds --deep`, then `npx ct render _backgrounds`. Expected: render QC clean.

- [ ] **Step 6: Commit** `git commit -m "Gallery: _backgrounds; legibility over a field is gated"`.

---

## Not in this plan (the rest of "production level")

The faint background is one of three gaps I see between Continuity and production work. The other
two are separate subsystems, so each gets its own plan once this one lands:

1. **Layered handoffs.** Transitions move whole scene roots. Production handoffs stagger the
   layers: the leading element leaves first, the background last, with parallax by depth.
   Needs a per-element depth (`data-ct-depth`) the kit does not record yet. 0010 lists it as the
   next step.
2. **A flagship benchmark.** Re-cut `example-launch` (five chapters joined by four identical pushes)
   with fields, flow moves and layered handoffs, scored by the critic against the reference films.
   Without one real film made to the bar, "production level" can't be measured.

Already solved, so not planned: velocity-based motion blur on fast elements (the shutter in
`src/motion/evaluate.ts`).
