# Continuity — motion design, as code

> For skeptical designers: AI agents can now make motion you'd ship, because they can finally see their own work.

**Format:** 9:16 · 1080×1920 · 30fps · 14.65s · theme `mono-dark`

| # | Scene | In | Duration | Intent | Transition out |
|---|---|---|---|---|---|
| 1 | `hook` | 00:00.00 | 2.6s | Stake the claim: motion design is a craft (earn trust with designers). | cut |
| 2 | `write` | 00:02.60 | 2.3s | The turn: agents can already write motion code. | cut |
| 3 | `blind` | 00:04.90 | 2.5s | Tension: they can't see what they make. | zoom |
| 4 | `eyes` | 00:06.95 | 2.9s | Resolution: we gave them eyes — the contact sheet as proof. | cut |
| 5 | `check` | 00:09.85 | 2.4s | Proof: every frame is checked. | dip |
| 6 | `end` | 00:11.75 | 2.9s | Brand + promise + CTA. | cut |

## Iteration #4 (best)

- Gate: ✅ pass — 0 errors, 0 warnings
- Critique: intent 4 · composition 4 · typography 5 · temporal 4 · craft 4 (mean 4.2)
- Render: `out/example-type/example-type-234bf319e0ef.mp4`
- Note: First complete cut: editorial kinetic type, self-referential contact sheet.

![contact sheet](sheet.png)

### Critique

Scores: intent 4 · composition 4 · typography 5 · temporal 4 · craft 4   (mean 4.2)

Evidence: gate 0/0/0 (iteration 4); timeline lint clean; sheet iteration 3 + eyes still iteration 4.

Top fixes (next round, if any):
1. [composition] all scenes — lower ~30% of the frame is unused in type-only scenes; acceptable for 9:16 (feed UI), but a bottom-anchored element (progress tick / page index) could add structure.
2. [temporal] write.l1 @00:02.65 — hard cut lands on ~0.1s of empty frame before words rise; start b1 at 0.0 with a faster first word.
3. [craft] end.glow — glow pulse is the only ambient motion on the end card; add a 1–2% camera drift (already present) — OK, low priority.

Keep (don't touch): left-edge consistency across cuts; serif-italic accent swaps (craft. / eyes.); blur on "see"; self-referential contact-sheet tiles; check-mark draw; dip into the end card.

