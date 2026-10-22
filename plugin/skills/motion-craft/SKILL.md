---
name: motion-craft
description: The motion design taste layer — litt (Nick's design language) translated for video, in two registers (calm, the default; energetic, for brand reels and montages): frame composition and hierarchy, material and light, colour, then motion: litt's three tiers (instant, responsive spring, one expressive moment per scene), exits, travel, stagger, choreography, holds, the transition language, the camera, emphasis by ink, the energetic register's easing by role, bursts and holds, depth, formulas and mirrored endings, and the anti-patterns the lint gates. Concrete numbers throughout. Load whenever writing or reviewing motion() code or scene layouts for a Continuity project.
---

# Motion craft: litt for video

Continuity's taste is **litt** — technical precision, lit from above. The structure is exact
and quiet: a grid, hairlines, one typeface in three weights, warm stone neutrals. The only bold
move is light and material: a soft light from the top, surfaces that catch it. Color barely
appears; where it does it behaves like light or carries data. **Motion explains and never
performs.** Spec: `docs/decisions/0006-litt-house-language.md`.

**Two registers.** litt can speak quietly or loudly; the look never changes, the motion's energy
does. `calm` (the default, §1–11) is litt as written: a launch, a feature, a statement.
`energetic` (§12) is for brand reels, recaps, montages and collage-led social cuts: steep
in-outs, springs that overshoot for things that act like objects, a camera that travels through
depth, bursts followed by holds. Pick it in the brief and set `"register"` on the storyboard (or
on one scene, for an energetic chapter in a calm video); the lint's bounds follow it, so you never
fight the gate with `allow`. Spec: `docs/decisions/0007-registers.md`.

Numbers are at 1080p (short side 1080px) and 30fps. **Chrome is litt at 2×**: litt's 8px grid
is 16 here (8 inside components), its 1px hairline 2px, its 16px travel 32px.

## 1. Compose the frame first

- **One idea per scene.** One statement at the display step, at most; if a scene needs two,
  it is two scenes.
- **Hierarchy order: weight and ink, then space, then size.** A 500 title in fg over 400 text
  in the grey does most of the work; tight lockups and wide gaps do the rest; the one size step
  to `display` comes last. Never two competing display lines. (Type: the `typography` skill.)
- **Asymmetric and left-aligned by default.** Copy on one left edge (columns 1–5 of 12), the
  visual in 7–12, column 6 left as air. Centered only for one short statement, once per video
  (the end card, a quote). Never everything centered.
- **Airy.** Content occupies ≤ 60% of the safe area. When in doubt, remove an element, never
  shrink the type. Regions sit 96px apart, blocks 32px, lockups 8px.
- **Measure:** ≤ 12 words on screen per scene (16:9), ≤ 7 (9:16); display ≤ 2 lines, broken
  by meaning.
- **Grid:** positions and gaps on 16px (8 inside components). Off-grid values like 20, 28, 36
  as spacing are a smell.
- **Safe areas:** `<Safe>` (16:9) / `<Safe zone="social">` (9:16).
- **Cards are not the default.** Prefer a list, a table or text with hairline dividers; cards
  only for independent objects. Never three equal icon cards as the answer to every scene.

## 2. Material and light (P1–P5)

- **One light source, from the top** (`<Stage bg="lit">`): an accent-tinted falloff anchored
  above the frame. Once or twice per video — the hero, maybe the end card. Every other scene is
  `solid`. Never a second coloured light, never a light from the side, no aurora, mesh or glow
  blobs.
- **Material is static (P5).** The light, the grain, glows and the backdrop never animate,
  loop, pulse or sweep (`material-motion` is an error). The camera may push; the light stays put.
- **Depth without drop shadows (P4).** Cards in the flow are flat: surface-1, the 2px hairline
  and the top highlight (`shadow-raised`). Floating UI (a window over the stage, a toast, a
  menu) gets a zero-offset glow plus a ring (`shadow-float`, `shadow-lift`, `shadow-modal`).
  Nothing has an offset shadow (`litt-shadow`).
- **Glass is earned (P3)** — only on floating UI with content behind it (`Toast`, `ct-glass`).
  Never on cards, never glass on glass.
- **Radius:** controls and tags 8 (`rounded-control`), surfaces 16 (`rounded-surface`), pills
  only for avatars, icon buttons and switches (`litt-radius`). A phone bezel is the device's own.
- Grain is static noise at 2% (light) / 4% (dark); it also dithers the light's banding.

## 3. Colour

- **Warm stone neutrals**, two themes, both first-class: `litt-dark` (default) and `litt-light`.
  Pick one per video; never invert one into the other.
- **The accent is light (P1).** At most one accent fill per frame, on the primary action (a
  `Button variant="primary"`, which carries the glow). Elsewhere the accent appears only as the
  top light, a focus ring, a caret, a cursor's click ring. Never an accent word in a headline,
  never an accent fill behind copy, never a decorative gradient.
- **Colour carries data (P11).** Beyond the accent, colour only says something: a series, a
  category, an identity — the five data hues in a fixed order (blue, amber, teal, violet, rose).
  Status is a word in success / warning / danger, never a dot. A single quantity stays in fg.
- **Contrast** ≥ 4.5:1 for text (the themes are tuned; the gate checks it).

## 4. Motion: three tiers

| Tier | Token | What | Use |
|---|---|---|---|
| Instant | `duration: "instant"`, ease `out` | 0.1s tween | ink steps, a press, a toggle, opacity on small UI |
| Responsive | ease `responsive` | spring, visual 0.2s, bounce 0 (settles ≈ 0.35s) | **the default**: copy, rows, chips, cascades, the gliding highlight, a selection moving |
| Expressive | ease `expressive` | spring, visual 0.35s, bounce 0.12 (settles ≈ 0.58s) | **one moment per scene**: the statement landing, the product placed |

(The energetic register picks eases by role instead — `steep`, `pop`, `linear`: §12.)

**Glide** (`ease: "glide"`, `duration: "glide"` — cubic-bezier(0.32, 0.72, 0, 1) over 0.45s, the
iOS sheet curve: fast start, very long soft stop) is for a surface that *arrives and rests* — a
sheet sliding up, a panel, a phone stepping forward in a before → after. Every register.

- Presets already pick the tier: `rise`, `fade`, `slideLeft/Right`, `maskUp`, `grow` are
  responsive; `settle` is expressive. Make a line the scene's moment with
  `ease: "expressive"`. A second expressive spring in a scene warns (`expressive-budget`).
- **Bounce ≤ 0.12, ever** (`spring-bounce`). Write custom springs as `spring(visual, bounce)`.
- **Exits** run at 0.75× the entrance's visual time, ease `out`, never bounce: the exit presets
  (`fadeOut`, `liftOut`, `dropOut`, `maskOut`, `scaleOut`) derive it (0.15s after a responsive
  entrance, 0.26s after an expressive one). `exit-bounce` warns on a springy exit.
- **What animates:** transform and opacity; ink (instant); masks and clips for reveals; `draw`
  and `counter` for data. Never tracking, weight, blur or filters for effect
  (`property-motion`). Motion blur on a fast push is the one optical exception (transitions add it).
- **Video only — the eye and the hand:** `slow` (0.6s, `inOut`) for a camera focus move, a
  cursor leg, a chart drawing, a playhead; `linger` (1.4s, `out`) for a counter. Never for an
  entrance.

## 5. Travel, stagger, settle

- **Travel 32px** (litt's 16 at 2×) for every entrance — copy, rows, cards, a window. Menus and
  tooltips a quarter (8). Further reads as thrown, not placed (`travel-too-far` warns past 64).
  `settle` is "placed, not thrown": up 32px from 0.98.
- **Stagger 40ms** between siblings (`list`, `grid`, `word`), 80ms between lines, 20ms between
  characters. Order follows reading direction.
- **Settle before the next idea:** a landed statement gets ≥ 150–300ms of stillness before the
  next focal move (`settle-interrupted` errors when a channel is interrupted).

## 6. Choreography — lead, follow, settle

- **One focal point at a time.** One hero motion plus a supporting cascade; ≤ 4–5 independent
  movers at once (`crowded`).
- **Lead → follow:** the label fades, the statement lands (the expressive moment), supporting
  copy follows 100–250ms after it lands (`"after:headline-0.2"`), UI chrome last.
- **Consistent direction:** things rise and leave upward or fade; one direction of travel per
  sequence.
- **Let the cut be the exit.** Don't fade every element out and then transition; exit only
  what must leave before the cut.
- **Show, then tell** for product: the UI acts first, the label lands after.

## 7. Holds and reading

- Text needs `max(0.83s, chars/17 + 0.4s)` on screen from when it starts appearing, and ≥ 0.6s
  fully settled before it leaves (`read-time`). A statement deserves ≥ 1s of stillness; a key
  stat ≥ 1.5s.
- **Ambient life is the camera, and only the camera:** `m.camera({ scale: [1, 1.03] })` over
  the scene — never more than 3% (`camera-drift`). No floating loops, no breathing glows, no
  bg loops (`ambient-loop`, `material-motion`). A caret may blink (`m.blink`). Dead air > 2.5s
  warns; tighten the scene or let the camera carry it.

## 8. Transitions: one language

litt's edit is **cuts on the beat**. A cut is the most premium transition and the primary;
accents are rare and quiet. Pick at most two accent types per video (`transition-language`;
three once a scene is energetic):

| Type | Default | Params | Use for |
|---|---|---|---|
| `cut` | — | | the primary: on the beat |
| `crossfade` | 0.4 | ease | the same surface in a new state (not between unrelated type frames) |
| `dip` | 0.5 | ease | a chapter break, before the end card |
| `push` | 0.5 | dir, blur, ease | sequential steps, in reading direction; `blur: true` when fast |
| `pushUp` | 0.5 | blur, ease | lists, feeds, 9:16 |
| `wipe` | 0.5 | dir, angle, feather, ease | a state revealed; `feather: 8–20`, `angle: 120` for a soft diagonal |
| `depth` | 0.6 | dir (`in`/`out`), ease | **energetic only** (`transition-register`): fly through stacked scenes; `out` reverses it to close the loop |

```json
"transition": { "type": "dip" }
"transition": { "type": "push", "dir": "left", "blur": true }
"transition": { "type": "wipe", "angle": 120, "feather": 14 }
```
Rules: keep one direction of travel; never a spring on a full-frame move
(`transition-bounce`); fast pushes need motion blur (`transition-strobe`); a scene's incoming
and outgoing transitions must not overlap. Whips, punch cuts, irises, strips, light sweeps,
and defocus blurs are gone — each one performs. The zoom came back once, as `depth`, in the
energetic register: a camera move through space, not an effect.

## 9. Camera

The camera is the viewer's eye. An ambient push (1 → ≤ 1.03 over the scene) carries a hold.
The camera scales about the frame centre, so on litt's left-aligned frames anchor the push on
the statement's left edge — `m.camera({ scale: [1, 1.03] }, { origin: { x: 96, y: 860 } })` —
or the text drifts and every hard cut snaps it back. A
deliberate focus move — zoom to the part of the UI that matters, hold, then act — is a short
`inOut` tween (`slow` or a little longer, ≤ 15% zoom/s, `camera-too-fast`). When the camera
moves, the content holds still. The energetic camera travels: pans across a collage on `steep`
(≤ 480px/s, ≤ 50% zoom/s), an ambient push up to 8% — §12.

## 10. Emphasis: by ink

litt ranks by ink, not size. To make a word matter: let the rest of the line step back to the
grey (`m.emphasize(ids, "dim")`) or brighten it from the grey (`"ink"`), at the instant tier.
For a button: `"press"` (to 0.98 and back). Pick ONE emphasis per line. Never a scale punch, a
weight pulse, a glow, a marker bar, a serif swap or an accent colour.

## 11. Anti-patterns (each one fails the critique; most fail the lint)

1. Linear easing on anything that moves through space; bounce past 0.12, a bouncing exit, a
   second expressive moment in a scene (calm; the energetic register's own bounds are in §12).
2. Everything appears at once, or everything staggers identically; long cascades.
3. Elements move before the previous one settled; exits interrupt entrances.
4. Text colliding with text during motion.
5. Shrinking type to fit more copy; type above the display step; two display lines competing.
6. Dead holds — or perpetual busyness: loops, floating cards, breathing glows, pulsing.
7. Every element doing three things (fade + blur + scale + rotate). Choose one idea.
8. Anything material moving: the light, a glow, the grain, the backdrop; light sweeps; sheen.
9. Centered everything; an accent word in the headline; more than one accent fill per frame.
10. Opening on a dead frame — the first motion within 0.1–0.4s.
11. A different transition on every cut; crossfades between unrelated type frames.
12. Generic-AI tells: purple-blue gradient heroes, gradient text, emoji markers, uppercase mono
    eyebrows over every scene, three equal icon cards, an arrow after every line, glow blobs,
    one radius on everything, coloured status dots.

## 12. The energetic register (brand reels, montages, collage)

Reference cut: a 44s square brand reel — the camera flies through stacked compositions, a pixel
globe match-cuts into a grid of 1s and 0s, a terminal types, a collage of map, texture, archive
photo and a slapped-on sticker plays twice (New York, then London), a tree ring gets numbered
markers, and the ending flies back out through the stack onto the terminal, which types the
handle. Dense, fast, physical — and still designed, because every move has a role.

**Choose it** when the viewer should *feel a world* more than understand a product: a brand
reel, a recap ("four months at…"), a culture or hiring film, a montage, a collage-led social cut.
Stay `calm` when a viewer must follow a product or read an argument. A calm launch can carry one
energetic chapter (a customer montage, a "what's inside" burst): set `"register": "energetic"`
on those scenes only. Never mix registers inside one scene.

**What never changes.** Geist in three weights, two inks, warm neutrals; material static (the
grid and the light never move); colour as light or data — a brand sticker counts as the frame's
one accent fill; settle before the next idea; read time; safe areas; transform and opacity.

### Easing by role — the rule that makes it work
| Role | Ease | Duration | For |
|---|---|---|---|
| Interface and camera | `steep` (cubic-bezier(0.87, 0, 0.13, 1)) | `snap` 0.3 for UI; `slow` 0.6–1s for a camera move | panels sliding, a selection block, a wipe, a highlight, a pan, a push |
| Physical objects | `pop` (spring, visual 0.3, bounce 0.3; settles ≈ 0.59s) | its own | a sticker slapping on, collage pieces landing, markers popping in, a card set down |
| Machines and processes | `linear` | a rate | typing (`m.type`, 22–48 cps), a spinning ring (`rotate: [0, 360]`), a playhead |
| Copy in a hold | `responsive` / `expressive` | as calm | the one statement a hold scene lands |

The steep curve is short acceleration, a fast middle and a long landing: decisive and digital,
never floaty. **Never default to a gentle in-out (`inOut`) or the responsive spring on
everything** — uniform easing is the first thing that makes a reel look generated. Pop is for
things with mass, never for UI chrome or a line of copy; steep is for interfaces, never for an
object that should land. Exits still ease `out` and never bounce.

### Timing in frames
Think in frames at 30fps (scale for 24/60): 2f = 0.067s · 3f = 0.1 · 5f = 0.17 · 9f = 0.3
(`snap`) · 15f = 0.5.
- **Small moves 5–15 frames** (0.17–0.5s). A panel, a block, a chip: `snap` on `steep`.
- **Stagger every group 1–3 frames per item** — `stagger: "list"` (40ms ≈ 1f) for light items,
  `0.067` (2f) for heavier pieces, `0.1` (3f) at most. "Pop, pop, pop", never everything at
  once (`unstaggered-group` still warns). Pass a group as one array: it counts as one moment.
- Budget: up to three expressive moments per scene (a group once), bounce ≤ 0.35, entrances
  from ≤ 160px, ≤ 7 movers at once.

### Rhythm: bursts and holds
Alternate. After **2–4s of density, hold one composition for about a second** — a single image,
a single object, a statement — so the eye can rest. A burst is several staggered entrances plus
a moving camera; a hold is one subject with a tile drift or an ambient push (≤ 8%). Plan the
holds in the storyboard as scenes of their own (1–1.6s), not as leftovers. A reel with no holds
is noise; one with no bursts is a calm video in the wrong register.

### Space: think in depth
- **Fly through, don't crossfade.** Stack compositions and move the camera through them:
  `"transition": { "type": "depth" }`. Every piece then lives in one connected space.
- **Close the loop.** The ending reverses the opening move (`{ "type": "depth", "dir": "out" }`)
  and lands on the opening frame, which delivers the call to action. Build both from one shared
  layout in `lib/` so they match to the pixel.
- **Fast pans as wipes:** `{ "type": "push", "dir": "left", "blur": true, "ease": "steep", "duration": 0.4 }`.
- **Match cuts over plain cuts.** End a scene on a shape and open the next on a similar one in
  the same place (pixels → 1s and 0s, a globe → a ring, a terminal → a terminal). It is a hard
  cut whose geometry rhymes: share the position and size through a `lib/` constant.
- **Camera pans across a collage:** `m.camera({ x: [0, -240], scale: [1.04, 1] }, { ease: "steep", duration: 0.9 })`.
- Transition language: cuts and match cuts stay primary; up to three accent types (typically
  `depth` + a blurred `push` + `wipe`).

### Type: it types or it wipes, it never fades
Copy never just fades in (`text-fade` warns). It **types** like a terminal (`m.type`, linear,
for prompts, queries, handles) or **wipes** like a text selection — a block sweeps across and
leaves the words behind (the selection-block recipe), or `wipeRight` on `snap`/`steep` for
labels and captions. `maskUp` on `steep` (a wipe from the baseline) is fine too. The technical
layer speaks in Geist Mono: numbered labels, coordinates, counts.

### Structure: strict containers on a grid
- `<Stage bg="grid">` under almost every energetic scene: a static 2px hairline grid (96px
  cells). Holds on a single photo can go `solid`.
- **Mixed material always sits in a container**: `Media`, `Card`, `Window`, or a 2×2 grid of
  tiles on 32px gutters. Never loose imagery on the stage. Tiles can drift inside their frames
  (`<id>-img` scale 1.06 → 1 over `linger`) while the frames hold still.
- **Lock the palette**: canvas, fg, the grey, one accent (the brand: the sticker), data hues only
  for data. Force imported imagery in with `Media treat` — `mono`, `contrast` or `invert` — one
  treatment per formula, so photos from anywhere look like one archive.

### Systems: invent a formula, then repeat it
A reel feels designed when its chaos has structure. Invent a scene formula and use it **at least
twice with new content** — same slots, same timing, same closing beat:
- **Collage formula:** context (a map) + texture + archive photo + the brand sticker slapping on
  last, on `pop`. City A, then city B.
- **Annotation formula:** an organic subject (a tree ring, a flower, a hand) + `Marker`s popping in
  + `Path` hairlines drawing between them + mono labels. **Pair organic with technical**: grids,
  nodes and mono labels over natural imagery.
Write each formula once in the storyboard (`motion`: "collage formula: map → texture → print,
2f apart on pop; sticker slaps at +0.8s") and reference it by name in every scene that uses it.
Build it as one function in `lib/` that takes the content.

### Energetic anti-patterns
1. Every layer fading in at the same time; copy that fades (type it or wipe it).
2. Floaty, uniform easing on everything — the same `inOut` or spring on UI, objects and camera.
3. Pop on chrome or copy; steep on objects; linear on anything that travels.
4. Unboxed imagery with no grid; a different treatment on every photo.
5. Scenes with no recurring structure — a formula used once is just a scene.
6. A burst with no hold after it; a hold longer than ~1.6s.
7. Loops on copy or chrome (an object may spin or swing; `ambient-loop` is an info here).
8. An ending that doesn't answer the opening.

## 13. Loop clips for X and social
A 5–15s clip that is posted, not presented, is a different form: the claim first (storyboard
`caption`), frame one already mid-action, one reveal, a 30–50% hold, a clean loop, the machinery
on screen. Set `"loop": true` (it turns on `loop-open`, `loop-hold`, `loop-length`, and lets the
closing hold be still) and load the `social-clip` skill. Gallery: `projects/_clip`.

## Recipes
`recipes.md`: statement, label + statement + summary, feature list, stat, product placed,
UI action with a cursor, a selection that glides, ink emphasis, end card, chart, transitions —
and for the energetic register: the steep UI move, the sticker slap, the collage formula, the
annotation formula, the selection-block wipe, the terminal, a 2×2 grid that drifts, a spinning
ring, the match cut, the mirrored ending and a burst-and-hold storyboard — and for loop clips:
the slider (machinery), before → after as a depth swap, code beside the result, lift, and
template-then-swap.
