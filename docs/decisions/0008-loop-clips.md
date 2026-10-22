# 0008 — Loop clips: a form for posting

**Status:** accepted · 2026-10-22 · builds on 0006 (the look) and 0007 (the registers)

## Context

A research pass over viral motion design on X ("Viral motion design on X": 13 video posts,
Aug–Oct 2026, ranked by likes, reposts and views) found a form neither 0006 nor 0007 covers.
The posts that spread were mostly 5–15s, opened mid-action at frame one, made one reveal, held
the final state for a large share of the clip so it loops, showed the machinery (a cursor, code,
a slider, the real tool), and shipped with a caption that made a claim the video proved. The
top post by far (3.26M views) was a claim with ordinary motion; the most-reposted craft clip was
tactile. Its 13 "rules for the skill" are mostly about structure, not energy: a clip can be calm
or energetic and still be this form.

Continuity's gate pushed against the form in three places: `slow-open` counted only entrances,
so a clip that opened on a press and a drag read as a slow open; `dead-air` warned on the long
still hold the form wants; and nothing measured an empty first frame or the hold's share.

## Decision

**`loop: true` on the storyboard marks a clip meant to be posted.** It is a form flag,
orthogonal to the register.

- **Rules** (`src/lint/timeline.ts`, only when `loop` is set):
  - `loop-open` (warning) — every content element of the first scene enters, so frame one is
    empty. Measured structurally: an element whose chain (itself or an ancestor) has no
    entrance is on screen at t = 0.
  - `loop-hold` (warning under 30%, info over 60%) — the final state's share of the clip: what
    remains of the last scene after its last tween, camera and loops aside.
  - `loop-length` (info) — outside 5–15s.
  - `dead-air` skips the last scene's closing gap; `loop-hold` judges it instead.
  - Render QC agrees: a `frozen` segment that runs to a loop's last frame is info, not a warning.
- **`slow-open` now counts the first motion of any kind** (a press, a drag, a move), not only
  entrances; camera and transitions still don't count. In every project, not just loops: a clip
  that opens mid-action never had a slow open.
- **`caption`** on the storyboard: the claim plus a link, the post that ships with the clip.
  `ct report` prints it (and the register and loop flag in the format line).
- **`glide`**: an ease, cubic-bezier(0.32, 0.72, 0, 1) — the iOS sheet curve the research read
  off Emil Kowalski's code (fast start, very long soft stop) — and a duration, 0.45s (the
  observed 400–500ms). For a surface that arrives and rests. Every register: it is an ease-out
  bezier, inside litt's motion rules.
- **`Slider`** in the kit: a label and a mono value over a rail with a lifted thumb, whose fill,
  thumb and value can be dragged in sync — the machinery made legible at video scale.
- **The `social-clip` skill** carries the form: the claim first, the gated rules, showing the
  machinery, before → after as a depth swap, tactile in litt's terms, template-then-swap, the
  formats that spread, a C1–C9 checklist the critic uses.

### Translations into litt (where the research and the house language meet)

- *"Give surfaces a material — foil, glitter, curl, a shadow that grows on lift."* litt's
  material is static light (P5) and has no offset shadows (P4). Touch becomes motion: a lift
  (scale ~1.03 while a zero-offset `shadow-lift` glow fades up), a press, a grab and drag, a
  settle with slight overshoot. Foil shimmer, sheen and paper curl remain outside litt; a clip
  that *is* a material toy is a declared exception (`litt-allow` with a reason).
- *"Template, then swap — change colour, product and title together."* Colour that changes per
  variant is identity, so it comes from the data hues in their order (P11), not free brand
  colours. The circle wipe stays out (an iris, removed in 0006); cuts or a `wipe`.
- *"Before/after with a depth swap."* product-launch's "no 3D tilts" gains one exception: the
  *before* may tilt ≤ 16° (`rotateY`) as it steps back, with `perspective` on the pair's parent.
- *"Big bold type as the background layer."* Not taken: litt's display step is the ceiling.

## Consequences

- `projects/_clip` (a 5s 1:1 loop: frame one is the before state with the cursor on the slider,
  a depth swap on glide, a 50% hold) is the gallery, a no-false-positives fixture and a golden.
- Not measured: whether the last frame and frame one actually match (the seam). The skill
  teaches it (a true cycle, or a cut back to "before" that reads as *again*); a pixel check
  could come later from `ct stills --at 0,<end>`.
- Sound was out of scope in the research and is out of scope here.
