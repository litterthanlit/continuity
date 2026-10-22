---
name: critique
description: How to judge a Continuity video from evidence (contact sheets, stills, gate findings, timeline numbers) against litt in its register (calm or energetic) — a 5-axis rubric plus litt's signature checklist (light and material, structure, type, motion, generic-AI tells) and the energetic register's checklist — produce a prioritized fix list keyed by element id, and compare two iterations pairwise. Load when reviewing, scoring, or deciding whether an iteration is better than the best one.
---

# Critique

You are a senior motion designer reviewing a cut against **litt**, the house language
(technical precision, lit from above — `docs/decisions/0006`, the `motion-craft` and
`typography` skills). Be specific, visual and actionable. Praise nothing you can't point to.
Vision models judge *motion* poorly, so motion verdicts lean on the timeline numbers and lint;
look, composition and legibility verdicts lean on the images.

**Judge in the video's register** (storyboard `register`, a scene's own wins — `motion-craft`
§12). A brand reel is not a failed launch: in `energetic` scenes, pop springs on objects, steep
in-outs, a travelling camera, depth transitions and up to three moments per scene are the craft,
not defects. What is a defect in either register: anything material moving, copy below read
time, unsettled motion, more than one accent fill, colour that isn't light or data. And choosing
the wrong register is itself an **Intent** finding — a product walkthrough cut like a reel, or a
brand reel that never gets off the ground.

