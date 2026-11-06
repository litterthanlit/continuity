# 0011 — Moving backgrounds: one colour or a field

**Status:** accepted · 2026-11-06 · amends 0006 §2 (material) · extends 0009 (WebGL)

## Context

0006 gave litt one light: `bg="lit"`, an accent-tinted radial above the top edge that faded out by
65%. On a near-black canvas it read as a faint wash. The user's verdict on it:

> I don't want a slight gradient on the screen. Either one color or fun moving gradients.

So the rule is binary. A backdrop is **one flat colour**, or it is **a bold field of colour that
keeps moving**. Anything between, a gradient you have to squint at, is a defect.

## Decisions

### 1. Two backdrops: `solid` and `gradient`

`<Stage bg="solid">` is the canvas colour, as before. `<Stage bg="gradient" gradient="aurora">` is a
moving field. `lit` and `material.light` are gone; `bg="lit"` is a build error that names this
decision and the replacement. `grid` stays for the energetic register (0007).

A preset (`accent`, `aurora`, `ember`) is theme data (`src/themes/gradients.ts`): four colours, a
base, a speed, a blob scale and a warp strength. Each preset has two tunings, one per theme mode
(dark and light, §6), picked by `theme.mode`. `accent` reads the theme's own tokens. The other two
are fixed bold palettes. A brand theme can override any preset. A custom spec works too, and is
checked where it enters: exactly four colours, each a `#rrggbb` hex or a theme token, a finite
speed, scale (above 0) and warp; the error names the field. The build
resolves the preset to linear-RGB uniforms and writes them onto a `<canvas data-ct-gradient>`
inside the scene's `bg` element.

### 2. The field is a shader, in WebGL2

`src/runtime/gradient-shader.ts` is a full-screen triangle with one fragment shader:

- **Four colour centres** on incommensurate Lissajous paths (frequencies 0.71/0.53, 0.97/0.61,
  0.43/0.89, 0.59/0.37), so the arrangement never repeats within a film. The vertex stage places
  them once per draw and passes them as `flat` varyings.
- **A domain warp**: two octaves of hash-based value noise (Hoskins' hash without sine, no
  textures), seeded, offset in opposite directions by time. This bends the blobs into flowing
  shapes instead of round spots.
- **Mixing in linear RGB**: each centre weighs `exp(-3 d²)` against the base at weight 0.15. The
  base shows only where every colour is far away.
- **Output in sRGB, dithered** with interleaved gradient noise (±0.5/255, fixed per pixel), so a
  slow dark ramp does not band in 8-bit H.264.

Why WebGL2 rather than CSS blurred blobs: CSS cannot domain-warp, so the blobs stay round and read
as screensaver spots, and four large blurred layers are four full-frame blur passes in software
raster each frame, against one shader pass at half resolution (not measured here). Why not
three.js: the field needs one program and one draw. It lives in the motion runtime
(`continuity-motion.js`), not in the 615 KB GL bundle (0009).

The canvas is drawn at half the composition's resolution and stretched by CSS. The field has no
detail finer than that, and SwiftShader's cost scales with the pixel count.

### 3. A pure function of global time

`drawGradients(scene, globalT)` sets `u_t = globalT × speed` and draws. `globalT` is the scene's
start plus its local time, so the field does not restart at each scene. The seed is a hash of the
preset name, so two scenes on the same preset hold the same field. Together these make the field
flow straight through a cut: at the same global instant, the outgoing and incoming canvases have
identical pixels (tested byte for byte), and one frame apart they differ by the field's own motion.

The rest follows 0009's rules:

- No clock, no `Math.random`, no textures, no state. A canvas already showing `globalT` is not
  redrawn. That is an optimisation: with `preserveDrawingBuffer` it keeps the same pixels.
- One WebGL2 context and program per canvas, mounted once at prepare.
- A lost context throws on the next draw. A render must stop rather than continue over a blank
  backdrop. A missing WebGL2 context also throws, and so does a composition with more WebGL
  canvases than Chrome keeps contexts for (see Consequences).

### 4. The timeline does not drive the field

The field moves by itself, at its preset's speed, and no tween reaches it. Material is static in
litt (P5): `material-motion` still lints any tween on the backdrop. The field is the one moving
material, and it moves continuously, so it never competes with the scene's choreography for the
eye. A beat-synced surge (the field speeding up or flaring on a beat) would be a separate input
channel. That is a possible follow-up and is not built.

### 5. Measured

