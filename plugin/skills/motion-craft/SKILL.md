---
name: motion-craft
description: The motion design taste layer — litt (Nick's design language) translated for video, in two registers (calm, the default; energetic, for brand reels and montages): frame composition and hierarchy, material and light, colour, then motion: litt's three tiers (instant, responsive spring, one expressive moment per scene), exits, travel, stagger, choreography, holds, the transition language, the camera, emphasis by ink, the energetic register's easing by role, bursts and holds, depth, formulas and mirrored endings, and the anti-patterns the lint gates. Concrete numbers throughout. Load whenever writing or reviewing motion() code or scene layouts for a Continuity project.
---

# Motion craft: litt for video

Continuity's taste is **litt** — technical precision, lit from above. The structure is exact
and quiet: a grid, hairlines, one typeface in three weights, warm stone neutrals. The only bold
move is material: a backdrop that is one flat colour or a bold field of colour that keeps moving
(the hero, the end card), and surfaces that catch a top highlight. Color barely appears
elsewhere; where it does it behaves like light or carries data. **Motion explains and never
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

- **A backdrop is one colour or a moving field** — never a faint gradient. `<Stage bg="solid">`
  is the canvas (the default); `<Stage bg="gradient" gradient="accent|aurora|ember">` is a bold
  WebGL colour field that drifts on its own (`docs/decisions/0011`). Use the field on the hero
  and the end card; every other scene is `solid`. Hand-made gradients, radial glows and glow
  blobs are `litt-gradient`.
- **Type on a field is `fg`, in both themes.** Each preset is tuned per theme for its `fg`: on
  litt-dark the fields stay deep (luminance ≤ ~0.19 on `accent` and `aurora`, ≤ ~0.25 on `ember`)
  under near-white `fg`; on litt-light they stay luminous (≥ ~0.14 on `accent`, ≥ ~0.25 on
  `aurora` and `ember`) under near-black `fg`. So **large `fg` type (≥ 24px) clears 3:1 anywhere**
  on every preset; body type does not everywhere (fg over litt-dark's `#507afd` is 3.6:1), and the
  greys fall under 3:1 on every field. Hold the hierarchy by size and weight in one ink; an ink
  step (`ink`, `dim`) belongs on a solid scene. Put body copy on a `<Card glass>` (the field blurs
  through it). `ct check` samples a field scene every 0.5s, so a miss anywhere in it is a
  `contrast_aa_failure`.
- **Material is static (P5), except the field.** Grain, glows and the solid backdrop never
  animate, loop, pulse or sweep, and a tween never touches the backdrop (`material-motion` is an
  error): a gradient field moves by itself. The camera may push.
- **Depth without drop shadows (P4).** Cards in the flow are flat: surface-1, the 2px hairline
  and the top highlight (`shadow-raised`). Floating UI (a window over the stage, a toast, a
  menu) gets a zero-offset glow plus a ring (`shadow-float`, `shadow-lift`, `shadow-modal`).
  Nothing has an offset shadow (`litt-shadow`).
- **Glass is earned (P3)** — only on floating UI with content behind it (`Toast`, `ct-glass`,
  or `<Card glass>` floating over a gradient field). Never on cards in the flow, never glass on glass.
- **Radius:** controls and tags 8 (`rounded-control`), surfaces 16 (`rounded-surface`), pills
  only for avatars, icon buttons and switches (`litt-radius`). A phone bezel is the device's own.
- Grain is static noise at 2% (light) / 4% (dark). (The field dithers itself; grain is texture.)

## 3. Colour

- **Warm stone neutrals**, two themes, both first-class: `litt-dark` (default) and `litt-light`.
  Pick one per video; never invert one into the other.
- **The accent is light (P1).** At most one accent fill per frame, on the primary action (a
  `Button variant="primary"`, which carries the glow). Elsewhere the accent appears only as the
  focus ring, a caret, a cursor's click ring — or as material: the `accent` field is a backdrop,
  not a fill. Put the primary button on a field of another hue (`aurora`) or on `solid`, so the
  one fill still stands out. Never an accent word in a headline,
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

## 8. Transitions: one language, and the eye never stops

litt's edit is **cuts on the beat** — but a cut is only premium when something carries the eye
across it. Plan every join as a handoff (docs/decisions/0010): what does the eye ride from this
shot into the next?

| The eye rides… | Move | Example |
|---|---|---|
| a **direction** | `carry` (a cut on movement) | the camera is travelling left when the cut lands; the next shot decelerates from that speed |
| a **place** | `match` (a cut) | the logo is exactly where the ring was, then settles; the chip sliding right keeps going and becomes the card |
| an **element** | `portal`, `morph` | the camera goes *into* the tile and the tile becomes the next scene; the card flies to become the stat |
| an **action** | a plain `cut` with an exit into it or an entrance on it | the row slides off as the cut lands; the headline whips in on frame 0 |
| **nothing** (punctuation) | a plain `cut` between two rests, `dip` | after a statement's hold; before the end card |

A film whose joins mostly carry nothing reads as a slideshow: `dead-cut` (info) marks each cut
between two rests and `static-edit` warns when they are most of the film. A still cut is
punctuation — use it two or three times a film, on purpose.

Cuts, match cuts and carries are the primary. Accents are rare and quiet: pick at most two accent
types per video (`transition-language`; three once a scene is energetic):

| Type | Default | Params | Use for |
|---|---|---|---|
| `cut` | — | | on the beat; with motion on one side of it |
| `match` | 0.6 | pairs, ease | **primary**: an element starts where its partner was — place, size, speed, fill and corner — and settles into its own (below) |
| `carry` | 0.5 | dir, distance, blur, layers | **primary**: a cut on movement — 40% of the travel before the cut (accelerating), 60% after (decelerating, same speed at the cut). `distance` 6–12 calm (a drift); 30–60 energetic (a whip pan, blur on its own) |
| `portal` | 0.8 | via, dir (`in`/`out`), ease | the camera goes through an element: `in` — the outgoing scene grows until `via` fills the frame and the next scene is what was inside it; `out` — the scene shrinks into `via` in the next one (a pull-back to the screen it played on) |
| `morph` | 0.6 | pairs, squash, arc, ease | one element carries the cut and becomes its partner (below, §13) |
| `crossfade` | 0.4 | ease | the same surface in a new state (not between unrelated type frames) |
| `dip` | 0.5 | ease | a chapter break, before the end card |
| `push` | 0.5 | dir, blur, layers, ease | sequential steps, in reading direction; `blur: true` when fast |
| `pushUp` | 0.5 | blur, layers, ease | lists, feeds, 9:16 |
| `wipe` | 0.5 | dir, angle, feather, ease | a state revealed; `feather: 8–20`, `angle: 120` for a soft diagonal |
| `pixels` | 0.5 | dir, ease | **energetic only**: a digital cut through the canvas — cells dissolve the outgoing scene to the canvas, then reveal the next, an ordered dither sweeping the way it travels. Once a film, as an accent |
| `depth` | 0.6 | dir (`in`/`out`), ease | **energetic only** (`transition-register`): fly through stacked scenes; `out` reverses it to close the loop |

```json
"transition": { "type": "carry", "dir": "left", "distance": 10 }
"transition": { "type": "carry", "dir": "left", "distance": 12, "layers": true }
"transition": { "type": "portal", "via": "tile-2", "duration": 0.9 }
"transition": { "type": "portal", "dir": "out", "via": "screen-body", "duration": 1 }
"transition": { "type": "push", "dir": "left", "blur": true }
```

### Match cut (`match`)
Each pair is measured at prepare: the incoming element starts where its partner was on the
outgoing scene's last frame, the same place and size, and settles into its own over the duration.
- **Speed carries through the cut.** If the partner is moving at the cut (≥ 60 px/s), the element
  leaves the cut at exactly the partner's last-frame velocity and travels to its place on one
  curve per axis (a cubic Hermite: starts at that velocity, ends at rest), while its size grows
  about its centre on `inOut`. Where an axis has nowhere to travel, the speed there is an impulse:
  out at that speed and back. From rest it is the plain match: the place settles on `out` (or the
  `ease` you set; a moving partner uses `inOut` for the size, fill and corner).
- **The reach rule.** Place the incoming element about ⅓–⅔ of `v·d` along the travel from where
  the partner is at the cut (`v` the partner's speed, `d` the match's duration). In that window
  the move only slows after the cut. Further, and it must speed up after the cut to get there (a
  surge); nearer, and it overshoots and comes back. Across the travel, keep the offset under about
  0.47·`v·d` (with the along offset at ⅓–½ of `v·d`; about 0.24·`v·d` at ⅔): further across, the
  speed dips and rises again after the cut (a bump). Example: a chip at 1600 px/s into a 0.8s match
  reaches 430–850 px along and up to 600 px across; `_flow` puts the card 720 px along and 128 px across.
- **Fill and corner turn into its own.** The first frame has the partner's corner radius as seen
  (a pill stays a pill) and, between two opaque solid fills, its fill; both turn into the
  element's own on the place's ease (the fill mixes in oklab). A gradient, image or transparent
  side gets no fill change, only the corner.
- **Recipe:** give the outgoing element its own move into the cut, still accelerating on the last
  frame (t², `{ type: "bezier", p: [1/3, 0, 2/3, 1/3] }` ending at `end`), and put the incoming
  element within reach along that travel (above), so the move carries on and slows into place
  instead of reversing or surging. Pair the copy
  that stays (`"label"`, `"title"`) too, so only the element that changes moves. Bring the
  incoming element's own content in after it lands (`at` ≈ the match's duration). `_flow`'s
  `chip` → `card` is the reference.
- Built alone (`--scene`), a neighbour is a placeholder: the match has no pairs and is a plain cut.

### Cut on movement (`carry`)
- The move must already be there: drift the outgoing scene's camera or its last exit the same way
  (`dir`), and let the incoming scene's first entrance travel that way too. One direction of travel
  per chapter; reverse it only at a chapter break.
- Put the cut (the scene's end) on the beat: the fastest frame lands on the hit.
- Calm keeps `distance` ≤ 15 (`transition-register` warns above). A whip pan (30–60) is energetic.
- The scene roots only translate, never zoom, so every point of the frame crosses the cut at one
  speed: at the centre and at ±⅓ of the frame, the speed after the cut is the speed before it
  (within 4% frame to frame, measured on screen at distance 12 and 45). While a root travels, its Stage's backdrop and grain bleed past its edge by
  the travel, so the trailing edge shows the canvas, the grain or more of the field, never the frame
  behind. Nothing to do in the scene, as long as the background is the Stage's own `bg`: a colour
  painted on the content (`bg="none"` and a filled layer) does not bleed.

### Layered handoffs (`layers: true` on `carry`, `push`, `pushUp`)
A planar join moves each scene as one flat plane; real motion design hands over in layers —
the copy leads, the UI follows, the decor trails, a wave in the direction of travel. `layers: true`
adds that on top of the plane: each **top-level** storyboard element with a role shifts a little
further than its scene (8% of the frame along the axis × its depth), in order along the travel.
- **When:** between two scenes that share a layout (copy + a surface), the steps of a chapter —
  where a plain carry would read as a carousel. Not for a statement frame with one element (there
  is nothing to layer), and not when an element carries the cut on its own (`match`, `morph`).
- **What it does:** each layer keeps one speed through the cut, so no layer jumps. Layers do not
  move like their plane — the copy outruns the product, which outruns the decor; that difference is
  the wave — but each one's speed on screen is the same on both sides of the cut (within 4% frame
  to frame at the centre and at ±⅓ of the frame, measured with the root's transform) and then only falls.
  - In a **carry**, each layer makes its own t² move and splits it at the cut the way the plane does.
    - The leader leaves the earliest, before the plane starts. Later layers leave nearer the plane's own start, and none leaves after it.
    - Each layer lands its own delay after the plane does.
    - Each layer's travel, 2 × depth × 8% of the frame, is split in proportion to its time before and after the cut. So each layer crosses the cut at one speed on both sides, and decelerates to rest.
  - In a **push**, on the push's ease:
    - Outgoing, a layer starts at the plane's start + its delay and lands with the plane.
    - Incoming, it starts with the plane and takes its delay longer to land.
  - The shift is additive, so the element's own entrance (a `rise` on frame 0) runs through it. You don't need to remove it.
- **Depth by role:**

  | Role | Depth | Reads as |
  |---|---|---|
  | `headline` `title` `body` `label` `caption` `stat` `cta` `logo` | 1.0 | copy: leads, moves most |
  | `ui` | 0.6 | the product surface follows |
  | `decor` `media` | 0.35 | trails, nearly with the plane |

- **Anchors order the wave.** The storyboard `anchor` sets who goes first: for `dir: "left"` column
  A first (by the element's leftmost column), `right` F first, `up` row 1 first, `down` row 6 first;
  ties by the other axis. Steps are the list stagger (40ms), compressed so the last starts by 0.3·d;
  elements without an anchor go last. Give every element a true anchor or the wave lies.
- Only top-level elements take the handoff: an element inside another storyboard element *with a
  role* rides that parent. Elements without a role ride the plane, and a role-less wrapper does not
  hold back the elements inside it (each with a role takes the handoff on its own). Built alone
  (`ct check --scene`), the join is the plain move.

### Through an element (`portal`)
- `via` is the element that *stands for* the next scene: a tile, a thumbnail, a window's body, a
  phone screen, a button. A 16:9 element (9:16 in portrait) opens without a crop; other shapes
  open as a crop of the next scene.
- In: what is inside `via` should look like the next scene's first frame (a thumbnail of it, or
  the same headline), so the window fades from the element into the live scene. The outgoing
  scene's other elements need no exit: they fly past the camera. Start the next scene's own
  entrances after the portal lands (its duration).
- Out (the pull-back): `via` is in the incoming scene and holds a still of the outgoing shot's
  last frame (draw it without ct ids), so the handoff is invisible. "It was on a screen all along."
- The portal is the scene's move: no camera push of its own in either scene during it.

The gallery `projects/_flow` chains portal in → layered carry → portal out; judge them mid-flight with
`npx ct stills _flow --at …`.

Rules: never a spring on a full-frame move (`transition-bounce`); fast pushes need motion blur
(`transition-strobe`); a scene's incoming and outgoing transitions must not overlap. Irises,
strips, light sweeps and defocus blurs are gone — each one performs. The zoom came back as `depth`
(energetic) and `portal` (both registers), and the whip as `carry`: each a camera move through
space, not an effect.

## 9. Camera

The camera is the viewer's eye. An ambient push (1 → ≤ 1.03 over the scene) carries a hold.
The camera scales about the frame centre, so on litt's left-aligned frames anchor the push on
the statement's left edge — `m.camera({ scale: [1, 1.03] }, { origin: { x: 96, y: 860 } })` —
or the text drifts and every hard cut snaps it back. A
deliberate focus move — zoom to the part of the UI that matters, hold, then act — is a short
`inOut` tween (`slow` or a little longer, ≤ 15% zoom/s, `camera-too-fast`). When the camera
moves, the content holds still. The energetic camera travels: pans across a collage on `steep`
(≤ 480px/s, ≤ 50% zoom/s), an ambient push up to 8% — §12. A zoom (a scale change) runs about its
fixed point at a proportional rate, so its ease is its feel: `inOut`, with time for its size (a
15× macro wants ~1.4s). `steep` on a zoom doubles the frame in one frame (`zoom-lunge`).
Fast moves carry the shutter's motion blur by themselves; nothing to add.

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

## 13. On the music: beats, whips, morphs and material (docs/decisions/0008, 0009)

The films that travel on X are cut to music: every cut and every snap lands on a beat, moves whip
in and drift, scenes flow into each other, and a logo is cut through materials a second at a
time. This is the energetic register's toolkit; the look stays litt.

### Cut on the music
- Put the track in the storyboard (`music`) and plan **in bars**: a scene is `{ "bars": 1 }` or
  `{ "beats": 6 }`, so its cut lands on that beat. At 120–128 bpm one bar is ≈ 1.9s: a kinetic
  line or a UI beat; two beats ≈ 1s: a material shot. Run `npx ct beats <slug>` before building
  scenes and read the chart: every cut white, the bars where you think they are.
- **The hit is the frame where motion starts.** Place snaps on beats (`at: "beat:2"`), not
  landings: a whip or a cut reads on its first frame. A `steep` move starts slow, so its visible
  hit comes ~0.15s late: start it half its duration early (`at: "l2-0.15"` for a `snap`), or put
  an ease-out or a whip on the beat. Something that can't start earlier (at a cut) eases `out`.
- **A cut is a frame.** Scenes timed in beats end on the frame nearest the beat, and `ct beats`
  judges each cut where it shows. A scene timed in seconds can still put its cut a frame late.
- Off-beats are deliberate or they are mistakes: a move one to three frames off a beat reads as
  late (`off-beat`). Put it on the beat (`snap: "beat"`), or half a beat away (`"beat:0.5"`).
- Cascades on eighths: three cards at `beat:0`, `beat:0.5`, `beat:1` land as a burst; the rest
  of the bar is the hold.
- The analysis can mishear: half time (`music.bpm`), a pickup (`music.downbeat`, a track time on
  a bar line), a clap's attack read ~30ms late. Trust the chart, not the numbers.

### Whip and drift
`m.enter(id, "whip", { at: "beat:1", dir: "left", duration: "slow" })`: 85% of the travel in
~1.5 frames, blurred, then a slow drift that comes to rest — the element is alive while it is
read. Its first frame is already the smear (full opacity, peak blur), so a whip on a cut opens
the scene with the element, never on an empty frame. For a word that should drift or land rather
than whip, cut it on (`opacity: [0, 1]` with `duration: 0`) and move it: a fade reads as a fade. Use it for type and cards that arrive *on* the beat. `duration` is the drift: `slow` (0.6)
for UI that must glance-read inside a bar, `drift` (1s) for a hero, `expressive` (0.35) when the
copy needs its read time. Distance up to 160px (`distance`). Never whip an exit; never whip in a
calm scene (`ease-register`).

### Squash and stretch
`squash: 0.2–0.3` on a whip or a pop: the element stretches along its path for the snap's frame
and squashes against the deceleration when it lands — mass, in two frames. Type and cards take
0.2–0.3; never on chrome, never on a full-frame move (`transition-bounce` still applies).

### Morph: let one element carry the cut
`"transition": { "type": "morph", "pairs": [["card", "tile"]], "duration": 0.48, "ease": "out" }`
— the card flies to where the tile sits and becomes it, while the next scene crossfades in under
it. The container travels as one solid shell; its copy swaps on top halfway. It is the energetic
register's best way to say "this becomes that": text becomes a UI, a card becomes a stat, a chip
becomes a window.
- Pair elements of similar role and the same aspect ratio: sizes may differ, but a card of
  another shape stretches its copy in flight. No `squash` on a pair that carries copy.
- Start the morph on a hit (a boom, a bar) with ease `out`, so its fastest frame is the hit and
  the carry is still seen. A whip snaps it in 1.5 frames and reads as a cut.
- Clear the stage: the outgoing scene's other elements exit on the cut (`fadeOut` at the cut's
  beat), or the carrier passes over their copy.
- Both ends must be at rest at the handoff: the outgoing element settled, the incoming one with
  no entrance of its own (its children included) until the morph ends. The morph is the
  incoming scene's entrance — don't stack another on it.
- A Shape pair (`<Shape>` both sides) morphs its outline instead.
- Within a scene, `<Morph shapes={[textShape("Word", { size: 112 }), MARK]} collapse="into">`
  turns a word into a mark: the letters that have no counterpart pour into the mark. Ease `out`
  over `slow` (0.6), starting on the beat; a whip is too abrupt to read a transformation.

### Material shots (WebGL)
The logo film form: the same mark, a different material every two beats, a flat lockup at the
end. `<Gl>` shots are data — `extrude` a mark, give it `chrome`, `glass` or `neon` — and the light
is litt's: from above, a horizon line across chrome, the accent as neon light with bloom.
- One idea per shot: chrome whips round to face us; glass bends what is behind it (glass needs a
  `plane` card to refract: litt's `grid` reads as glass at once and keeps the mark the subject;
  type behind glass competes with the mark and the bevels garble it); neon glows (bloom threshold
  below the tube's brightest channel).
- Chrome is what it reflects: land its face turned slightly *up* (`rotateX` a little negative), so
  the studio's horizon line crosses it. Tilted down, it mirrors the floor and reads as black.
- One finish across the cut: the same `grain` and `vignette` on every shot.
- The match cut out of the last shot: open the flat mark at the GL mark's size and place, hold a
  beat, then move it into the lockup on an `out` ease. Hold the end card still after that: a
  camera push under a flat SVG that was just drawn at another scale rasterises differently per
  worker (ADR 0009 §4).
- Move the object or the camera (`shot-camera`), never the material: there is no channel for it.
- Each GL frame costs roughly 60–200 ms to render, depending on the machine (ADR 0009 §5). Use
  material shots for the logo and the hero, not for UI; keep a GL film short.

## Recipes
`recipes.md`: statement, label + statement + summary, feature list, stat, product placed,
UI action with a cursor, a selection that glides, ink emphasis, end card, chart, transitions —
and for the energetic register: the steep UI move, the sticker slap, the collage formula, the
annotation formula, the selection-block wipe, the terminal, a 2×2 grid that drifts, a spinning
ring, the match cut, the mirrored ending and a burst-and-hold storyboard.
