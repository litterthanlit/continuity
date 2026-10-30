# 0009 — WebGL shots: render path, performance and determinism

**Status:** accepted (spike) · 2026-10-30 · extends 0001 (the engine)

## Context

The viral brand films are made of materials. The same logo is cut through chrome, extruded 3D,
refractive glass, neon, holographic fluid and glitch, about a second per shot, with bloom, depth
of field and chromatic aberration on top. Continuity was DOM and CSS only.

Any new render path has to keep what 0001 established:

- **A frame is a pure function of t.** HyperFrames seeks; there is no clock, no randomness and no
  state carried from one frame to the next.
- **Frames are deterministic across workers.** 0001 measured a PNG sequence byte-identical with
  1 and 4 workers.
- **It fits the frame budget.** 0001 measured 35–150 ms a frame at 1080p in software GL.
- **Open source, pinned exactly, no network at render time.**

## Decisions

### 1. three.js, pinned, loaded only by compositions that use it

`three@0.186.1` (MIT), pinned exactly like HyperFrames. `src/gl/runtime.ts`, the materials and the
post chain bundle into `continuity-gl.js` (615 KB minified). The build writes it and adds the
script tag only when a composition has a `<Gl>` canvas; a DOM film never loads three.

HyperFrames already renders WebGL. In software mode it launches Chrome with ANGLE on SwiftShader
and captures the canvas like any element. We measured this before writing any of it: a raw WebGL2
canvas drawn from a frame source rendered 60 of 60 PNG frames byte-identical with 1 and 4 workers.
A three.js scene with UnrealBloom rendered 60 of 60 identical with 1 and 3 workers.

### 2. A shot is data; its motion is the timeline's

`<Gl ct objects post>` writes a `GlSpec` onto the canvas at build time. Each object has a geometry
(`extrude` an SVG outline, `tubes` along its contours, or a `plane` card with a grid or type), a
material preset and a settled placement. Units are the frame's: px at the z = 0 plane (the camera
sits where one unit is one pixel), y down, degrees.

Objects and the camera (`<ct>-camera`) are timeline targets. A tween on them is a tween like any
other, so the lint, `ct timeline`, strips and the motion assertions all see it. They move on `x`,
`y`, `z`, `rotateX`, `rotateY`, `rotate` and `scale`. Any other channel on a GL target is a build
error (`gl-prop`). Materials have no channels at all, which enforces litt's rule that material is
static.

### 3. The render path

At prepare time the motion runtime mounts each shot: a WebGL context, the procedural studio
environment prefiltered once (PMREM), the geometry, and one render to compile every shader. Each
frame, `apply(scene, t)` hands the GL targets' values to their shot and then renders the shot once.
A shot whose values did not change since its last render is not redrawn; the canvas keeps the
same pixels (`preserveDrawingBuffer`). That is an optimisation, not state: the pixels are the
same either way.

### 4. Determinism, measured

`node scripts/gl-bench.mjs example-logo --determinism 4` renders the film as a PNG sequence with
1 and 4 workers and compares the md5 of every frame. For the final 6 s cut: **180 of 180 frames
byte-identical, 167 distinct** (the end card holds). The 5 s first cut gave 150 of 150 after the
fix below, and the first run of it gave 145 of 150. All five differing frames were in the DOM end card,
never in a GL shot, on the edges of the flat SVG mark under the camera push (at most 23 pixels, at
most 4 levels). We bisected it on a throwaway project. It was not text, not Chrome's partial raster
(the flag changed nothing) and not layer promotion (`will-change` made it 15 of 60). It was
`overflow: visible` on the SVG. Clipped, every frame matched. 0008 §7 records the rule and the
lint that now enforces it.

### 5. Performance, measured

The budget is the in-page cost of one GL frame at 1080p in SwiftShader on a 4 vCPU container.
`gl-bench` seeks frame by frame and reads a pixel back from every GL canvas. `gl.finish()` does
not wait across Chrome's GPU process: our first timing read 0.5 ms for a 300 ms frame.

| shot | first version | what changed | first cut, container A (median / p95) |
|---|---|---|---|
| neon + bloom | 340 ms: scene into a 4-sample MSAA half-float target, UnrealBloom | no MSAA (167); scene straight to the canvas, bloom from a quarter-size re-render (111); 8-bit bloom pyramid (69) | 98 / 118 ms |
| glass | 410 ms: three's transmission re-renders the scene behind the glass every frame | analytic slab refraction of the shot's backdrop card (167); bilinear, mipmap-free backdrop (127) | 125 / 140 ms |
| chrome | 88 ms: physical metal with a clearcoat | kept: plain metal is 72 ms and reads flatter | 93 / 104 ms |

Those are container A. Each full-resolution pass costs 20–40 ms in software at 1080p, so the
post chain has exactly one: a blended overlay. Half-float targets cost about 40 ms more than
8-bit ones, so only the quarter-size scene copy is HDR.

