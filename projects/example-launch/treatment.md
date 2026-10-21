# Treatment — example-launch

**Concept.** The film follows one piece of work through Continuity's studio pipeline, and at
every station the agent *sees* something: a plan, a frame, a curve, a score. "Agents can't see"
becomes "agents check everything" by the end.

## Narrative arc (16:9 · 31.6s · 7 scenes)

| | Scene | Time | Idea |
|---|---|---|---|
| Hook | `hook` | 0–3.6 | *Agents can write motion. They just can't **see** it.* Each line takes the ink, then everything but "see" steps back to the grey. |
| Turn | `studio` | 3.6–8.0 | *Continuity. Give agents a studio. And **eyes**.* Into the light; "eyes." takes the ink. A hairline pipeline draws: Plan · Check · Measure · Critique · Ship. |
| Payoff 1 | `plan` | 7.5–12.3 | *Plan before pixels.* The storyboard of this very film, with beat lanes. |
| Payoff 2 | `check` | 11.8–18.8 | *Eyes on every frame.* Contact sheet + `ct check`. A collision is caught ("error") and fixed ("fixed"). **The punch.** |
| Payoff 3 | `measure` | 18.3–23.3 | *Motion, measured. Not vibes.* The motion-energy curve draws under a playhead. |
| Payoff 4 | `critic` | 22.8–27.9 | *Every cut, scored.* Five meters fill and count; the verdict reads "Ships". |
| CTA | `end` | 27.4–31.6 | **Continuity** · Motion design, as code. · [Open source] |

The turn introduces the pipeline as a map. Each chapter scene is one stop on it, and its
label (`01 · Plan` … `04 · Critique`) repeats the word of the matching station, so a muted
viewer always knows where they are. "Ship" is the end card.

## Visual language (litt)
- **Theme `litt-dark`.** Warm near-black canvas, stone surfaces, fg type and one grey, litt's
  cobalt as light, focus and a single fill.
- **Light tells the story.** The hook is on the solid canvas with no light (the world before
  eyes). The turn and the end card are lit from above (`Stage bg="lit"`): light arrives, and
  returns for the brand. The four chapters are solid: the product is the subject, and the
  identical geometry makes the pushes read as one long bench.
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
  in fg, the turn with "eyes." — never a colour, an italic or a serif.
- **Colour.** Two inks. The accent appears as the top light, the caret, the focus ring on
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
- **Transitions (cuts + 2 accents).** A hard cut on the beat from the hook into the light.
  `push` (0.5s, left, with motion blur) between the sequential pipeline steps, studio → plan →
  check → measure → critic. A `dip` (0.5s) before the end card: one breath before the brand.

## Rhythm
The hook is the shortest scene (3.6s: two word cascades and one ink step). The turn breathes
(4.4s) while the rail draws. The chapters build: plan (4.8s), then check, the longest scene
(7.0s), whose red-to-green flip at ~16.4s is the loudest moment of the film. Measure (5.0s)
and critic (5.1s) sit back into calm data reveals, and the dip gives one clean breath before
the end card holds for more than 2s.

## References
1. **Linear launch films:** hairline UI on near-black, UI as the hero, restrained cascades.
2. **Vercel Ship openers:** mono commands, the terminal as a protagonist.
3. **Raycast launch films:** calm, cursor-less UI acting, one action per shot, long settled
   holds.
