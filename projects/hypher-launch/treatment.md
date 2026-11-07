# Treatment — Hypher launch (16:9 · 30.8 s · calm · no music)

**Concept.** One unbroken handoff: the eye never stops at a join, because Hypher's whole claim is that
nothing has to start over. Each cut hands something on: a direction, a place, an element.

**Register: `calm`.** This is a launch for builders who distrust hype ("Checked, not trusted"). Use
responsive springs, one expressive moment per scene, and a ≤ 3% push. The film's energy comes from the
joins, not from the motion inside the scenes.

## Arc
- **Hook** (pain, 0–3 s): a Codex prompt typing the same context *again*. "Every agent starts from zero."
- **Turn** (3–6.4 s): the site's black smoke. "Stop re-explaining your project to every agent." · hypher
- **How it works** (6.4–16.3 s): capture ("Capture the mess.") → portal into the note ("One note per
  project.") → writeback ("Agents write back.").
- **The handoff** (16.3–22.6 s): "Save in Claude Code." `/hypher-save` → *the command keeps moving* →
  `$hypher-resume` in Codex. "Resume in Codex."
- **Trust** (22.6–27 s): pull back out of the Codex session to find it on "Your machine". Only
  decisions, branch and commit travel to Hypher. "Your code never leaves your machine."
- **Payoff / end card** (27–30.8 s): on the smoke. "The next agent starts from one note." · Join the
  pilot · hypher.app. This mirrors the hook ("from zero" → "from one note").

## Visual language
- **`litt-light` + the brand theme.** The #fdfcfc page and #2f2d2d ink, with grey second lines as on the
  site. Product UI reads best on the light page, and the site itself is light under a black hero.
- **Moving field (`bg="gradient" gradient="accent"`, the site's monochrome smoke) on two scenes only:**
  `turn` and `end`. Type on it is `text-canvas`, one ink; hierarchy comes from size and weight. Every
  other scene is `solid`. That makes 2 WebGL canvases.
- **Accent (sage) has one job a frame:** the "Join the pilot" button fill on the end card, and caret or
  focus light in the prompts. Never a word, never a dot.
- **A data hue:** Claude orange (`text-data-amber-text`) on the two commands only. Here colour carries
  data: the same command crosses from one agent to the other.
- **Hierarchy of a typical frame:** the display line (`Headline`, 112, 500, top-left, ≤ 2 lines) and
  then the product surface at the right or below (UI at 2×, 28 px). Then the caption ("Illustration ·
  sample data", `Caption`, grey, bottom-left) where UI could pass for a recording. No eyebrow labels.
  Rank by weight and ink.

## Motion language
- One expressive moment per scene, always the thing the scene is about: the hook's and turn's
  statements, the capture headline, the note headline, the writeback "Next" line, the save confirmation,
  the resume headline, the trust headline, the end statement. Everything else is responsive (rows, chips,
  the caption) or linear (typing).
- **Show, then tell:** in the hook, capture and note, the UI acts first and the line lands after.
- **Ink emphasis:** none is needed beyond the two inks at rest. The site's grey second line is set
  statically.
- **Camera:** a ≤ 3% push anchored on the headline's left edge on the hold scenes (hook, note, trust,
  end). There is no push in a scene during a portal (capture, resume, trust's first second) or under a
  carry.

## Transitions and flow (cuts + one accent: `portal`)
| Join | Move | What carries the eye |
|---|---|---|
| hook → turn | cut | an action: the hook's camera is still pushing; the turn's statement rises on frame 0 |
| turn → capture | `carry` left, 10%, 0.5 s | a direction: the smoke slides left and the light page arrives at the same speed; the capture card slides in leftward on frame 0 |
| capture → note | `portal` in via `note-tile`, 0.9 s | an element: the capture flows along a hairline into the token-gate tile, and the camera goes through the tile into the note |
| note → writeback | `carry` left, 12%, `layers` | a direction in layers: the copy leads, the card follows (same layout, the next step) |
| writeback → save | `carry` up, 10%, `layers` | a direction, turned at the chapter break: the handoff rises in, the headline leads |
| save → resume | `match` v2, 0.8 s | an element in motion: `/hypher-save` accelerates right into the cut; `$hypher-resume` leaves at that speed and slows into the Codex terminal (reach ≈ ½·v·d) |
| resume → trust | `portal` out via `machine-screen`, 1 s | an element: the Codex session shrinks into the screen on "Your machine" (it was local all along) |
| trust → end | cut | nothing, as punctuation: the film's one still cut, before the end card |

## Rhythm
The hook is quick (3 s). The turn breathes: the must-say line gets its full read. How it works runs as
three steps of ~3.5 s each with flowing joins. The handoff has the fastest join, a moving match. Trust
slows down: a pull-back, then a 2.8 s settled statement. Then a still cut, and a 2.3 s end-card hold on
the CTA.

## References
- Apple's Continuity / Handoff spots: one task crosses devices without a seam (the match cut).
- Linear's launch films: product steps hand over in layers, copy before UI (the layered carries).
- Vercel Ship keynote titles: a black field, one statement, quiet type (the turn and the end card).
