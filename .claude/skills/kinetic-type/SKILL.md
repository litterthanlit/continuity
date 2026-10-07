---
name: kinetic-type
description: Kinetic typography and social cuts (9:16 reels/shorts/TikTok, 1:1, 16:9 type-driven promos) — structure, pacing, layout, type treatments and motion patterns for type-led videos. Load with motion-craft when the video is primarily words in motion.
---

# Kinetic typography

Type *is* the image. The craft is rhythm (when words land), contrast (which word
matters) and restraint (one idea per beat).

## Structure (8–20s social)
1. **Hook (0–2s):** a provocation or promise in ≤ 5 words. First motion ≤ 0.2s.
   No logo first — earn attention, then brand.
2. **Turn / tension (2–8s):** 2–4 beats that build the argument. One line each.
3. **Payoff (last 3–5s):** the answer + brand + CTA. Hold the final card ≥ 1.5s.
Each beat = one scene (or one line within a scene). Cuts land on beats.

## Layout for 9:16
- `<Safe zone="social">` always (platform UI covers top ~10%, bottom ~18%, right
  ~12%). Keep key words in the upper-middle band (rows 2–4 of the 6×6 grid).
- Big type: `text-display` (168) or `text-h1` (120) for 1–3 word lines; at most
  ~9 characters per line at 168px within the social safe width (~860px).
- Stack lines left-aligned (editorial) or centered (statement). Break by meaning:
  `Motion<br/>is a<br/>craft.` beats a paragraph.
- Body/supporting copy ≥ 38px (`text-body`); captions ≥ 34px in portrait.

## Type treatments (pick one emphasis per line)
- **Scale contrast:** the key word 1.5–2× its neighbours.
- **Serif swap:** `<Serif>` for one word in an otherwise grotesk line — instant
  editorial polish.
- **Accent color** on the single most important word.
- **Marker:** `<Highlight ct="x">` + `m.emphasize("x-bar", "underline")`.
- **Weight shift / outline:** e.g. `font-light` setup → `font-semibold` payoff.
- Tight tracking at display sizes is already in the scale (−0.045em); don't
  loosen it unless it's an eyebrow.

## Motion patterns
| Pattern | Code | Feel |
|---|---|---|
| Line mask reveal | `enter(id, "maskUp", { split: "lines" })` | premium, editorial |
| Word punch | `enter(id, "rise", { split: "words", ease: "hero", distance: 40 })` | energetic |
| Char cascade | `enter(id, "fadeBlur", { split: "chars", stagger: "char" })` | elegant; ≤ 20 chars |
| Type-on | `enter(id, "typeOn", { split: "chars", stagger: 0.035 })` | terminal, code, UI |
| Track-in | `enter(id, "trackIn")` | wordmarks, single words |
| Swap | `exit(a, "maskOut", { split: "words" })` then `enter(b, "maskUp", …)` at `after:a` | replace a word in place |
| Zoom punch | `enter(id, "zoomIn")` | single huge word on a beat |

Rules of thumb:
- Reveal **lines**, not paragraphs. A new line lands every 0.4–0.9s in hype
  edits, every 1–2s in calm ones.
- After the last word lands, hold for read time before cutting (lint enforces).
- Cut between scenes rather than exiting text — kinetic type lives on hard cuts.
  Use `zoom` or `pushUp` once or twice for escalation; never on every cut.
- Add ambient motion during holds: `m.camera({ scale: [1, 1.04] })` and/or a
  slow `m.loop("bg", …)`.
- With music (`bpm` in the storyboard): put beats on the grid (`60/bpm` s) and
  land key words on downbeats.

## Copy
Write it like a headline writer: concrete verbs, no filler, parallel structure
across beats ("Write it. See it. Ship it."). If a line needs 2 sizes smaller to
fit, it's too long.
