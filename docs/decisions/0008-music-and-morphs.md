# 0008 — Music, beats and morphs

**Status:** accepted · 2026-10-30 · extends 0007 (the energetic register)

## Context

The motion that travels on X is cut to music. In the references we studied (Gal Shir's brand
films for Framer and Swan, the Apple Creator Studio promo by @avstorm, Kimi's WebGL hero film),
every cut and every snap lands on a beat. Elements whip in within a frame or two and then drift.
Scenes flow into each other: text becomes a UI, the UI becomes a dock, the dock becomes a device.

Continuity had a `bpm` number on the storyboard and an info-level `cut-off-beat` rule against
that bare grid. It had no audio in the render, no way to place a move on a beat, and no way to
carry an element across a cut. 0006 had removed the whip from litt on purpose: in a calm film it
performs. 0007 created the energetic register for films where performed moves are the point.

## Decisions

### 1. Music is storyboard data, analysed at build time

`music: { src, start, offset, volume, fadeIn, fadeOut, bpm?, downbeat?, beatsPerBar }`. The
build decodes the track with ffmpeg and analyses it in Node (`src/audio/analyze.ts`): an STFT,
spectral flux in three bands, tempo by autocorrelation, beats by dynamic programming, each beat
and onset refined to its true attack in the time domain, and the bar phase from a kick and
snare template plus harmonic change. The result is cached under `build/.ct/music`, keyed by the
track's bytes, the options and the analyser's own source.

We wrote the analyser instead of calling `hyperframes beats` because ours runs without a
browser, returns onsets and bars as well as beats, and can be tested against ground truth.
`src/audio/synth.ts` synthesises songs and returns where every beat and hit really is.
`tests/audio.test.ts` holds the analyser to it.

| test song | bpm error | worst beat error | missed / extra | downbeats |
|---|---|---|---|---|
| 90 bpm, four on the floor | 0.00 | 2.7 ms | 0 / 0 | all on bar lines |
| 110 bpm, 0.37 s lead-in | 0.00 | 4.2 ms | 0 / 0 | all |
| 124 bpm, swung 16th hats | 0.00 | 4.0 ms | 0 / 0 | all |
| 140 bpm, kick on 1 and 3 | 0.00 | 2.7 ms | 0 / 0 | all |

A 30 s track analyses in 0.6–0.9 s. When the template scores two bar phases within 15% of each
other (four on the floor with a backbeat does), the phase that starts on the track's first beat
wins, because a produced bed opens on a downbeat. `downbeat` and `bpm` override the analysis
when it hears a pickup or half time.

### 2. Time can be counted in music

- A scene's `duration` may be `{ "beats": N }` or `{ "bars": N }`. It starts at the grid point
  nearest its start and ends on the frame nearest the point N later, so the cut into the next
  scene is on the music. Transitions still overlap as before. The frame matters: a cut shows on
  the first frame at or after its start, and the analysed beat at 1.002 s first showed the next
  scene on frame 31, a whole frame late. The end rounds down onto the frame's time (62/30 must
  not become 2.0667).
- Moves on the music land on frames too: story beats, `beat:`/`bar:`/`hit:` refs and `snap` all
  go through one `onFrame`. With only the cut rounded, a scene started on its frame (3.8666 s)
  and its beat-0 entrance at the analysed 3.8670 s, so every cut opened on an empty frame.
  Halfway between two frames (an eighth at 120 bpm and 30 fps) takes the earlier one: sound a
  little after the picture reads as in sync, before it does not (ITU-R BT.1359).
- A story beat's `at` may be `{ "beat": 2 }` (fractional for off-beats), `{ "bar": 1 }` or
  `{ "hit": 0 }`, counted from the scene's start.
- Motion code can write `"beat:4"`, `"bar:1"` and `"hit:0"` (with offsets, as `"beat:4-0.05"`),
  pass `snap: "beat" | "half" | "bar" | "hit"`, and read `m.music` for loops over beats.

The storyboard resolves to seconds when it loads. Everything downstream (timings, lint, the
runtime) still sees seconds.

### 3. The render carries the sound, and proves it is in sync

The composition gets the track as a HyperFrames audio clip, and `ct render` mixes it in. Render QC
then decodes the rendered file's own audio, analyses it again, and compares the hits it hears with
where the timeline put them. A median offset over one frame is an error. A unit test muxes a
track under a blank video in sync and 100 ms late: the first passes within a frame and the second
fails. On the example films the median offset is 0 ms over 20 of 20 hits (example-logo) and 41 of
41 (example-beat). Av-sync proves the mix, not the picture: it compares the sound with the
timeline. The cut itself is checked where it shows (§4).

### 4. The agent can see the music

`ct beats <slug>` prints the tempo and where each cut lands, and draws a chart: the waveform,
bars, beats, hits by band, the cuts (red when off the beat), and where every move starts (green on
a beat or hit, amber one to three frames off). With music, `cut-off-beat` is a warning against
the analysed beats. Both measure a cut at the frame where it shows, not at its start time: the
one-frame-late cuts read "on the beat" until they did. A new info rule, `off-beat`, flags moves that start one to three frames off a
beat: they read as late, not as syncopated.

### 5. Whip and drift, squash and stretch (energetic only)

- Ease `whip` is `{ type: "whip", snap, share }`. 85% of the travel happens in the first 0.05 s
  (about 1.5 frames at 30 fps), the rest drifts on a quadratic ease-out that comes to rest at the
  end. The token keeps the snap at 0.05 s whatever the tween's duration. Its natural duration is
  the new `drift` token (1 s).
- Enter preset `whip` (`dir`, `distance` default 160) is seen on its first frame as a smear: full
  opacity and its peak directional blur, which falls away over the snap. Fading up from nothing,
  a whip on a cut opened the scene on a blank frame.
