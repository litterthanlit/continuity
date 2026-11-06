# Treatment — example-launch

**Concept.** The film follows one piece of work through Continuity's studio pipeline, and at
every station the agent *sees* something: a plan, a frame, a curve, a score. "Agents can't see"
becomes "agents check everything" by the end.

## Narrative arc (16:9 · 32.9s · 7 scenes)

| | Scene | Time | Idea |
|---|---|---|---|
| Hook | `hook` | 0–3.6 | *Agents can write motion. They just can't **see** it.* Each line takes the ink, then everything but "see" steps back to the grey. |
| Turn | `studio` | 3.6–8.0 | *Continuity. Give agents a studio. And **eyes**.* Onto the moving cobalt field; "eyes." lands on its own beat. A hairline pipeline draws: Plan · Check · Measure · Critique · Ship. |
| Payoff 1 | `plan` | 7.1–12.1 | *Plan before pixels.* The storyboard of this very film, with beat lanes. |
| Payoff 2 | `check` | 12.1–19.1 | *Eyes on every frame.* Contact sheet + `ct check`. A collision is caught ("error") and fixed ("fixed"). **The punch.** |
| Payoff 3 | `measure` | 19.1–24.1 | *Motion, measured. Not vibes.* The motion-energy curve draws under a playhead. |
| Payoff 4 | `critic` | 24.1–29.2 | *Every cut, scored.* Five meters fill and count; the verdict reads "Ships". |
| CTA | `end` | 28.7–32.9 | **Continuity** · Motion design, as code. · [Open source] |

The turn introduces the pipeline as a map. Each chapter scene is one stop on it, and its
label (`01 · Plan` … `04 · Critique`) repeats the word of the matching station, so a muted
viewer always knows where they are. "Ship" is the end card.

## Visual language (litt)
- **Theme `litt-dark`.** Warm near-black canvas, stone surfaces, fg type and one grey, litt's
  cobalt as the turn's field, focus and a single fill.
- **Colour tells the story.** The hook is on the solid canvas (the world before eyes). The turn
  and the end card sit on a moving gradient field (`Stage bg="gradient"`): colour arrives, and
  returns for the brand (`accent` on the turn, `aurora` on the end card, where a cobalt field
  would swallow the cobalt button). Type on a field takes one ink, fg. The four chapters are solid: the product is the subject, and the
  identical geometry makes the carries read as one long bench.
- **Composition.** Asymmetric and left-aligned on the safe edge. The hook is a display couplet,
  vertically centred; the turn puts its lockup in the upper half and the pipeline (1536px, air
  on the right) in the lower third. Plan, measure and critic use litt's split frame: the lockup
  (Label 8px above the display line, the display line ≤ 2 lines, 32px above its Body summary)
  in a 608px column, a 96px region of air, the product at 1024px (~53% of the frame) on the
  right. Check, the punch, is the one stacked chapter: the lockup above, the contact sheet and
  the terminal side by side 96px below at full title-safe width. The end card is the film's
  only centred frame.
- **Type.** Geist in three weights by role: display/title 500, text 400, labels 600 in sentence
  case. One display line (112px) per scene, everything else on title/body/small/label. Geist
  Mono for commands, ids, durations and scores. Emphasis is by ink — the hook ends with "see"
  in fg — never a colour, an italic or a serif. On the field the type has one ink, so the turn's
  "eyes." answers by timing: it lands on its own beat.
- **Colour.** Two inks. The accent appears as the turn's field, the caret, the focus ring on
  "Plan", the playhead, and the one primary button on the end card. Status is a word in a tag
  (error / fixed / Ships / 100% eased) in danger or success; the only coloured mark is the danger
  ring on the defect frame. No data hue: nothing here is a recurring category.
- **UI.** Kit components (`Window`, `Card`, `Tag`, `Terminal`, `Meter`, `Stat`, `Button`,
  `Path`), video-scale, with 5 rows or fewer per surface. Cards are flat (raised hairline +
  top highlight); windows float with a zero-offset glow. This scene's storyboard row is the
  raised segment; bars and keyframes are fg 55% with the current one in fg. All mock data
  describes this film itself.

## Motion language (litt tiers)
- **Default: the responsive spring** (visual 0.2s, no bounce) for copy, rows, tags. Stagger
  40ms between siblings, travel 32px.
- **One expressive moment per scene:** hook — line 2; studio — the statement; plan — the
  statement; check — the ✔ verdict (`settle`); measure — the verdict tags (`settle`); critic —
  "Ships" (`settle`); end — the wordmark (`settle`).
- **Ink steps at the instant tier:** lines dim as the next one lands, "see"/"eyes." keep or take
  fg, the current storyboard row and "Plan" step up, the findings step back when fixed, the
  status tags swap error → fixed.
- **Data at the video tiers:** the rail and the energy plot draw/wipe at slow/linger with
  `inOut`; meters fill and scores count together.
- **Exits** only where something is replaced (the caret, the danger ring, the error tags), via
  exit presets: ease out, no bounce.
- **Nothing material moves.** No loops, no glow, no sheen. Ambient life is the camera's slow push
  (1 → 1.03 per scene, anchored on the left edge on the hook and the turn so the cut between them is still); in `check` it is a quiet 1% drift and then a short `inOut` focus move on
  the red that holds through the fix.
- **Transitions (cuts + 1 accent) — every join carries the eye** (docs/decisions/0010).
  hook → studio: a hard cut on the beat that lands on the turn's entrance (label and headline
  start on frame 0). studio → plan: a `portal` (0.9s) through the focused Plan tile — its word
  steps out first, the field flies past and the tile opens onto chapter 01. plan → check: a
  layered `carry` left (12%), copy-led: the lockup rides the cut and leads the wave, the board
  follows; the sheet (frames on it) and the terminal land in a wave, and the command types as it
  settles. check → measure: a layered `carry` (10%), product-led: the lockup exits first, the
  sheet and the gate carry the cut; measure's lockup rides in on the wave with the chart, whose
  playhead starts as it lands. measure → critic: a `match` (0.9s) — the chart window slides left
  into the cut (t²) and the score card leaves the cut at its speed and settles on the left, the
  split frame turned round. critic → end: a `match` (0.6s) — "Ships" becomes the "Open source"
  button where it sits. Accents: portal only.

## Rhythm
The hook is the shortest scene (3.6s: two word cascades and one ink step). The turn breathes
(4.4s) while the rail draws. The chapters build: plan (5.0s), then check, the longest scene
(7.0s), whose red-to-green flip at ~16.7s is the loudest moment of the film. Measure (4.6s)
and critic (5.0s) sit back into calm data reveals; the verdict holds, then becomes the end
card's button, and the end card holds for more than 2s.

## References
1. **Linear launch films:** hairline UI on near-black, UI as the hero, restrained cascades.
2. **Vercel Ship openers:** mono commands, the terminal as a protagonist.
3. **Raycast launch films:** calm, cursor-less UI acting, one action per shot, long settled
   holds.
