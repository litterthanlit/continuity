---
name: motion-craft
description: The motion design taste layer — timing, easing, choreography, staggering, holds, transitions, camera and frame composition rules with concrete numbers, plus anti-patterns and recipes. Load whenever writing or reviewing motion() code or scene layouts for a Continuity project.
---

# Motion craft

Agent-made motion fails in predictable ways: linear easing, everything moving at
once, things never settling, text colliding mid-move, dead holds, and frames that
were never composed. These rules exist to prevent exactly that. Numbers are at
1080p (short side 1080px) and assume 30fps.

## 1. Compose the frame first
- **Hierarchy by contrast, not by count.** One dominant element per frame. Scale
  ratio headline : support ≥ 2.5× (e.g. `display` 168 over `lead` 48). Max two
  type sizes + an eyebrow per scene.
- **Negative space is the luxury signal.** Content occupies ≤ 60% of the safe
  area. When in doubt, remove an element, never shrink the type.
- **Alignment:** single statements centered; multi-line copy, lists and UI
  left-aligned on a clear edge (editorial). Don't mix in one scene.
- **Measure:** ≤ 14 words of on-screen copy per scene (16:9), ≤ 7 (9:16). Lines
  of display type ≤ 3; break lines by meaning, not by width (`<br/>` is fine).
- **Color:** one accent per frame, used on the single most important word or
  shape. Text contrast ≥ 4.5:1 (3:1 for ≥ 24px bold).
- **Safe areas:** `<Safe>` (16:9) / `<Safe zone="social">` (9:16).

## 2. Easing — everything eases
| Motion | Ease | Why |
|---|---|---|
| Entrances | `enter` (emphasized decelerate) or `hero` (expo-out) | Arrive fast, settle gently |
| Exits | `exit` (emphasized accelerate) | Leave decisively, attention has moved on |
| Move between two resting states | `standard` / `inOut` | Symmetric, calm |
| UI / tactile (buttons, chips, cards) | `snappy` spring | Physical, responsive |
| Soft settles, ambient | `gentle` spring | |
| Playful accents only | `bouncy` | Overshoot fatigue is real — ≤ 1 per scene |
| Camera, wipes, transitions | `inOut` | |
| Whips, punches | `sharp` (quint in-out) | Slow out, a blur of speed, slow in |
`linear` only for continuous loops, marquees, progress bars, type-on.

## 3. Duration — scales with size and distance
- Small UI (icons, chips, badges): `fast` 0.24 – `base` 0.4
- Lines of copy, cards: `slow` 0.64
- Hero type, big panels, logo resolves: `hero` 0.9
- Exits ≈ 60–75% of the matching entrance (`base` for a `slow` entrance).
- Camera drifts: the whole scene (2–6s). Transitions: each type has a craft range
  (whip 0.2–0.45s, push 0.3–0.8s, iris 0.4–0.9s — see §7); lint enforces it.
- Under 0.15s reads as a glitch; over 1.6s for an entrance drags.
- **Vary** within the scale — a scene where everything is 0.64s feels mechanical.

## 4. Distance
Copy rises 24–48px · cards/panels 64–120px · never travel more than ~15% of the
frame for an entrance. Masked reveals (`maskUp`) travel 110% of the line height
behind a mask — big movement, no layout jump.

## 5. Choreography — lead, follow, settle
- **One focal point at a time.** The eye can track one hero motion plus a
  supporting cascade. ≤ 4–5 independent movers at once (lint: `crowded`).
- **Lead → follow:** headline leads; supporting copy follows 100–250ms after the
  headline *lands* (`"after:headline-0.2"` overlaps gracefully); UI chrome last.
- **Settle before the next idea:** give a landed hero ≥ 150–300ms of stillness
  before the next focal move (lint: `settle-interrupted`).
- **Stagger = hierarchy + direction.** chars 18–30ms · words 50–70ms · lines
  80–120ms · list items 60–90ms. Total cascade ≤ 1.2s (lint: `stagger-too-long`).
  Order follows reading direction; `from: "center"` for symmetric grids/logos.
- **Overlapping action:** groups may overlap by ~30–40% of their duration; elements
  *within* a group overlap via stagger. Never start an element's exit before its
  entrance settled.
- **Consistent physics:** if things enter from below, they exit upward
  (continuation). Don't mix directions within a scene without a reason.
- **Let the transition be the exit.** Don't fade every element out and then
  transition; exit only what must leave before the cut.

## 6. Holds & reading
- Text needs `max(0.83s, chars/17 + 0.4s)` on screen, counted from when it starts
  appearing (people read along a reveal), **and** ≥ 0.6s fully settled before it
  leaves (lint: `read-time`). A hero headline deserves ≥ 1s of stillness; a key
  stat ≥ 1.5s.
