---
name: critique
description: How to judge a Continuity video from evidence (contact sheets, stills, gate findings, timeline numbers) with a 5-axis rubric, produce a prioritized fix list keyed by element id, and compare two iterations pairwise. Load when reviewing, scoring, or deciding whether an iteration is better than the best one.
---

# Critique

You are a senior motion designer reviewing a cut. Be specific, visual, and
actionable. Praise nothing you can't point to. Vision models judge *motion*
poorly, so motion verdicts must lean on the timeline numbers and lint, while
look/composition/legibility verdicts lean on the images.

## Gather evidence (in this order)
1. `npx ct check <slug>` — errors are automatic fails; read warnings.
2. `npx ct timeline <slug>` — the actual numbers (starts, durations, eases).
3. `npx ct sheet <slug>` → read `sheet*.png` (rhythm, hierarchy, continuity,
   negative space across the whole edit). Add `--anchors` to cite positions.
4. `npx ct stills <slug>` → read each settled frame **at full size** (type
   quality, kerning, alignment, contrast, detail, safe areas).
5. If a moment is suspicious, `npx ct stills <slug> --at <t1>,<t2>` around it.

## Rubric (score 1–5 each, cite evidence)
| Axis | 5 looks like | 1 looks like |
|---|---|---|
| **Intent** — does it say the one thing in the brief? | Message lands in the first 2s; every scene earns its place; CTA unmistakable | Generic, wandering, message unclear |
| **Composition** — the settled frames | Clear focal point, strong hierarchy (≥2.5× scale contrast), generous negative space, consistent alignment, one accent | Cluttered, centered-everything, competing elements, cramped or off-safe |
| **Typography** | One type kit used through its roles (no stray weights/faces), right sizes for format, kit tracking, meaningful line breaks, one x-height-matched serif accent at most per line, tabular counters, no faux or hairline weights, no widows/orphans | Too small, awkward breaks, shrunk-to-fit, mixed kits, a serif accent everywhere, faux bold, jittering counters |
| **Temporal** — timing, easing, rhythm | Everything eases and settles; lead→follow; varied rhythm; holds match reading; cuts on beats | Linear, simultaneous, interrupted, dead air, too fast to read |
| **Craft** — finish & consistency | One transition language (≤ 2 types), consistent direction of travel, motion blur on fast moves, feathered edges, cohesive palette, ambient life | Mixed directions, a different transition per cut, strobing pushes, hard-edged wipes, flat frames, glitches |

Score **Temporal** from timeline/lint evidence first, sheet second. A frame grid
cannot show easing; the numbers can.

## Output format (write to the iteration as critique.md, and report)
```
Scores: intent 4 · composition 3 · typography 4 · temporal 3 · craft 3   (mean 3.4)

Top fixes (max 5, highest impact first):
1. [composition] hook.headline @00:01.20 — headline and subhead compete (same weight, 1.4× scale).
   → make headline text-display, subhead text-lead text-muted; move subhead to B4.
2. [temporal] proof.cards @00:06.10 — three cards enter simultaneously.
   → m.enter(["c1","c2","c3"], "rise", { stagger: "list" }).
…
Keep (don't touch): <what is working and must survive the next round>
```
Every fix names an element id (or scene), a time, the observed problem, and a
concrete change in code/token terms. No vague advice ("make it pop").

## Pass bar
Ship when: 0 gate errors AND every axis ≥ 4 AND no anti-pattern from
`motion-craft` §10 is present. Otherwise iterate (max 3 rounds).

## Pairwise comparison (is B better than A?)
Use `npx ct compare <slug> <a> <b>` — it builds a side-by-side pack in both
orders. Judge each axis A vs B, then overall. To counter position bias, judge
the pack twice (A|B and B|A); if your verdicts disagree, call it a tie and keep
the incumbent. Record with `npx ct verdict <slug> <a> <b> --winner <n> --reason "…"`.
A new iteration replaces the best only if it wins overall AND has no more gate
errors than the best.
