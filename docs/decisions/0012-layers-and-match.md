# 0012 — Layered handoffs and the physical match cut

**Status:** accepted · 2026-11-06 · extends 0010 (flow through the cut), 0008 (morphs)

## Context

0010 gave the edit a vocabulary for joins: a direction (`carry`), a place (`match`), an element
(`portal`, `morph`), an action (a cut with an exit into it or an entrance on it). The first re-cut
of `example-launch` with that vocabulary (B1) fixed the seam and the portal carried an element.
Its independent critic still named three things that read as rigid:

1. The three chapter joins were one template three times. Each was a carry with the same lockup
   exit, drift and lag, so the edit read as a softer carousel. The cause was that a carry moved
   each scene as **one flat plane**.
2. At measure → critic both scenes shared the same layout. The lockup faded out and came back to
   the same place, and the window slot emptied and refilled 270 px to the right. A `match` would
   have kept it, but a match only settled from rest, so the window had to stop before the cut.
3. Both sides of every carry arrived empty, and the natural carriers ("Ships" → "Open source")
   went unused.

0010 listed the first as "not done": real handoffs stagger the layers. This record covers that
work and the velocity a match now carries.

## Decisions

### 1. Layered handoffs: `layers: true` on `push`, `pushUp` and `carry`

A layered join keeps the plane move and adds a wave on top of it. Each **top-level** storyboard
element that has a role shifts a little further than its scene, in order along the travel
(`src/motion/layers.ts`, `layered()` in `transitions.ts`).

- **Travel.** `LAYER_TRAVEL = 0.08` of the frame along the axis, times the element's depth. In a
  carry the layer's whole move is `2 × depth × 0.08`, split across the cut. At 1920 px, a
  depth-1 layer moves about 307 px beyond its plane.
- **Depth by role** (`LAYER_DEPTH`):
  - copy is 1.0: `headline`, `title`, `body`, `label`, `caption`, `stat`, `cta`, `logo`;
  - UI is 0.6: `ui`;
  - decor and media are 0.35: `decor`, `media`.

  Copy leads and moves most, the product follows, and the background trails nearly with the plane.