- Holds longer than ~1.6s need **ambient life**: `m.camera({ scale: [1, 1.03] })`
  over the scene, `m.loop("bg", { scale: 0.02 }, { period: 8 })`, a drifting
  `<Glow>`. Amplitudes stay tiny (scale ≤ 0.03, translate ≤ 12px, rotate ≤ 2°).
  Dead air > 2.5s is a lint warning.

## 7. Transitions (storyboard `transition`)
Research: `docs/research/2026-10-transitions.md`. Gallery: `projects/_transitions`.

| Type | Default | Params | Use for |
|---|---|---|---|
| `cut` | — | | default between punchy beats; cut **on** the beat — the most premium transition |
| `crossfade` | 0.5 | ease | the same surface in a new state |
| `dip` | 0.5 | ease | chapter break, before the CTA/logo |
| `push` | 0.5 | dir, blur, ease | sequential steps, carousels (dir = reading direction); `blur: true` for speed |
| `pushUp` | 0.5 | blur, ease | feeds, lists, 9:16 |
| `whip` | 0.33 | dir, blur, ease | camera-first product cuts: a fast push with motion blur, swap at peak speed |
| `punchCut` | 0.37 | flash, ease | editorial punch: push-in, hard swap at 45%, 2-frame flash |
| `wipe` | 0.5 | dir, angle, feather, ease | reveal a new state; `feather: 8–20` and `angle: 120` for a soft diagonal |
| `iris` | 0.6 | origin {x,y %}, feather | focus on a point (a button, a logo) |
| `strips` | 0.5 | n, dir, stagger | high-energy accent: 5–7 staggered strips, 20–40ms apart |
| `lightSweep` | 0.6 | dir (left/right), color | a luminous band across the cut — logo/hero moments, once |
| `blur` | 0.5 | ease | defocus out, focus in: dreamy, time passing |
| `zoom` | 0.5 | ease | through into a detail |

```json
"transition": { "type": "push", "dir": "left", "blur": true }
"transition": { "type": "wipe", "angle": 120, "feather": 14 }
"transition": { "type": "iris", "origin": { "x": 70, "y": 40 } }
```

**Pick one transition language per video** (lint `transition-language`: ≤ 2 types; cuts free):
| Language | Primary | Accent | Feel |
|---|---|---|---|
| Swiss cuts | `cut` on the beat | `dip` at chapter breaks, a feathered `wipe` for state reveals | Linear/Vercel restraint |
| Camera-first product | `push` + `blur: true` (reading direction) or `whip` | `zoom` into detail, `iris` to focus | the camera does every transition |
| Luminous | `blur`, `crossfade` | one `lightSweep` on the logo | Apple/Stripe calm energy |
| Kinetic / social punch | `cut` on the beat | `punchCut`, vertical `whip`, `strips` (pick two) | 9:16 rhythm, 8–12 frame moves |

Rules: keep one direction of travel through a sequence; exit ease-in, enter
ease-out (the defs already pair them); never a spring on a full-frame move
(`transition-bounce`); fast pushes need motion blur (`transition-strobe`); a
scene's incoming and outgoing transitions must not overlap (schema error).

## 8. Camera
Slow push-ins (1 → 1.03–1.06) build tension; lateral drift 20–60px adds depth;
no fast camera inside a scene (lint: `camera-too-fast`) — a whip between scenes is
the `whip` transition, with motion blur matched to its speed.
Combine camera with stillness: when the camera moves, the content holds.

## 9. Kinetic emphasis vocabulary
Scale contrast (one word 2× the rest) · weight shift (`weightPulse`, variable
kits) · width breath (`widthPulse`, flexion/broadside) · color swap to accent ·
serif italic swap (`<Serif>`) · marker highlight (`<Highlight>` + `underline`) ·
a single `pulse` on the key word. Pick ONE per line. (See the `typography` skill.)

## 10. Anti-patterns (auto-fail in critique)
1. Linear easing on anything that moves through space.
2. Everything appears at once, or everything staggers identically.
3. Elements move before the previous one settled; exits interrupt entrances.
4. Text colliding with other text during motion (plan non-crossing paths).
5. Shrinking type to fit more copy — cut words instead.
6. Dead holds; or the opposite — perpetual busyness with nothing landing.
7. Every element doing three things (fade + blur + scale + rotate). Choose one idea.
8. Random directions; bounce everywhere; long cascades.
9. Centered everything with no hierarchy; multiple accents per frame.
10. Opening on a static/empty frame — first motion within 0.1–0.4s.
11. A different transition on every cut; 50/50 dissolves between unrelated frames.
12. Hard-edged diagonal wipes with no feather; fast pushes with no motion blur.
13. Bounce or overshoot on a full-frame scene move; light sweeps on every cut.

## Recipes
See `recipes.md` for copy-ready motion for: statement headline, eyebrow +
headline + subhead, feature list, stat reveal, logo resolve, end card, UI card
entrance, quote.
