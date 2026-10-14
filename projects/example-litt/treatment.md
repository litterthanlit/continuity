# Treatment — example-litt

**Concept.** A film that does what it claims: one calm promise, then the proof, written as quietly as the product it describes, with the only light in the frame falling on the one thing you should do next.

## Narrative arc (16:9 · 13.5s · 4 scenes · 30fps)

| | Scene | Time | Idea |
|---|---|---|---|
| Hook | `hook` | 0–3.0 | *Motion design, written as code.* Two display lines low-left under an empty lit top; the file behind the frame (`hook.tsx`) types on. |
| Turn | `gate` | 2.6–6.9 | *Every frame, checked.* A findings card (Overflow, Contrast, Easing, with mono time stamps) flips from red to green and resolves to a **0 errors** pill. The pill is the proof. |
| Payoff 1 | `proof` | 6.9–10.4 | *Measured, not guessed.* Three mono figures: **5** critique axes, **30** fps, **0** gate errors. The 0 is the point. |
| Payoff 2 | `end` | 10.0–13.5 | **Continuity** · *Motion design, as code.* · **Get started** beside `npx ct init`. |

The hook and the end card bookend one sentence ("written as code" → "as code"). The turn and the numbers are the same argument at two scales: one run of the gate, then the rule it enforces. Words on screen at once, counting figures and time stamps: hook 6 · gate 11 · proof 11 · end 10 (≤ 12).

## Visual language
- **Theme `litt`.** Cool near-black canvas, `fg` / `muted` / `subtle` for hierarchy, one signal-blue `accent` used as light, hairline borders, 8px controls and 16px surfaces. Glow and ring give depth; there is no offset shadow anywhere.
- **Backdrop.** `lit` in every scene: one accent light falling from the top edge plus static grain. It never animates, and nothing else is added to it (no `Glow`, no `Sheen`).
- **Type kit `litt`.** Host Grotesk 400 (the open-source stand-in for the Helvetica Now Display setting of the reference frame) for display and text, Geist Mono for the file name, time stamps, figures and the command. One weight everywhere; hierarchy is size first (≥ 2.5× steps), then colour. Sentence case throughout: the CTA copy is fixed in sentence case ("Motion design, as code."), so a lowercase hook would split the voice. No eyebrow on any scene, no italic, no accent-coloured, serif or gradient word. Every headline is a single colour.
- **Type treatments.** Hook and end wordmark: `text-display` 168px, fg, left-aligned (hook) / centred (end). Gate headline: `text-h1` 120px. Proof figures: Geist Mono `text-h1` 120px over a `text-lead` 48px muted lead line (2.5×) and 30px muted labels. UI text 26–32px. File name, time stamps and the command are mono, `text-subtle` (the chip's text is `fg`).
- **Colour usage.** `accent` appears exactly once in the film: the fill and `shadow-glow` of the "Get started" button. Status colours (danger, warning, positive) live only in the gate scene, as 18px dots and the verdict pill's dot. Everything else is `fg`, `muted`, `subtle`, `surface`, `border`.
- **Composition.** Left-aligned and airy, 3–4 elements per scene, content ≤ 50% of the safe area. Hook sits low-left, the gate headline high-left with its card top-aligned at the right, the figures run in one band. The end card is the only centred frame.

## Motion language: Lit precision
- **Tiers.** Responsive is the default: `rise` (distance 32, `base`, ease `standard`) and `fade`, cascades on `word` (60ms) or `grid` (50ms) and ≤ 0.4s long. Instant is the dot flip (`fast`). Content supplies the ambient life: typing (`typeOn`), counters, a blinking caret.
- **One expressive moment per scene** (`snappy` at `slow`; the only springs in the film):

  | Scene | Expressive moment | at |
  |---|---|---|
  | `hook` | the five headline words rise on `snappy` | 0.1 |
  | `gate` | the "0 errors" verdict pill `scalePop` | 2.7 |
  | `proof` | the **0** figure `scalePop` | 1.1 |
  | `end` | the "Get started" button `scalePop` | 1.0 |

- **The single primary action, and the only glow:** the end card's **Get started** button (`bg-accent` + `shadow-glow`). The gate's verdict is a result, not an action, so it gets neither.
- **Exits.** None inside scenes; the transition is the exit. Dots swap by cross-fading a state layer.
- **Material never moves.** No tween or loop on the backdrop, grain, glow ring or any brightness/blur/filter; only `transform` and `opacity` animate. No weight or width tweens (one-weight kit).
- **Transitions: Lit precision** (two timed types plus a cut, all inside their craft ranges):
  - `hook → gate`: `crossfade` 0.4, ease `standard`: the same lit surface, a new state.
  - `gate → proof`: `cut` on the beat: the verdict lands, holds ~0.9s, the frame changes.
  - `proof → end`: `dip` 0.4, ease `standard`: the one breath before the end card.
- **Camera.** Locked. `m.camera` would scale the backdrop with the content and move the light, so no scene uses it.

## Rhythm
Breathes: the hook (a 1.1s settled hold after the file name types), the red state of the gate (1.0s held still so the findings can be read), the end card (≥ 1.5s after the command is typed, with only a caret blinking). Punches: the four expressive moments, spaced roughly 5s, 3s and 3s apart on the global clock (0.1s, 5.3s, 8.0s, 11.0s), each followed by a still hold. The only hard edge is the cut after the verdict.

## References
1. **litt.md** ("technical precision, lit from above"): one weight, one accent used as light, glow-and-ring depth, three motion tiers with one expressive moment per view.
2. **Linear launch films:** hairline UI on near-black, restrained cascades, UI as the hero, long settled holds.
3. **Vercel / Geist title cards:** large left-aligned grotesk display type, mono as the voice of the machine, generous negative space.