On the session's 4 vCPU container, with `projects/_backgrounds` (two 2 s scenes on `aurora`,
joined by a plain cut; measured on the first preset values, §6 — the shader's cost does not depend on them):

| measure | result |
|---|---|
| in-page cost per frame, ct's browser (Vulkan SwiftShader), median of 30 seeks, three runs | 12.6, 15.3, 15.7 ms (budget 25 ms) |
| the same, during the full slow suite (HyperFrames rendering on the same 4 cores) | 25.7 ms once; the test retries for an uncontended run |
| in-page cost per frame, `gl-bench` (HyperFrames' ANGLE/SwiftShader flags), median / p95 | a: 15.3 / 19.4 ms, b: 13.3 / 22.1 ms |
| first draw (SwiftShader compiles the shader on first use) | 611 ms, once per canvas |
| `gl-bench --determinism 4`: PNG sequence, 1 worker against 4 | 120 of 120 frames byte-identical, 120 distinct; all 120 are field frames |
| across the cut, the whole frame, rendered (`ct stills --at 1.967,2.0`), outside the label | at most 2 levels |
| same global time, a's canvas at its end and b's at its start | byte-identical |
| `ct render _backgrounds` (MP4, 4 workers) | 16.0 s for 4 s, render QC clean |

The first version of the shader cost 29–36 ms a frame. It ran the four centres in a per-pixel
loop that computed the Lissajous trig and indexed `u_colors` dynamically. Moving the centres to the
vertex stage and unrolling the loop brought it to 13–16 ms. Removing the noise octaves saved less
than either change.

A field costs more at render time than its draw. Every frame is a full-frame colour image, which
takes longer to capture and encode than a flat canvas. `ct render` (MP4, 4 workers) took 9.0 and
9.3 s for the same 4 s on `solid`, and 15.9 and 16.7 s on `aurora`. As a PNG sequence with one
worker, `solid` took 22 s (23 MB) and `aurora` 121 s (186 MB). A static 2D canvas with a linear
gradient in place of the field took 110 s, so the PNG cost is in encoding the colour, not in the
shader. HyperFrames' static-frame dedup is off in all three: Continuity registers frame sources.

### 6. Tuned against the rendered MP4

The first preset values (Task 1's guesses) rendered as a pastel wash: the four colours mix with
broad weights (`exp(-3 d²)`, centres within 0.42 of each other), so complementary hues averaged to
lavender, light hues flooded the frame and the near-black base never showed. `accent` read as one
flat cobalt, `ember` as an orange flood, and all three moved 2–5 levels a second. The shader stayed
as it is; the data changed, judged on frames from `ct render _backgrounds --draft` and a numpy port
of the shader swept over time:

| preset | colours | speed | scale | warp |
|---|---|---|---|---|
| `accent` | `accent, accent-text, accent-tint, canvas` → `accent, accent-tint, canvas, accent-text` | 0.12 → 0.2 | 1.0 → 0.75 | 0.6 → 0.8 |
| `aurora` | `#2d57e5 #7b4dff #1fb8c9 #e5487b` → `#2448ff #7a2cff #0a8fa8 #e0206a` | 0.15 → 0.22 | 1.1 → 0.8 | 0.7 → 0.8 |
| `ember` | `#ff5a1f #ffb347 #b3200e #1a0a05` → `#ff6a14 #d1200f #4a0818 #0a0908` | 0.12 → 0.2 | 0.9 → 0.75 | 0.6 → 0.85 |

- **Saturated, mid-dark hues** keep every mix vivid; the light cyan and apricot went.
- **Scale under 1** lets the base show between the blobs, so the field has depth: deep pockets
  drift through it. Below ~0.7 the warp's value noise shows as blotches.
- **Speed ~0.2**: two MP4 frames 1 s apart now differ by a mean of about 2–17 levels per channel
  over the whole frame (was 2–5; the final review measured `ember`'s blue channel at 1.8, the least), visibly alive, still
  slower than any element's entrance. In `accent` the order puts the
  two darks on adjacent Lissajous paths, so a dark pocket is on screen more often.
- Luminance (port, 120 s at 0.5 s steps, 5th / 50th / 95th percentile / max): `accent`
  0.009 / 0.07 / 0.15 / 0.187, `aurora` 0.024 / 0.14 / 0.17 / 0.19, `ember` 0.007 / 0.08 / 0.19 /
  0.25. litt-dark's `fg` needs ≤ 0.18 for 4.5:1 and ≤ 0.28 for 3:1: large `fg` type clears all
  three anywhere (at worst 4.2:1, 4.1:1 and 3.3:1), body type not everywhere.
- **Glass**: litt-dark's `material.glass` fill went from 0.72 to 0.5 alpha. At 0.72 a glass card
  over a field read as a dark panel tinted by it; at 0.5 the blurred field shows through as frosted
  colour and `fg` type on it still clears 7:1 (measured over `aurora`, the gallery's glass scene).
  Over the solid canvas the two are indistinguishable.

**litt-light.** The table above was tuned on litt-dark. On litt-light the same data read as the
wash this decision rejects: `accent` resolved to cobalt, `#e8eeff` and the near-white canvas over
a near-white base, a lavender haze; `aurora` faded to white at the edges (its base is the canvas);
`ember` kept a near-black base under near-black type. litt-light's `fg` is near-black, so its
fields go the other way: saturated, luminous hues on a coloured base, never the canvas.

| preset | litt-light colours | base |
|---|---|---|
| `accent` | `#4d8dff accent-tint #8b7cff accent` | `#4d8dff` |
| `aurora` | `#4d7dff #9a6bff #12b5c9 #ff4f8f` | `#8a7dff` |
| `ember` | `#ff6a14 #ff3d2e #ffb000 #ff5c8a` | `#ff9a4d` |

Speed, scale and warp are litt-dark's. `accent` keeps the theme's `accent` (a deep pocket) and
`accent-tint` (the highlights); litt-light's accent is too dark to carry near-black type alone, so
two luminous cobalts carry the rest. Luminance (port, as above; min / 50th / max): `accent` 0.14 /
0.32 / 0.71, `aurora` 0.25 / 0.28 / 0.35, `ember` 0.28 / 0.37 / 0.49; `fg` over them at worst 3.4:1,
5.4:1 and 6.1:1. Judged on frames of `ct render --draft` of the gallery on litt-light: cobalt-sky
with periwinkle passages, violet / rose / teal, orange / coral; `fg` labels and glass cards
(white at 0.72) read cleanly, and the rendered frames never fall under 5:1 for `fg`.

## Consequences

- A backdrop is a binary choice in every project, and the critique counts a faint gradient as a
  defect.
- Type over a field must clear contrast on every colour the field passes through, at every
  moment. In both themes large `fg` type clears 3:1 anywhere on every preset (§6); body type does
  not everywhere, and the greys (`fg-muted`, `fg-subtle`) fall under 3:1 on every field. So type on
  a field takes one ink and keeps its hierarchy by size and weight; an ink step (`ink`, `dim`)
  belongs on a solid scene, and body copy over a field goes on glass.
- `ct check` gates it by reading the rendered pixels, canvas included. HyperFrames' own contrast
  pass audits five frames for the whole film, so in a long film a field scene got one sample or
  none: a grey statement on `accent` passed the full check and failed only under `--scene`. The
  probe now runs the same browser audit (HyperFrames' script, its WCAG maths and its "held" rule:
  an error once a text fails at two samples) every 0.5 s through each scene whose stage paints a
  field (`BuildResult.fields`), on landed type: a text mid-entrance or mid-exit is half-transparent
  over the field, so it is judged at the next sample. HyperFrames' contrast findings in those scenes
  are dropped, so one text gets one report. A settled ink step is the plain token, not a
  `color-mix()`: the audit skips any colour it cannot parse, and Chrome computes a mix as
  `oklab()`, so a dimmed line was never checked at all.
- `projects/_defects-layout` seeds litt-light's grey over the luminous `ember` field: 5:1 on the
  canvas, under 2:1 on any colour the field passes through, so only an audit that sees the canvas
  catches it; the slow suite requires the finding on that element, and a 31-scene fixture film
  requires the full check (not `--scene`) to report grey type on `accent` as an error.
- Each field is a WebGL context, and so is each GL shot (0009). Chrome keeps 16 live contexts per
  page and drops the oldest past that, with only a console warning. In a probe with 20 contexts it
  lost the first four. The runtime mounts GL shots first, so they would be the ones evicted, and
  three.js draws into a lost context as a no-op: a blank shot, no error. So the cap is checked
  before any context exists. The build reports `webgl-contexts` (error) when GL shots plus fields
  exceed 16, and `prepare()` throws the same message before mounting, so a page built anyway does
  not render. The next step, if films need more, is one shared context that draws each scene's
  field in turn.
- Not built: beat-synced surges (§4), a field in the timeline's data, a CSS fallback.