- Tween option `squash` (0–0.5) stretches an element along its velocity and squashes it against
  its acceleration, keeping its area. The runtime computes both from the element's own x/y motion
  at each frame, so it stays a pure function of t.
- Both belong to the energetic register. The register bounds gain `whip`, and the lint rule
  `ease-register` warns when a calm scene uses either.

### 6. The morph transition carries an element across the cut

`transition: { "type": "morph", "pairs": [["c3", "tile"]], "squash": 0.2, "arc": 0.1 }`. Each
pair gets a carrier in the incoming scene's overlay, holding clones of both elements. At prepare
time the runtime measures the outgoing element where the cut starts and the incoming one where
it lands, through cameras and all. After that, every frame is a pure function of the carrier's
`match` channel. The carrier travels between the two rectangles (bent by `arc`, deformed by
`squash`). Under the clones travels a shell: the container's fill, border and corner radius,
interpolated from one end to the other. The content swaps on top of it over a short crossfade
centred on halfway (0.4–0.6 of the carrier's progress), about one frame of a fast move. A long
cross-dissolve of two sets of copy read as a double exposure, a swap with a gap between the
sides left the card empty, and a swap without the shell blinked the card out. The rest of the incoming scene crossfades in under the
carrier. When both sides are `<Shape>`s, the carrier morphs the outline in frame space instead.

A pair must be at rest at the handoff. The carrier clones the element as built, so a child with
its own entrance during the morph would appear in the carrier, vanish when the real element takes
over, and then pop in again. Pairs should share an aspect ratio: the clones scale to the
carrier's box on each axis, so copy in a card of another shape stretches in flight. The outgoing
scene's other elements should clear the stage, or the carrier passes over their copy. The carrier
hands over by time, not by value, because a spring passes 1 mid-flight. It sets `visibility: inherit`, never `visible`: an explicit `visible` showed the
incoming scene's carrier over the outgoing scene, and `ct check` caught it as occluded text.

### 7. Shapes morph

- `<Shape d>` draws a filled outline. `<Morph shapes>` morphs between outlines on the `morph`
  channel (0 is the first shape, 1 the second).
- `textShape(text, { size, weight })` returns text as an outline from the vendored Geist.
- `placeShape` scales and moves an outline so a morph can land it where the layout wants it.
- `src/motion/morph.ts` parses every SVG path command, flattens curves, matches contours across
  shapes by area and centroid, and rotates each pair to the start that minimises travel.
  `collapse: "in-place"` (the default) grows a contour with no counterpart from its own centroid,
  the right choice for an O into an I. `"into"` pours it into the nearest point of the other
  shape, the right choice for a word into a mark. A lone contour collapses over the first 60% of
  the step and grows over the last 60%: shrinking all the way, a word's letters hung about as a
  tiny stray caption. A lone hole closes where it is, even under `"into"`: poured into the
  other shape, the o's counter bit a crescent out of the mark's dot.
- Shapes fill nonzero, SVG's default and the rule fonts are drawn for. Under even-odd, Geist's t
  (its stem and bar overlap) had a hole where they cross. Nonzero makes orientation matter, so
  each shape is first turned so its outer contours run positive (a whole-shape flip fills the
  same), contours pair only with their own kind (outer with outer, hole with hole), and no
  contour is ever reversed. A hole stays a hole at rest and in flight, and overlapping contours
  in flight fill as one.
- Shapes clip to their viewBox. An inline SVG with `overflow: visible`, under a transform that
  changes every frame, rasterised a few edge pixels 2–4 levels differently depending on what the
  same worker drew before: 145 of 150 frames were byte-identical between 1 and 4 workers.
  Clipped, 150 of 150 were. The source lint rule `svg-overflow` now flags it in scene code.

## Consequences

- New: `ct beats`, the av-sync render QC, `ease-register`, `off-beat`, `svg-overflow`, the
  `whip`/`drift` tokens, the `whip` preset, `squash`, the `morph` transition, `<Shape>`,
  `<Morph>`, `textShape`, `placeShape`, `shapeBounds`. `scripts/make-music.ts` generates the demo
  tracks; `--check` proves the committed WAVs match their songs.
- `projects/example-beat` is the reference film: scenes in bars, moves on beats, whip with
  squash, a card carried into a stat tile on the boom, and the wordmark poured into the mark on
  a kick.
- `ct check --deep` stages the motion assertions only when there are some. A film where nothing
  fades in on its own (GL shots, carried, typed or wiped copy) has none, and HyperFrames rejects
  an empty spec.
- Building one scene alone (`--scene`) drops a morph's pairs, because its neighbours are
  placeholders. `ct lint --scene` had hidden the resulting error by filtering to the scene.
- Existing projects are untouched. A snapshot of seven projects' timelines and lint findings
  (`scripts/timeline-snapshot.mjs`) is identical before and after.
- Known gaps:
  - A clap's attack is found up to 32 ms late; the analyser's tests cover kicks and snares, and
    the demo songs use snares.
  - The tempo prior is centred on 120 bpm, so a real 70 bpm track reads as double time (`bpm`
    fixes it), and the bar template assumes a backbeat genre (`downbeat` fixes it).
  - No test synthesises a drifting tempo. The tracker allows it, but that is unmeasured.
  - Carriers clone static HTML, so text split by the runtime travels unsplit.
  - Nonzero needs outlines whose holes run the other way round from their outers (fonts and
    design-tool exports do). An SVG drawn for even-odd, with holes the same way round, fills them.
  - `textShape` reaches into fontkit 2.0.4's internals to vary Geist's WOFF2 weights. fontkit is
    pinned and a test checks weights against fontkit's own default instance.
