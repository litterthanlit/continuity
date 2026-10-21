---
name: motion-craft
description: The motion design taste layer — litt (Nick's design language) translated for video: frame composition and hierarchy, material and light, colour, then motion: litt's three tiers (instant, responsive spring, one expressive moment per scene), exits, travel, stagger, choreography, holds, the transition language, the camera, emphasis by ink, and the anti-patterns the lint gates. Concrete numbers throughout. Load whenever writing or reviewing motion() code or scene layouts for a Continuity project.
---

# Motion craft: litt for video

Continuity's taste is **litt** — technical precision, lit from above. The structure is exact
and quiet: a grid, hairlines, one typeface in three weights, warm stone neutrals. The only bold
move is light and material: a soft light from the top, surfaces that catch it. Color barely
appears; where it does it behaves like light or carries data. **Motion explains and never
performs.** Spec: `docs/decisions/0006-litt-house-language.md`.

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
accents are rare and quiet. Pick at most two accent types per video (`transition-language`):

| Type | Default | Params | Use for |
|---|---|---|---|
| `cut` | — | | the primary: on the beat |
| `crossfade` | 0.4 | ease | the same surface in a new state (not between unrelated type frames) |
| `dip` | 0.5 | ease | a chapter break, before the end card |
| `push` | 0.5 | dir, blur, ease | sequential steps, in reading direction; `blur: true` when fast |
| `pushUp` | 0.5 | blur, ease | lists, feeds, 9:16 |
| `wipe` | 0.5 | dir, angle, feather, ease | a state revealed; `feather: 8–20`, `angle: 120` for a soft diagonal |

```json
"transition": { "type": "dip" }
"transition": { "type": "push", "dir": "left", "blur": true }
"transition": { "type": "wipe", "angle": 120, "feather": 14 }
```
Rules: keep one direction of travel; never a spring on a full-frame move
(`transition-bounce`); fast pushes need motion blur (`transition-strobe`); a scene's incoming
and outgoing transitions must not overlap. Whips, punch cuts, irises, strips, light sweeps,
zooms and defocus blurs are gone — each one performs.

## 9. Camera

The camera is the viewer's eye. An ambient push (1 → ≤ 1.03 over the scene) carries a hold.
The camera scales about the frame centre, so on litt's left-aligned frames anchor the push on
the statement's left edge — `m.camera({ scale: [1, 1.03] }, { origin: { x: 96, y: 860 } })` —
or the text drifts and every hard cut snaps it back. A
deliberate focus move — zoom to the part of the UI that matters, hold, then act — is a short
`inOut` tween (`slow` or a little longer, ≤ 15% zoom/s, `camera-too-fast`). When the camera
moves, the content holds still.

## 10. Emphasis: by ink

litt ranks by ink, not size. To make a word matter: let the rest of the line step back to the
grey (`m.emphasize(ids, "dim")`) or brighten it from the grey (`"ink"`), at the instant tier.
For a button: `"press"` (to 0.98 and back). Pick ONE emphasis per line. Never a scale punch, a
weight pulse, a glow, a marker bar, a serif swap or an accent colour.

## 11. Anti-patterns (each one fails the critique; most fail the lint)

1. Linear easing on anything that moves through space; bounce past 0.12, a bouncing exit, a
   second expressive moment in a scene.
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

## Recipes
`recipes.md`: statement, label + statement + summary, feature list, stat, product placed,
UI action with a cursor, a selection that glides, ink emphasis, end card, chart, transitions.
