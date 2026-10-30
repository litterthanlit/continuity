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

The same class came back twice, on the DOM side, and both times the GL shots matched:

- **A camera push over a flat SVG.** With a 3% push under the end card, 4 of 180 frames differed
  (1–5 levels on 8–22 edge pixels of the mark). The mark had just been drawn at 3.84× by the
  match cut on one worker and never on the other, and Chrome's raster of a layer whose scale keeps
  changing depends on what it drew before. The end card now holds still: 180 of 180.
- **Colour changes on rounded shapes inside a layer.** The beat film's level bars light up one
  per sixteenth inside a window that whipped in. Chrome re-draws only the changed rectangle into
  the tile it already has, and the anti-aliased rounded corners came out 1 level different from a
  tile drawn whole: 14 consecutive frames at the start of a worker's chunk, 48 corner pixels each.
  Square bars: 407 of 407. HyperFrames' Chrome flags have no hook for `--disable-partial-raster`.
- One run of the beat film had a single frame differ that the next run did not reproduce: a
  timing-dependent difference, not a history-dependent one. `gl-bench --determinism` is the
  record; run it more than once before trusting a film.

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
container (B, Xeon at 2.8 GHz), and the same commit measured about 1.4× slower there. B is also
noisy: with no other process running and no CPU steal, the same commit's medians moved by up to
25% between runs. So the final films are given as the range over their runs:

| shot | A, first cut | A, round 1 | B, first cut | B, final (3 runs, median) |
|---|---|---|---|---|
| chrome | 93 / 104 | 98 / 125 | 124 / 169 | 133–159 |
| glass | 125 / 140 | 123 / 142 | 180 / 226 | 197–231 |
| neon + bloom | 98 / 118 | 70 / 78 | 123 / 154 | 123–140 |

(median / p95 ms where one run.) The final shots all carry grain and vignette, and chrome has no
clearcoat (§6). On A every shot was inside 150 ms. On B the bloom shot is inside it, chrome is
inside it on two runs of three, and glass is over it. The budget needs a reference machine and
several runs before it can gate anything; until then `gl-bench` is the record, and glass is the
shot to make cheaper first.

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
- **`chrome`.** Metal, roughness 0.08. The first cut had a clearcoat; once the face was turned to
  catch the studio's horizon it added nothing visible, and dropping it paid for grain and
  vignette (16 ms on container B). Tilted down 6°, the face mirrored the dark floor and read as
  black lacquer: chrome needs its face turned toward the light it reflects.
- **`glass`.** When the shot has a backdrop card, the view ray refracts into the glass (per colour
  channel, for dispersion), crosses a slab of the glass's thickness, leaves parallel to where it
  entered, and samples the card. Reflections come from three's own Fresnel-weighted environment.
  Without a card it falls back to three's transmission, which is about 400 ms a frame. Dispersion
  is 0.03: at 0.08 every bevel carried RGB fringes. Neither the card nor the light that passes
  through the glass is tone mapped (only the reflections are), so clear glass never sits below the
  canvas; tone mapped, the card rendered at 3.8 against 12.8 and dipped at both cuts. Where the
  ray totally internally reflects, it takes the background colour: a mirrored ray drew an orange
  comb.
- **`neon`.** Tubes along every contour of the outline, in the accent at HDR intensity. Bloom
  thresholds on the brightest channel, not luminance: a saturated blue at 4× is only 0.53
  luminance, and the first neon shot never bloomed.
- **`satin`.** A dark clearcoated plastic for cards and bodies.

Colour tokens resolve through the page's CSS before CSS colour keywords, because `canvas` and
`accent` are also system colours (`Canvas`, `AccentColor`). The first build rendered every GL
shot on near-white.

### 7. Post: bloom now; the full-frame passes later

`post: { bloom, vignette, grain }`. Grain is hashed from the pixel, never from time. Without bloom
the overlay is compiled without its three bloom reads per pixel, so grain and vignette cost one
blended full-frame pass (16–19 ms on container B). A preprocessor line written on the same line as
other GLSL failed to compile, and every shot rendered with no post at all; the timings improved
and only the stills showed it. Chromatic
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
