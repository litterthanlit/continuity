# Continuity bench — rubric

The bench measures **the harness**, not one video: run every brief through
`/make-video` headlessly, then compare runs across harness versions.

## Per video (recorded by the run)
| Metric | Source | Good |
|---|---|---|
| Gate | `ct check` on the final iteration | 0 errors |
| Warnings | same | ≤ 3, each justified |
| Critique | `ct score` (intent, composition, typography, temporal, craft; 1–5) | every axis ≥ 4 |
| Render QC | `ct render` | clean |
| Motion | `ct motion` | 0 dead zones, 0 jolts, active share 55–85% |
| Iterations | `ct status` | ≤ 4 to ship |
| Wall time / cost | headless run JSON | trending down |

## Across harness versions (pairwise)
For each brief, `bench/run.ts compare <runA> <runB>` builds side-by-side packs of
the two finished videos (both orders). A judge (human or the `critic` agent)
picks a winner per axis and overall; ties keep the older run. The harness change
is an improvement when it wins more briefs than it loses and no brief regresses
on the gate.

## Axis anchors (from the critique skill)
- **Intent** — the brief's one message lands in the first 2s; CTA unmistakable.
- **Composition** — one focal point per frame, ≥ 2.5× type contrast, generous negative space, consistent alignment, one accent.
- **Typography** — format-appropriate sizes, tight display tracking, meaningful breaks, legible holds.
- **Temporal** — everything eases and settles, lead → follow, varied rhythm, holds match reading.
- **Craft** — consistent physics and transitions, ambient life, polish, no glitches.
