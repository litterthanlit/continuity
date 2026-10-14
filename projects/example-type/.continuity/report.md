# Continuity — motion design, as code

> For skeptical designers: AI agents can now make motion you'd ship, because they can finally see their own work.

**Format:** 9:16 · 1080×1920 · 30fps · 14.96s · theme `mono-dark`

| # | Scene | In | Duration | Intent | Transition out |
|---|---|---|---|---|---|
| 1 | `hook` | 00:00.00 | 2.6s | Stake the claim: motion design is a craft (earn trust with designers). | cut |
| 2 | `write` | 00:02.60 | 2.3s | The turn: agents can already write motion code. | punchCut |
| 3 | `blind` | 00:04.53 | 2.6s | Tension: they can't see what they make. | whip |
| 4 | `eyes` | 00:06.83 | 2.9s | Resolution: we gave them eyes — the contact sheet as proof. | cut |
| 5 | `check` | 00:09.73 | 2.4s | Proof: every frame is checked. | punchCut |
| 6 | `end` | 00:11.76 | 3.2s | Brand + promise + CTA. | cut |

## Iteration #12 (best)

- Gate: ✅ pass — 0 errors, 0 warnings
- Critique: intent 4 · composition 5 · typography 5 · temporal 4 · craft 5 (mean 4.6)
- Render: `out/example-type/example-type-84f6c6e57aaa.mp4`
- Note: #10 + the critic's one remaining fix (tile cascade: centre column, top corners, bottom corners) — scores carried from #10's critique, the fix verified on stills 7.60/7.70 and ct timeline

![contact sheet](sheet.png)

### Critique

Scores: intent 4 · composition 5 · typography 5 · temporal 4 · craft 5 (mean 4.6). Carried over from the critic's review of #10. #12 differs from #10 only by that review's one remaining fix, the eyes tile cascade, which was checked on stills 7.60/7.70 and in `ct timeline`.

**What it is.** The flagship 9:16 kinetic-type piece, re-cut in the v2 look. Type is the **broadside** kit: Archivo condensed caps at 850 weight, Inter Tight for text, Martian Mono for labels, and an Instrument Serif italic accent used only on *craft.* and *eyes.*. Transitions follow the **kinetic punch** language: cuts on the beat, two punch cuts (write→blind and check→end) and one feathered vertical whip (blind→eyes), all travelling upward. The single variable-axis moment is the end-card wordmark settling from wide (widthIn), outward from the centre, after the flash.

**Critic's keep list.**
- The kit is used through its roles.
- The left edge is shared across scenes.
- The curly apostrophe in CAN’T.
- The blur on "see".
- A camera push on every hold.
- The end card is centred in the social safe zone, 33px left of the frame centre, clear of the platform UI rail. This is intentional.

**Known gaps**
- Intent sits at 4 by the rubric's letter. The CTA is a quiet mono eyebrow, and the hook states a premise rather than the product. This follows the treatment's argument arc and was accepted rather than reworked.
- For 2 frames (≈67ms) around 10.10–10.13, the comma of FRAME, is still under its line mask while the line rises, so it reads "FRAME." mid-motion. This can't be seen at playback speed and was judged not a defect.
- The gate reports 9 `content_overlap` infos at the two punch-cut swaps. They are false positives: the swapped-out scene is still in the DOM. The stills at the swap frames show only the incoming scene.

**Engine gaps found by this cut (not fixable in the project)**
- A stagger `from: "center"` counts along the target list, not the grid. The cascade here is choreographed by hand.
- The overlap audit doesn't know a punch-cut has already swapped scenes (the infos above).
- The gate catches neither text set outside `<Safe>` nor glyphs colliding between tightly led lines. The critic found both by eye.

**Fixed in the engine during this cut.** Both are in commit d72e47b.
- Line-mask presets now travel by the text's leading in v2 kits. At broadside's 0.88 leading, a sliver of every line showed at frame 0.
- Blurred pushes and whips now feather both sides of the seam. It stayed razor sharp at peak speed.


## History

- #5 vs #8 → **#8** — Both orders agree: #8 (byte-identical sources to #7) wins every frame that differs — proof beat at display size vs h1, wordmark in frame under the punch vs CO clipped at x=0, tiles mirror the real scenes; hook/write/blind/end-settled equal. One regression: FRAME,/CHECKED. comma collision. 4.0 vs 3.8, both 0 gate errors.
- #8 vs #10 → **#10** — Both orders agree: #10 wins check (comma clears CHECKED. by 17px vs touching) and end (card inside social safe, x 104-914 vs 137-947 in the UI rail); hook/write identical, blind/eyes equal at pack scale. 4.6 vs 4.0, both 0 gate errors.
- #10 vs #12 → **#12** — Both packs identical at all 8 sample points (none lands in the 7.48–8.0 tile cascade). The only difference is the critic's remaining fix: at 7.60 #10 shows t1/t2/t5 in and the right column empty (list stagger inside each call); #12 opens centre column → top corners → bottom corners, symmetric (stills 011→012 t-7.600/7.700, ct timeline 0.65/0.70/0.75). Gate 0/0 both; #12 also passed --deep and rendered with clean QC.
