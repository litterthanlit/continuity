# Treatment — example-launch

**Concept.** The film follows one piece of work through Continuity's studio pipeline, and at
every station the agent *sees* something: a plan, a frame, a curve, a score. "Agents can't see"
becomes "agents check everything" by the end.

## Narrative arc (16:9 · 31.0s · 7 scenes)

| | Scene | Time | Idea |
|---|---|---|---|
| Hook | `hook` | 0–3.9 | *Agents can write motion. They just can't **see** it.* "see" goes out of focus. |
| Turn | `studio` | 3.4–7.8 | *Continuity. Give agents a studio. And **eyes**.* A hairline pipeline draws: Plan · Check · Measure · Critique · Ship. |
| Payoff 1 | `plan` | 7.3–12.1 | *Plan before pixels.* The storyboard of this very film, with beat lanes. |
| Payoff 2 | `check` | 11.6–18.2 | *Eyes on every frame.* Contact sheet + `ct check`. A collision is caught (red) and fixed (green). **The punch.** |
| Payoff 3 | `measure` | 17.7–22.7 | *Motion, measured. Not vibes.* The motion-energy curve draws under a playhead. |
| Payoff 4 | `critic` | 22.2–27.3 | *Every cut, scored.* Five axes fill and count, and the best version is marked "ships". |
| CTA | `end` | 26.8–31.0 | **Continuity** · *Motion design, as code.* · Open source |

The turn introduces the pipeline as a map. Each chapter scene is one stop on it, and its
eyebrow (`01 · Plan` … `04 · Critique`) repeats the label of the matching pill, so a muted
viewer always knows where they are. "Ship" is the end card.

## Visual language
- **Theme `mono-dark`.** Near-black canvas, white type, one violet accent, hairline borders.
- **Backgrounds tell the story.** The hook is on `solid` black with no light (the world before
  eyes). The turn and the end card use `aurora` (light arrives). All four chapters use `grid`,
  a quiet engineering surface behind the UI, and because it continues across pushes the
  chapters feel like one long workbench.
- **Type.** Inter Tight semibold for display. The hook and turn use `h1` (120), left-aligned on
  the safe edge. Chapters use the editorial layout "headline above, UI below": mono eyebrow →
  `h2` (88) headline → muted `caption` sub, all on one left edge, with the UI surface at
  roughly 85% of the frame width underneath (the product is the hero). The end card is the
  only centered frame (`display` wordmark). The serif-italic swap is used only on *see* and
  *eyes*.
- **Color.** The accent marks one thing per frame: the caret, the active pipeline pill, the
  current storyboard row, the playhead and energy line, the progress fills, the CTA dot.
  Red and green appear only in the gate moment, as UI status.
- **UI.** Kit components only (`Window`, `List`, `Terminal`, `Card`, `Pill`, `LineChart`,
  `Progress`, `Stat`, `Sheen`, `Glow`, `Path`), video-scale, with 5 rows or fewer per surface.
  All mock data describes this film itself.

## Motion language
- **Entrances.** Copy uses `maskUp` (by words in the hook, by lines elsewhere) with `hero`
  ease. UI surfaces `rise` 80–96px with a `rotateX` 10→0 tilt that resolves before anything is
  read. Rows cascade with `rise` + `list` stagger. Chips and pills use `scalePop` (snappy).
  Data uses `draw` (line, rail), `scaleY`/`scaleX` grows and `m.counter`.
- **Physics.** Everything enters from below or left to right (reading direction), and nothing
  exits mid-scene. The transition is the exit. The one exception is the defect ring, which
  fades out when the fix lands.
- **Transitions (2 types).** `dip` 0.5s marks the chapter breaks: problem → answer, and
  proof → brand. `push` 0.5s marks each step along the pipeline, moving left like the pipeline
  reads.
- **Camera.** A slow push on every scene (scale 1 → 1.025–1.04, `inOut`). The turn adds a 24px
  drift toward the push. The content holds while the camera moves.

## Rhythm
The hook is the shortest scene (3.9s, two word-cascades and one blur). The turn breathes
(4.4s) while the rail draws. The chapters build: plan (4.8s), then check, the longest scene
(6.6s), whose red-to-green flip at ~16s is the loudest moment of the film. Measure (5.0s) and
critic (5.1s) sit back into calm data reveals, and the dip gives one clean breath before the
end card holds for more than 2s.

## References
1. **Linear launch films:** hairline UI on near-black, a single violet accent, UI as the hero,
   restrained cascades.
2. **Vercel Ship openers:** grid backdrop, mono eyebrows, terminal as a protagonist.
3. **Raycast launch films:** calm, cursor-less UI acting, one action per shot, long settled
   holds.