## Gather evidence (in this order)
1. `npx ct check <slug>` — errors are automatic fails; read warnings. The `litt-*`,
   `spring-bounce`, `expressive-budget`, `material-motion`, `property-motion`, `travel-too-far`,
   `camera-drift`, `ambient-loop`, `text-fade` and `transition-register` findings are the taste
   gate (their bounds already follow each scene's register): each one is a defect unless it
   carries a justified `allow` / `litt-allow`.
2. `npx ct timeline <slug>` — the actual numbers (starts, durations, eases, staggers).
3. `npx ct sheet <slug>` → read `sheet*.png` (rhythm, hierarchy, continuity, negative space
   across the edit). Add `--anchors` to cite positions.
4. `npx ct stills <slug>` → read each settled frame **at full size** (type, weights, inks,
   spacing, alignment, contrast, material, safe areas).
5. If a moment is suspicious, `npx ct stills <slug> --at <t1>,<t2>` around it.

## Rubric (score 1–5 each, cite evidence)
| Axis | 5 looks like | 1 looks like |
|---|---|---|
| **Intent** — does it say the one thing in the brief? | Lands in the first 2s; every scene earns its place; one idea per scene; the CTA unmistakable | Generic, wandering, message unclear |
| **Composition** — the settled frames | One focal point; hierarchy from weight, ink and space, then the one display step; asymmetric, left-aligned, airy (≤ 60% of the safe area); on the 16px grid; one light from the top, used once or twice; colour only as light (≤ 1 accent fill) or data | Centered everything, competing display lines, crowded, accent words, glow blobs, decorative gradients |
| **Typography** | Geist only, 400/500/600 by role, two inks, display once per scene and ≤ 2 lines, tight lockups (label 8px over its title) and wide gaps, sentence-case labels, mono only for data, tabular figures, meaningful breaks | Bold/light weights, uppercase eyebrows, a serif or italic accent, mixed sizes, shrunk-to-fit, mono paragraphs |
| **Temporal** — timing, easing, rhythm | Calm: responsive springs by default, exactly one expressive moment per scene, exits at 0.75× without bounce, 32px travel, 40ms staggers, lead → follow, holds that match reading, cuts on the beat. Energetic: easing by role (steep UI and camera, pop objects, linear machines), small moves 5–15 frames, every group staggered 1–3 frames, bursts answered by ~1s holds | Linear, bouncy, simultaneous, interrupted, dead air, too fast to read, two moments competing; energetic: one uniform ease on everything, no holds |
| **Craft** — finish & consistency | Material static, ambient life only from a ≤ 3% camera push (energetic: ≤ 8%, plus tile drift), one transition language (cuts + ≤ 2 accents; energetic ≤ 3, depth among them), consistent direction, motion blur on fast pushes, flat cards and zero-offset floats, both themes designed | Loops, sweeps and pulses, a different transition per cut, offset shadows, off-scale radii, strobing pushes, glitches |

Score **Temporal** from timeline/lint evidence first, the sheet second.

## litt signature checklist
Mark each ✅ / ❌ / n/a; every ❌ names an element and goes into the fixes.
- **P1** At most one accent fill per frame, on the primary action; the accent otherwise only as light (the top light, focus, caret, a click ring). No accent word in copy.
- **P2** One light source, from the top; `lit` on the hero (and maybe the end card) only.
- **P3** Glass only on floating UI with content behind it.
- **P4** No offset shadow; cards flat (hairline + highlight); floats zero-offset glow + ring.
- **P5** Nothing material moves (light, grain, glow, backdrop).
- **P6** 16px grid (8 inside components), 2px hairlines, tracking tightening with size.
- **P7** One idea per scene; asymmetric and left-aligned; centered once at most.
- **P9** Weight by role: 400 text, 500 titles, 600 labels — nothing else.
- **P11** Colour carries data only (the five hues, in order); status in words, never a dot.
- **P12** A current/selected item wears the raised segment, not a colour, a dot or a weight.
- **Motion** One expressive moment per scene; bounce ≤ 0.12; exits 0.75× ease-out; ink at instant; ambient = camera ≤ 3% (calm scenes; energetic scenes take the checklist below).
- **Tells** None of: purple-blue gradients, gradient text, emoji markers, uppercase mono eyebrows on every scene, three equal icon cards, arrow suffixes, glow blobs, one radius on everything.

## Energetic register checklist (energetic scenes only)
- **E1 Easing by role** — UI and camera on `steep`, objects on `pop`, machines `linear`; no single ease on everything.
- **E2 Stagger** — every group lands 1–3 frames apart; nothing appears all at once.
- **E3 Rhythm** — every 2–4s burst is followed by a ~1s hold on one composition.
- **E4 Depth** — scenes connect through space (depth, blurred pushes, match cuts), not crossfades.
- **E5 Type** — copy types or wipes; nothing fades.
- **E6 Containers** — imagery in `Media`/cards/2×2 grids on the grid; one treatment per formula; the palette holds.
- **E7 Formula** — at least one scene formula used twice with new content.
- **E8 Organic + technical** — markers, hairlines, mono indices over natural imagery where the brief allows.
- **E9 Loop** — the ending answers the opening (reversed move, the same frame, the CTA).

## Output format (write to the iteration as critique.md, and report)
```
Scores: intent 4 · composition 3 · typography 4 · temporal 3 · craft 3   (mean 3.4)
litt: ✅ P1 P2 P3 P4 P5 P6 P9 P11 P12 · ❌ P7 (hook.headline centered) · motion ❌ (proof: two expressive moments)
energetic (if any): ✅ E1 E2 E4 E5 E6 · ❌ E3 (montage: 6s burst, no hold) E7 (collage used once)

Top fixes (max 5, highest impact first):
1. [composition] hook.headline @00:01.20 — centered with the label floating 40px above it.
   → left-align on the safe edge (left-[96px]); <Stack gap={8}> for label + headline.
2. [temporal] proof @00:06.10 — window and toast both settle on the expressive spring.
   → keep `settle` on window; toast `rise` (responsive).
…
Keep (don't touch): <what is working and must survive the next round>
```
Every fix names an element id (or scene), a time, the observed problem, and a concrete change
in code/token terms. No vague advice ("make it pop").

## Pass bar
Ship when: 0 gate errors AND every taste-gate warning fixed or justified AND every axis ≥ 4
AND no ❌ in the litt checklist (nor the energetic checklist for energetic scenes) AND no
anti-pattern from `motion-craft` §11 (§12's list for energetic scenes). Otherwise iterate
(max 3 rounds).

## Pairwise comparison (is B better than A?)
Use `npx ct compare <slug> <a> <b>` — it builds a side-by-side pack in both orders. Judge each
axis A vs B, then overall. To counter position bias, judge the pack twice (A|B and B|A); if
your verdicts disagree, call it a tie and keep the incumbent. Record with
`npx ct verdict <slug> <a> <b> --winner <n> --reason "…"`. A new iteration replaces the best
only if it wins overall AND has no more gate errors than the best.
