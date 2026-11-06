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
base, a speed, a blob scale and a warp strength. `accent` reads the theme's own tokens. The other
two are fixed bold palettes that a brand theme can override. A custom spec works too. The build
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
  backdrop. A missing WebGL2 context also throws.

### 4. The timeline does not drive the field

The field moves by itself, at its preset's speed, and no tween reaches it. Material is static in
litt (P5): `material-motion` still lints any tween on the backdrop. The field is the one moving
material, and it moves continuously, so it never competes with the scene's choreography for the
eye. A beat-synced surge (the field speeding up or flaring on a beat) would be a separate input
channel. That is a possible follow-up and is not built.

### 5. Measured

On the session's 4 vCPU container, with `projects/_backgrounds` (two 2 s scenes on `aurora`,
joined by a plain cut):

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

## Consequences

- A backdrop is a binary choice in every project, and the critique counts a faint gradient as a
  defect.
- Type over a field must clear contrast on every colour the field passes through. `aurora`'s cyan
  is too light for `fg` type at 3:1; the gallery labels use the canvas ink. `ct check` reads the
  canvas pixels, so the contrast audit gates this.
- Each field is a WebGL context. Chrome keeps about 16 live contexts per page and drops the oldest
  past that, and GL shots count too. A film with more field scenes than that would hit the
  context-loss error. The next step would be one shared context that draws each scene's field in
  turn.
- Not built: beat-synced surges (§4), a field in the timeline's data, a CSS fallback.
