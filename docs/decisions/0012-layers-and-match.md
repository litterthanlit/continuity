# 0012 — Layered handoffs and the physical match cut

**Status:** accepted · 2026-11-07 · extends 0010 (flow through the cut), 0008 (morphs)

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
- **Scope.** Only top-level elements move. A child of a listed element rides its parent, and an
  element without a role rides the plane. The shift is its own additive channel (`shiftX`/`shiftY`,
  from Task 2), so an element's own entrance (a `rise` on frame 0) runs straight through it.

**Speed pairing.** Every layer moves like its plane, so nothing jumps.

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
  to speed up after the cut (a surge); nearer, it overshoots and comes back.
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
  - The pairing above was the result. After the fix, every layer was within 4% across the cut, the
    incoming side was monotone, and push layers were within 7% of the plane on the first frame.
- **R3, match v2: a Hermite off the zoom path.**
  - The plan put the place on `inOut` and added an impulse for the speed. The `inOut` place barely
    moves in its first third while the impulse decays, and the zoom path back-loads the travel.
  - With the gallery card out of reach, a 0.7 s match went 32.0 → 18.9 → … → 107.8 → 0 px/frame:
    a dip, then a surge to 3.1× the chip's speed.
  - The ruling moved the travel off the place tween onto one Hermite per axis (above), moved the
    fixture within reach, and added the reach rule to motion-craft §8.
  - After the fix the card went 51.3 → 0 px/frame, strictly decreasing, with a peak ≤ 1.1 v, and
    landed 0.00 px off.

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

## Consequences

- `layers` is a parameter of `push`, `pushUp` and `carry`. The galleries show both moves:
  - `_flow` has the layered carry (detail → next) and the moving match (chip → card);
  - `example-launch` is the film-scale reference.
- motion-craft §8 documents layered handoffs (when, depth, anchors) and match v2 (speed, reach,
  shape, recipe). The critique skill counts speed-continuous joins, layered handoffs and physical
  match cuts as signs of flow. Speed steps, a carousel envelope and a shared layout thrown away
  across a cut count against it.
- **Not done yet**, in order of what the benchmark showed:
  1. **Carry's zoom pump.**
     - The cause: each carried scene overscans by *scaling about the frame centre*. The outgoing
       scene grows about 7% into the cut. The incoming one starts about 15% oversize (at distance
       12) and shrinks at about 50% zoom/s, far past the 15%/s camera bound.
     - The radial velocity flips sign on the cut frame. Elements left of centre slow and elements
       right of centre speed up.
     - On the film this split J3's incoming surfaces about 2× (sheet 15–26 px/frame, terminal
       30–55 px/frame) and gave J4 a small surge (34 → 44 px/frame). Layers cannot cancel it, and
       the ratio does not depend on `distance`.
     - Fix in `carry()`: translate only. A solid stage needs no overscan; paint the stage colour
       behind the travelling plane. A field needs the overscan held constant through the move,
       not ramped in opposite directions across the cut.
  2. **The last join's carrier is too small.**
     - The "Ships" tag is about 0.3% of the frame, but it has to carry a full-frame change from
       black to the aurora field. The cut is read as a colour flash, and the pill is found
       afterwards.
     - Options: a `portal` through the tag, which holds a still of the end card's first frame, so
       the colour arrives through the verdict; or press or ink the tag just before the cut, so the
       eye is on it when the cut lands.
  3. **Plan → check's mass jump and measure → critic's copy-free transit.**
     - At plan → check, the eye leaves one window at the upper right and lands on two windows
       across the bottom. The terminal shows only "$" for half a second.
     - At measure → critic, nothing on screen can be read for 0.9 s (23.54 → 24.45).
     - Both are project fixes: type the command on the cut frame, and bring the critic's copy in
       as the card slows.
  4. **A continuous world camera, and velocity hand-off on plain cuts.** Both remain from 0010:
     - scenes on one plane with a travelling camera, instead of joined roots;
     - a plain cut that carries its last exit's speed into its first entrance without the author
       matching `dir`.
  5. **The reach rule is documented, not linted.** A match whose incoming element is out of reach
     (a surge) or behind the partner (a reversal) still passes the gate. The prepare step knows
     `v`, `d` and `Δ` and could warn.
