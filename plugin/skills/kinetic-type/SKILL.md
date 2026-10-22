---
name: kinetic-type
description: Kinetic typography and social cuts in litt (9:16 reels/shorts/TikTok, 1:1, 16:9 type-led promos) — structure, pacing, layout, emphasis by ink and motion patterns for type-led videos, with litt's restraint: one display statement per beat, Geist in three weights, hard cuts on the beat. Load with motion-craft and typography when the video is primarily words in motion.
---

# Kinetic typography, in litt

Type *is* the image. The craft is rhythm (when words land), contrast (which word matters) and
restraint (one idea per beat). litt's version is calm power: words land precisely, rank comes
from ink and space, and nothing performs. No scale punches, no weight pulses, no serif swaps,
no glow — a word matters because everything around it steps back. That holds in both registers;
the energetic one (end of this skill) only changes how fast and how physically words arrive.

## Structure (8–20s social)
1. **Hook (0–2s):** a provocation or promise in ≤ 5 words. First motion ≤ 0.2s. No logo first —
   earn attention, then brand.
2. **Turn (2–8s):** 2–4 beats that build the argument. One line each.
3. **Payoff (last 3–5s):** the answer + the name + the CTA. Hold the final card ≥ 1.5s.
Each beat is one scene (or one line within a scene). Cuts land on beats.

## Layout for 9:16
- `<Safe zone="social">` always (platform UI covers the top ~10%, the bottom ~18%, the right
  ~12%). Keep the statement in the upper-middle band (rows 2–4 of the 6×6 grid).
- One display statement per scene (`Headline`, 112px — litt's ceiling), ≤ ~13 characters per
  line within the social safe width, lines broken by meaning: `Motion is<br/>a craft.`
- **Left-aligned on one edge**, every scene on the same edge — that edge is the video's spine.
  Centered only for the one short statement (usually the end card).
- Supporting copy is `Body` (40px in 9:16) in the grey; labels are `Label` (34px, 600,
  sentence case). The build applies the portrait scale itself.

## Type (load the `typography` skill)
Geist 500 for the statement, 400 in the grey for support, 600 for a label. One family; there
is nothing to switch to. Tracking and leading come from the kit — don't loosen display.

## Emphasis: pick one per line
- **Ink step (the litt way):** the line lands, then the rest steps back to the grey and the key
  word keeps fg — `m.emphasize(["pre", "post"], "dim", { at: "b2", stagger: 0 })`. Or set the
  line in the grey and `ink` the key word up.
- **Space:** the key word alone on its line, or alone in the next scene.
- **Order:** the key word lands last, after a beat.
Never: a scale punch, a weight pulse, an accent-coloured word, an italic serif, a marker bar.

## Motion patterns
| Pattern | Code | Feel |
|---|---|---|
| Line rise | `enter(id, "maskUp", { split: "lines", ease: "expressive" })` | the statement: the scene's one moment |
| Word cascade | `enter(id, "maskUp", { split: "words" })` | crisp, 40ms apart, responsive |
| Quiet arrival | `enter(id, "fade")` / `"rise"` | support lines, labels |
| Ink step | `emphasize(ids, "dim")` / `"ink"` at the instant tier | the word that matters |
| Type-on | `type(id, { cps: 22 })` + `blink(caret)` | terminals, prompts, UI |
| Swap | `exit(a, "maskOut", { split: "words" })` then `enter(b, "maskUp", …)` at `after:a` | replace a word in place |

Rules of thumb:
- Reveal **lines**, not paragraphs. A new line lands every 0.4–0.9s in a fast edit, every
  1–2s in a calm one. One expressive moment per scene; the rest responsive.
- After the last word lands, hold for read time before cutting (lint enforces it).
- **Kinetic type lives on hard cuts.** Cut on the beat; at most one accent transition type —
  `pushUp` (with `blur: true`) for a turn in a 9:16 feed, or a `dip` into the end card.
- Ambient motion during holds: `m.camera({ scale: [1, 1.03] }, { origin: { x, y } })` with the
  origin on the statement's left edge, so the edge holds still from cut to cut — never a loop.
- The light (`bg="lit"`) on the hook and maybe the end card; solid canvas between.
- With music (`bpm` in the storyboard): put beats on the grid (`60/bpm` s) and land key words
  on downbeats.

## In the energetic register (motion-craft §12)
A social cut built from collage and UI, or a type-led reel with real energy. Set
`"register": "energetic"`; everything above still holds (one statement per beat, Geist, ink as
emphasis, the left edge), and:
- **Type types or wipes, it never fades** (`text-fade`). Prompts, queries and handles type on
  (`m.type`, linear, 30–48 cps); statements and labels wipe on — `maskUp` or `wipeRight` on
  `steep` with `duration: "snap"`, or the selection-block recipe for the line that matters.
- **Words cascade 1–3 frames apart:** `split: "words"`, `stagger: 0.033–0.067`, `ease: "steep"`.
- **A word that acts like an object** (a sticker, a stamp, a tag slapped on) may land on `pop`
  — one per scene, and never a whole line of copy.
- **Bursts and holds:** 2–4s of fast lines, then one line held ~1s. A hold is where the key word
  lands.
- Cuts stay primary; add a blurred `push` (`ease: "steep"`, 0.3–0.4s) as a wipe and `depth` to
  open and close — the last card flies back out onto the first.
- A thin grid (`bg="grid"`) and mono labels (counts, coordinates) under the type give the frame
  its technical layer.

## Copy
Write it like a headline writer: concrete verbs, no filler, parallel structure across beats
("Write it. See it. Ship it."). Sentence case. If a line needs a smaller size to fit, it's too
long — cut words.
