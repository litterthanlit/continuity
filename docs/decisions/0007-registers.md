# 0007 — Registers: how loud litt speaks

**Status:** accepted · 2026-10-22 · extends 0006 (the look is unchanged)

## Context

0006 made litt the one house language and translated its motion for video: responsive springs,
one expressive moment per scene, bounce ≤ 0.12, the camera's ≤ 3% push as the only ambient
life, cuts plus two quiet accents. That is right for what litt was written for — interfaces, and
videos that explain them: a launch, a feature, a statement.

It is wrong for a different, equally real job: the **brand reel** — a recap, a culture film, a
montage, a collage-led social cut, where the viewer should feel a world rather than follow a
product. The reference was Chris Reath's "four months at Parallel" (44s, 1:1): the camera flies
through stacked compositions; a terminal types; a collage of map, texture, archive photo and a
slapped-on sticker plays twice; organic subjects get numbered technical overlays; the ending
flies back out to the start. Its craft is precise (every ease has a role, every group staggers,
every burst gets a hold) and much of it is outside 0006's bounds: springs with real overshoot,
travel of 100px+, a camera that travels, a zoom-like transition, more than one physical moment
per scene, a technical grid behind everything.

Before this record an agent asked for such a reel had two bad options: make it calm (wrong
brief), or stack `allow: [...]` on every tween until the gate went quiet (the skill and the gate
disagreeing, which teaches the agent to ignore the gate).

## Decision

**A register is a named set of motion bounds. The look never changes; the energy does.**

- `register: "calm" | "energetic"` on the storyboard (default `calm`) and optionally on a scene,
  whose own wins — so a calm launch can carry one energetic chapter, and a reel can hold a calm
  beat. `src/motion/register.ts` holds the table (`REGISTER_BOUNDS`); the timeline and
  storyboard lint read each scene's bounds from it, and `ct docs` prints it in the catalog.
- `calm` is 0006 exactly. Nothing about existing projects changes.

### What the energetic register widens

| Bound | calm | energetic | Why |
|---|---|---|---|
| spring bounce | 0.12 | 0.35 | stickers, collage pieces and markers act like objects; they land with mass |
| expressive moments / scene | 1 | 3 (a group counts once) | a collage has pieces, then a sticker, then a camera move |
| entrance travel | 64px | 160px | pieces land from off their slot, not from 32px |
| ambient camera zoom | 3% | 8% | the camera is part of the move, not an unnoticed drift |
| camera speed | 15%/s · 160px/s | 50%/s · 480px/s | pans across a dense collage |
| movers at once | 5 | 7 | dense bursts are the point — the holds pay for them |
| accent transition types | 2 | 3 (once any scene is energetic) | depth + a blurred push + a wipe is one coherent language |
| loops on objects | warning | info | a ring spins, a keychain swings; never copy (the critic weighs it) |
| linear easing | warns on all spatial moves | not on rotation-only moves | a machine turning is linear by nature |

### What it adds

- **Tokens.** `steep` — cubic-bezier(0.87, 0, 0.13, 1), an exponential-feeling in-out for
  interface and camera; `pop` — spring(visual 0.3, bounce 0.3) for objects; `snap` — 0.3s, a
  9-frame decisive move. They exist in every register; the calm bounds still hold a `pop` to
  litt's bounce, so using it in a calm scene warns.
- **`depth` transition** (`dir: "in"` default, `"out"`): the outgoing scene scales past the
  viewer (1 → 1.8) as the next comes forward (0.6 → 1), on `steep`, with a crossfade across the
  middle half; `out` reverses it, to close a reel on its opening frame. Transitions may now name
  their `registers`; `depth` is energetic-only and `transition-register` warns when both scenes
  it joins are calm. Planar directions became `PLANAR_DIRS`; push and wipe still take only those.
- **`text-fade`** (energetic only): copy never just fades in — it types on (`m.type`) or wipes
  on (`wipeRight`, `maskUp`, or the selection-block recipe). Opacity/scale-only entrances on copy
  warn; UI text (inside a kit component) and `typeOn` are exempt.
- **`Stage bg="grid"`**: a static hairline grid (2px `line`, 96px cells, centred, 60%). This is
  the first texture since 0006 removed the grid and dots backgrounds; it answers the reel's "a
  thin technical grid under almost every scene" and stays within P5 (it never moves). It is
  available in every register and taught for the energetic one. Profile Q7 (texture) remains
  open for litt itself.
- **`Media`** — an image in a strict container (surface radius, the raised edge, clipped) with a
  static `treat` (`mono`, `contrast`, `invert`, `none`) that forces imported imagery into the
  palette; the picture is `<ct>-img` so it can drift inside a holding frame.
- **`Marker`** — an annotation node (a ring and a mono index on a canvas chip) for the
  organic-plus-technical overlay, joined by `Path` hairlines.
- **`cx` resolves position utilities** (`absolute` over a component's own `relative`). Before
  this, `<Card class="absolute …">` silently stayed in flow; the collage layout exposed it.

### What does not relax, in any register

Material static (`material-motion` stays an error), settle before the next move
(`settle-interrupted`), read time, exits that never bounce, transform and opacity only,
`transition-bounce`, the legibility floor and safe areas, every `litt-*` source rule — Geist in
three weights, two inks, one accent fill per frame (a brand sticker is that fill), colour as light
or data.

## Consequences

- The skills teach both registers: `motion-craft` §12 (easing by role, timing in frames, bursts
  and holds, depth, match cuts, type that types or wipes, containers on a grid, formulas, the
  mirrored ending, energetic anti-patterns) with recipes; `kinetic-type` and `product-launch`
  gain energetic sections; `critique` judges each scene in its register and adds an energetic
  checklist (E1–E9); the director picks the register in the treatment.
- `projects/_energetic` is the gallery and a no-false-positives fixture; `_defects` seeds
  `transition-register` and `text-fade`. A test lints the gallery as calm to prove the bounds
  move.
- More registers (a `still` register for ambient loops and installations, say) are a row in
  `REGISTER_BOUNDS` and a section in `motion-craft`; resist adding one per brief — a register is
  a genre of video, not a project's taste.