The machine moves the cost more than any change above. The session moved to a second 4 vCPU
container (B, Xeon at 2.8 GHz) and we measured the same commit on both, then the final films:

| shot | A, first cut | B, first cut | A, final | B, final |
|---|---|---|---|---|
| chrome | 93 / 104 | 124 / 169 | 98 / 125 | 143 / 195 |
| glass | 125 / 140 | 180 / 226 | 123 / 142 | 178 / 215 |
| neon + bloom | 98 / 118 | 123 / 154 | 70 / 78 | 126 / 152 |

(median / p95 ms.) On A every shot is inside 150 ms. On B, chrome and the bloom shot are inside
it at the median and glass is not: about 1.4× slower for the same code. The final chrome costs a
little more than the first because it lands turned, with more bevel on screen. The budget needs
a reference machine before it can gate anything; until then `gl-bench` is the record, and glass
is the shot to make cheaper first.

End to end on B, `ct render example-logo` (6 s, 90 GL frames of 180) takes 73.1 s with 4
workers; each worker spends 8–13 s mounting three shots (three environment prefilters and shader
compiles). The 13.6 s DOM film renders in 40.2 s. On A the 5 s first cut took 48.7 s. A 4-worker PNG render of example-logo took 64 s
against 86 s with 1 worker, so 4 workers stay the default. A small GL probe was slower with 4
workers than with 1, because the SwiftShader instances compete for the same 4 cores. Long GL films
may want fewer workers.

### 6. Materials

- **Studio environment.** litt's light from above, built from geometry: a softbox overhead, a
  tall card behind the camera that is bright above a crisp horizon line, strips at the sides and a
  faint bounce. Chrome reads as chrome because its face reflects light over dark, and the line
  sweeps across it as the mark turns.
- **Smooth bevels.** `ExtrudeGeometry` is unindexed, so its normals are flat per triangle: every
  curve sample was a facet, chrome's highlights broke into dashes along the bevel and the glass
  refraction sliced the type behind it into a comb. The sides (bevel and walls) now get normals
  averaged over the faces that meet within 40°, and the caps stay flat (their long thin triangles
  streak with any tilt). Doubling the curve and bevel samples as well cost chrome 45 ms and glass
  30 ms for no visible gain, so the sample counts stayed.
- **`chrome`.** Physical metal, roughness 0.08, clearcoat 0.6.
- **`glass`.** When the shot has a backdrop card, the view ray refracts into the glass (per colour
  channel, for dispersion), crosses a slab of the glass's thickness, leaves parallel to where it
  entered, and samples the card. Reflections come from three's own Fresnel-weighted environment.
  Without a card it falls back to three's transmission, which is about 400 ms a frame. Dispersion
  is 0.03: at 0.08 every bevel carried RGB fringes. The card itself is not tone mapped, so its
  canvas colour matches the other shots' background (tone mapped, it rendered at 3.8 against 12.8
  and dipped at both cuts).
- **`neon`.** Tubes along every contour of the outline, in the accent at HDR intensity. Bloom
  thresholds on the brightest channel, not luminance: a saturated blue at 4× is only 0.53
  luminance, and the first neon shot never bloomed.
- **`satin`.** A dark clearcoated plastic for cards and bodies.

Colour tokens resolve through the page's CSS before CSS colour keywords, because `canvas` and
`accent` are also system colours (`Canvas`, `AccentColor`). The first build rendered every GL
shot on near-white.

### 7. Post: bloom now; the full-frame passes later

`post: { bloom, vignette, grain }`. Grain is hashed from the pixel, never from time. Chromatic
aberration, glitch, displacement and depth of field all need the whole frame as a texture: the
scene rendered into a full-size target (about 40 ms a frame in software, more in half float) and
read back by the pass. They are deferred until that cost is decided. Running them over DOM scenes
needs the DOM as a texture, which this Chrome build cannot draw (`drawElementImage` is
Canary-only). HyperFrames' page-side compositing is the likely route.

## Consequences

- The agent's eyes work on GL as on DOM: stills, sheets, strips and `ct check` capture the
  canvas, and the energy chart reads it from the render. `ct check` drops Chrome's "GPU stall due
  to ReadPixels" notice, which the capture itself causes.
- The probe's text rules cannot see type drawn into a GL texture (a backdrop card). The critic
  must read it from the stills.
- `scripts/gl-bench.mjs` is the lever for this record. It reports per-scene cost and, with
  `--determinism N`, md5 parity between 1 and N workers. Rerun it when the engine, three or
  HyperFrames changes.
- Not built yet: holographic and iridescent materials, extruded text, glitch, displacement, depth
  of field, DOM-to-texture post, a GL camera that flies through DOM panels, particles and physics.
  The spec's `version` field leaves room for them.