- **Order by anchor.** The storyboard `anchor` sets who goes first:
  - for `left`, column A first (by the element's leftmost column);
  - for `right`, F first;
  - for `up`, row 1 first;
  - for `down`, row 6 first.

  Ties go by the other axis, then by storyboard order, and elements without an anchor go last.
  Steps are the list stagger (40 ms), compressed so the last layer starts by `0.3·d`
  (`LAYER_SPREAD`). A label anchored above its headline therefore leads it.
- **Scope.** Only top-level elements move. A child of an element that takes the handoff (one with
  a role) rides its parent. An element without a role rides the plane, and does not hold back the
  elements with a role inside it. The shift is its own additive channel (`shiftX`/`shiftY`), so an
  element's own entrance (a `rise` on frame 0) runs straight through it.

**Speed pairing.** Each layer keeps its own speed through the cut, so no layer jumps. Layers do not
move like their plane (the wave is their difference), but each one's speed on screen is the same on
both sides of the cut.

- **Push** (both scenes on screen, at rest at both ends):
  - outgoing, a layer starts at `plane start + delay` and lands with the plane;
  - incoming, it starts with the plane and lands `delay` later;
  - both use the push's ease, with `depth × LAYER_TRAVEL` of the frame on each side.
- **Carry** (a cut at peak speed): each layer makes its own t² move, split at the cut like the
  plane's.
  - Let `M` be the largest delay. A layer leaves `L_o = lead + M − delay` before the cut, so the
    leader leaves first and none leaves after the plane. It lands `T_i = tail + delay` after the cut.
  - Its speed at the cut is `v = 4·depth·travel / (d + M)`.
  - Its travel splits as `S_o = v·L_o/2` before the cut (QUAD_IN) and `S_i = v·T_i/2` after it
    (QUAD_OUT).
  - So every layer crosses the cut at one speed on both sides, and a layer's speed depends on its
    depth, not on its delay.

### 2. Match v2: the match carries its partner's speed

A match now measures how fast the partner moves on the outgoing scene's last frame, as well as its
place, size, fill and corner (`src/motion/match.ts`, `resolveMeasured` in the runtime).

- **Threshold.** `MATCH_SPEED = 60` px/s in the element's own pixels, which is 2 px a frame at
  30 fps. Below it the partner reads as at rest, and the match settles from rest as before (the
  place on `out`, or the `ease` you set).
- **One curve per axis.** When the partner is moving, the place tween keeps only the size,
  `scale [s, 1]` on `inOut` about the centre, with `x/y` held at 0. The travel goes on
  `shiftX`/`shiftY` as one cubic Hermite per axis, from the start offset `Δ` to 0:
  `bezier [1/3, m/3, 2/3, 1]` with `m = −v·d/Δ`. It leaves the cut at exactly the partner's
  velocity and arrives at rest.
- **No travel on an axis.** Where an axis has nowhere to go (`|Δ| < 0.5` px), its speed becomes an
  impulse: out at `v`, back to 0, peaking at `4·v·d/27`.
- **The reach rule.** Place the incoming element ⅓–⅔ of `v·d` along the travel from where the
  partner is at the cut. Inside that window the move only slows after the cut. Further out it has
  to speed up after the cut (a surge); nearer, it overshoots and comes back. Across the travel the
  offset stays under about 0.47·v·d (with the along offset at ⅓–½ of v·d; 0.24·v·d at ⅔), or the
  speed dips and rises again after the cut.
- **Shape.** The first frame takes the partner's corner radius as seen (a pill stays a pill). The
  fill also starts as the partner's, but only when both fills are opaque and solid. Both turn into
  the element's own on the place's ease, and the fill mixes in oklab. A gradient, image or
  transparent side changes only its corner.
- **Status.** A match stays a cut, not an accent. Its pair must be free of its own entrance during
  the match: the element's content comes in after it lands.

### 3. Two rulings overrode the plan's maths, because the frames jittered

The plan specified exact formulas for both moves. Measured in the browser, both produced a jolt at
the cut, and the spec ("keeps moving through the cut") ranked above the formula.

- **R2, layered carries: velocity continuity per layer.**
  - The plan started each incoming layer at its delay on an ease-out, and the first implementation
    compressed the outgoing side.
  - Delayed layers changed speed abruptly at the cut (a title went 67 → 29 → 51 px/frame), and the
    bars re-accelerated mid-settle.
  - The acceptance became behavioural:
    - each layer's speed at the end of its outgoing move equals its speed at the start of the
      incoming one;
    - a carry's incoming per-frame displacement never increases after the cut;
    - no layer leaves in less time than the plane's lead.
  - The pairing above was the result. Sampled then at the frame centre, every layer was within 4%
    across the cut and push layers within 7% of the plane on the first frame. That sample hid the
    carry's zoom (§5): at ±⅓ of the frame the plane itself stepped 83%. Measured on screen with the
    root's transform after §5, every layer of a carry keeps its speed across the cut at the centre
    and at ±⅓ (within 4% frame to frame, at distance 12 and 45) and only slows after it.
- **R3, match v2: a Hermite off the zoom path.**
  - The plan put the place on `inOut` and added an impulse for the speed. The `inOut` place barely
    moves in its first third while the impulse decays, and the zoom path back-loads the travel.
  - With the gallery card out of reach, a 0.7 s match went 32.0 → 18.9 → … → 107.8 → 0 px/frame:
    a dip, then a surge to 3.1× the chip's speed.
  - The ruling moved the travel off the place tween onto one Hermite per axis (above), moved the
    fixture within reach, and added the reach rule to motion-craft §8.
  - After the fix the card went 51.3 → 0 px/frame, strictly decreasing, with a peak ≤ 1.1 v, and
    landed 0.00 px off.

  - Three evaluator fixes came with R3, and they change every film with shutter blur or an impulse:
    the shutter σ is divided by the element's own scale (the filter draws in its scaled space), the
    shutter speed takes the faster one-sided difference at a move's ends (the central one halved the
    blur on a move's first frame), and a finished impulse holds its rest, not its peak.

### 4. The benchmark: `example-launch` B0 → B1 → B2

All three were scored by an independent critic agent, never by the implementer. Each new version
was judged pairwise against the last in both orders (`ct compare`, then `ct verdict`). Gate:
0 errors on all three.

| | B0 (it. 8) | B1 (it. 12; 13 is the same film, notes-only) | B2 (it. 15) |
|---|---|---|---|
| Joins | cut + 4 blurred `push` + dip | portal + 3 `carry` + dip + cut | portal + 2 layered `carry` + 2 `match` v2 + cut |
| Intent | 4 | 4 | 4 |
| Composition | 4 | 4 | 4 |
| Typography | 5 | 5 | 5 |
| Temporal | 4 | 4 | 4 |
| Craft | 3 | 4 | 4 (stronger) |
| Mean | 4.0 | 4.2 | 4.2 |
| Pairwise verdict | — | B1 over B0 (both orders) | B2 over B1 (both orders) |
| `ct motion` | 69% active, 0 dead zones, 0 jolts, mean energy 0.66 | 68% active, 0 dead zones, 0 jolts, mean energy 0.68 | 68% active, 0 dead zones, 0 jolts, mean energy 0.76 |
| Dead zones at the joins | 0 | 0 | 0 |
| What the joins carry (element · place+speed · direction · action · punctuation) | 0 · 0 · 4 · 0 · 2 | 1 · 0 · 3 · 1 · 1 | 2 · 1 · 2 (layered) · 1 · 0 |

Notes on the table:
- **Motion shape.** B1's chart showed the same trough → pre-cut spike → post-cut spike at all three
  chapter joins. In B2 each join has its own shape:
  - plan → check is a broad ramp, then a spike;
  - check → measure is a bump, then a spike;
  - measure → critic is a 1.1 s plateau, one panel sliding through the cut.
- **Accents.** B2 uses one accent, the portal. Match and carry are cuts.
- **Mean.** B2's mean equals B1's. The critic's reasons for preferring it:
  - the two carries now differ: one is copy-led on the way out, the other copy-led on the way in;
  - both land with content: the sheet's frames, the copy on frame 0, a running playhead;
  - measure → critic is one object at one speed through the cut. The window's right edge moves
    −27/−30/−28 px/frame into the cut, and the card then only slows, settling on the left. "The
    measurement becomes the score".
  - the portal's ghosted label is gone (gate info 11 → 0).
- **Where B2 is worse.** It is marginally worse at the last join, critic → end. There, a
  `match ships → cta` replaced the dip, and it reads as a hard full-frame cut from black to the
  aurora field.
- **Delivery.** B2 was delivered as is (R4). Changing the last join would need a fresh score, and
  the carry fix is engine work.

### 5. A carry translates; its backdrop bleeds

The B2 critic found a "breath" on the cut frame of every carry, and the final review measured it.
Each carried root overscanned by *scaling about the frame centre* in step with its travel, the
outgoing one up into the cut and the incoming one down from about 1.15. So the on-screen speed of a
point `u` px from the centre is `tx′ + s′·u`, and the radial term flipped sign at the cut. At
distance 12 (d 0.5), plane only, the instantaneous speed at the cut went −52.1 → −8.8 px/frame at
`u` = −640 and −9.3 → −52.6 at +640: one side of the frame slowed 6×, the other surged. On the film
it split J3's incoming surfaces about 2× (sheet 26 px/frame, terminal 55). A smoothstep scale does
not fix it (the radial term only changes shape).

- **Translate only.** The roots move on `xPct`/`yPct` and nothing else, so every point of the frame
  has the plane's speed: after the fix the step at the cut is 0% instantaneous and within 4% frame
  to frame at the centre and at ±⅓ of the frame, plain and layered, at distance 12 and 45, left and up
  (`tests/transitions.test.ts`, "carry on screen").
- **The backdrop bleeds, not the content.** A travelling root exposes the frame behind its trailing
  edge. `TRANSITION_DEFS.carry.bleed` gives each side's travel; the build writes it (+1% margin) on
  the scene root (`--ct-bleed-x/y`) and on its timeline (`bleed.windows`). The Stage's backdrop and
  grain always extend past the root by that much (clipped at rest as before), a field's canvas grows
  with them and is laid out on the frame (`u_frame`), so the frame shows the same field. While the
  root travels, the runtime sets `ct-bleeding` and the root clips only its content, so the trailing
  edge shows canvas, grain or more of the field. A scene-root motion blur's filter region grows by the
  bleed too. The bleed is limited to the carry's own window, so a push or a portal on the scene's
  other side is untouched.
- **Checked on the frames.** A browser test screenshots a carried pair mid-carry (solid 12, field
  12, field 45 left, field 45 up) and finds no seam at either root's trailing edge; without the bleed
  every case fails (a 3.5-level step on a solid canvas, 18–62 on a field). On `example-launch` J3 the
  sheet and the terminal now leave the cut together at −47, −42, −37 px/frame (B2: 26 → 22 → 21
  against 55 → 48 → 41), after the board's −30, −39 into it.

### 6. The last join: a portal through the "Ships" tag

At critic → end, B2's `match ships → cta` carried a 110×56 px tag (0.3% of the frame) across a
full-frame cut from near-black to the aurora field, so the cut read as a colour flash and the pill
was found afterwards. The join is now `{ "type": "portal", "via": "ships", "duration": 0.8 }`:

- The colour arrives through the verdict: the field and the "Open source" button fade up inside the
  tag in its first quarter, and the tag grows until it is the frame. The eye is on the one thing that
  moves, so the full-frame change is never a cut.
- The tag is drawn at 16:9 (100 × 56), like studio's Plan tile, so the window opens without a crop,
  and its word steps out as the portal starts, so the gate sees no ghosted text over the end card.
- critic's camera lands as the portal starts and the end card's starts as it lands (the portal is the
  scene's move); critic is 0.4 s longer (5.4 s) to keep about 1.2 s of settled hold on the verdict,
  and the end card's wordmark and tagline move to 0.85 and 1.4 s, after the landing.
- The portal is already the film's accent type, so the transition language stays at one accent.
- B3 (iteration 18) is the film with §5 and §6; gate 0 errors, 0 warnings, 0 info. Its independent
  score is pending.

## Consequences

- `layers` is a parameter of `push`, `pushUp` and `carry`. The galleries show both moves:
  - `_flow` has the layered carry (detail → next) and the moving match (chip → card);
  - `example-launch` is the film-scale reference.
- motion-craft §8 documents layered handoffs (when, depth, anchors) and match v2 (speed, reach,
  shape, recipe). The critique skill counts speed-continuous joins, layered handoffs and physical
  match cuts as signs of flow. Speed steps, a carousel envelope and a shared layout thrown away
  across a cut count against it.
- The carry's zoom pump and the last join's carrier, the benchmark's first two findings, are fixed
  (§5, §6).
- **Not done yet**, in order of what the benchmark showed:
  1. **Plan → check's mass jump and measure → critic's copy-free transit.**
     - At plan → check, the eye leaves one window at the upper right and lands on two windows
       across the bottom. The terminal shows only "$" for half a second.
     - At measure → critic, nothing on screen can be read for 0.9 s (23.54 → 24.45).
     - Both are project fixes: type the command on the cut frame, and bring the critic's copy in
       as the card slows.
  2. **A continuous world camera, and velocity hand-off on plain cuts.** Both remain from 0010:
     - scenes on one plane with a travelling camera, instead of joined roots;
     - a plain cut that carries its last exit's speed into its first entrance without the author
       matching `dir`.
  3. **The reach rule is documented, not linted.** A match whose incoming element is out of reach
     (a surge) or behind the partner (a reversal) still passes the gate. The prepare step knows
     `v`, `d` and `Δ` and could warn.
