# 0010 — Flow through the cut

**Status:** accepted · 2026-11-06 · extends 0005 (transitions), 0006 (litt), 0008 (morphs)

## Context

Films made with Continuity read as rigid next to real motion design. The cause is structural, not
a matter of easing. Every scene was an island: its elements entered from rest, settled, held, and
then the edit joined it to the next island with a cut or a move of the *whole frame* (a fade, a
push, a wipe). Nothing moved through a join. `example-launch` joins five chapters with four
identical blurred pushes; the craft rules asked for "cuts on the beat" and "everything settles"
but never asked what carries the eye from one shot into the next.

In the work we measure ourselves against (Linear, Vercel, Stripe launch films, the Conqueror film
in `docs/research/2026-11-conqueror.md`), almost every join carries something:

- **a direction**: the camera is still travelling when the cut lands (a cut on movement, a whip pan);
- **a place**: the next shot's subject is where the eye already is (a match cut);
- **an element**: the camera goes *into* a card, screen or tile and its content becomes the next
  scene, or pulls back out of one ("it was on a monitor all along");
- **an action**: an exit leaves into the cut, or an entrance lands on frame 0.

Continuity already had the place (`match`) and one element move (`morph`). It had no cut on
movement, no way into or out of an element, and nothing that noticed an edit that stops dead.

## Decisions

### 1. `carry`: a cut on movement

`{ "type": "carry", "dir": "left", "distance": 10 }`. A cut (the scenes do not overlap) with motion
on both sides: the outgoing scene travels the first 40% of `distance` on t², the cut swaps the
scenes at peak speed, and the incoming one travels the remaining 60% on the mirrored curve. The
split makes the speeds equal at the cut (tested). It reads as one camera move across two shots.

- Each scene overscans with its own travel, using the same ease (scale 1 + 2·travel), so the
  trailing edge never shows. The first gallery render showed a dark strip at the edge without this.
  *Superseded by 0012 §5:* the zoom flipped its radial speed at the cut (one side of the frame
  slowed, the other surged), so the roots now only translate and the backdrop bleeds by the travel.
- Motion blur turns on by itself from 40 px a frame (the speed-matched σ), so a 50% whip pan is
  smeared and a 10% drift is sharp.
- `distance` above 15 is a whip pan. That belongs to the energetic register: in a calm scene it
  warns (`transition-register`). This is how the whip that 0006 removed comes back: as a camera
  move with continuous velocity, not as an effect.
- It is a primary move, like `cut` and `match`: it does not count against the accent budget.

### 2. `portal`: through an element

`{ "type": "portal", "via": "tile" }` goes in; `{ "type": "portal", "dir": "out", "via": "screen-body" }`
pulls back. The two scene roots move as one rig:

- **in**: the outgoing scene (outer) scales and pans until `via` covers the frame. The incoming
  scene (inner) starts scaled into `via`'s rect, clipped to it with its corner radius, and grows to
  the identity. It fades up over the first 30%, so the element's own content dissolves into the
  live scene.
- **out**: the reverse, with the incoming scene stacked *under* the outgoing one (a new layer flag,
  `under`; the build spaces scene z-indices two apart for it). The outgoing scene shrinks into
  `via` and fades over the last 30% onto whatever `via` holds, ideally a still of that shot.

`via`'s rect and radius are measured once at prepare (a new `measure` kind, `portal`, beside
`focus` and `match`), and every frame after is a pure function of time. Scale and translate are
interpolated linearly in the eased progress on both roots. When `via` has the frame's aspect, the
window edge and the element edge are the same line at every frame. For any other aspect the inner
scene opens as a crop (insets interpolated) and the two edges drift by a few pixels mid-move,
inside the element's border. A new channel, `clipRound` (px), rounds the clip insets.

The portal is an accent: it counts toward the accent budget. It belongs to both registers,
because a camera going into a product UI is a calm move.

### 3. The edit is linted for flow

- `dead-cut` (info): a plain cut where the outgoing scene has settled more than 0.4 s before it and
  the incoming one starts moving more than 0.2 s after it. The camera does not count, because a
  3% push does not carry the eye across a cut.
- `static-edit` (warning): over three or more joins, 60% or more carry nothing (dead cuts,
  crossfades, dips). The film reads as a slideshow.

Run on the existing projects, these flag one join (`_launch` graph → product) and no film. They
mark a slideshow without punishing still cuts used as punctuation.

### 4. The craft says it first

motion-craft §8 now starts from the question "what does the eye ride across this join?", with the
four answers mapped to moves, plus recipes for `carry` and `portal`. The director's treatment names
the flow of every join, and its `motion` notes describe both sides of each cut. The critique counts
a slideshow edit as a craft defect. `projects/_flow` is the gallery: portal in → carry → portal
out, built so each move can be judged mid-flight with `ct stills --at`.

## Consequences

- Transition count: 12 (`carry` and `portal` added). The `transition-language` budget is unchanged;
  `carry` is free like `match`.
- Not done yet, and the next steps if films still feel stiff:
  - **Element-level transitions**: pushes and carries move whole scene roots. Real handoffs stagger
    the layers (the leading element leaves first, the background last, with parallax by depth).
    That needs per-element depth in the view, which the kit does not record yet.
  - **A continuous world camera**: scenes laid out on one plane, with the camera travelling
    between them instead of joining separate roots.
  - **Velocity hand-off for plain cuts**: carry the last exit's speed into the first entrance
    automatically, rather than asking the author to match `dir`.
