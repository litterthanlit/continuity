# Continuity — launch film

> For design engineers who have seen too much sloppy AI video: Continuity gives agents a studio process and eyes, so what they make is good enough to ship. Open source.

**Format:** 16:9 · 1920×1080 · 30fps · 32.9s · theme `litt-dark`

| # | Scene | In | Duration | Intent | Transition out |
|---|---|---|---|---|---|
| 1 | `hook` | 00:00.00 | 3.6s | Name the problem in one breath: agents can write motion, but they can't see it. | cut |
| 2 | `studio` | 00:03.60 | 4.4s | The turn: Continuity gives agents a studio process, and eyes. | portal |
| 3 | `plan` | 00:07.10 | 5s | Plan before pixels: the director writes a storyboard of scenes, copy and timed beats before any code. | carry |
| 4 | `check` | 00:12.10 | 7s | Eyes on every frame: the contact sheet shows a defect, the gate names it, the fix turns it green. | carry |
| 5 | `measure` | 00:19.10 | 4.6s | Motion, measured: rhythm, easing and dead air are numbers the agent checks, not vibes. | match |
| 6 | `critic` | 00:23.70 | 5s | A critic scores every cut on five axes, and only the best version ships. | match |
| 7 | `end` | 00:28.70 | 4.2s | Brand, promise, CTA: Continuity. Motion design, as code. Open source. | cut |

## Iteration #15 (best)

- Gate: ✅ pass — 0 errors, 0 warnings
- Critique: intent 4 · composition 4 · typography 5 · temporal 4 · craft 4 (mean 4.2)
- Render: `out/example-launch/example-launch-77e5bb2d4eac.mp4`
- Note: B2: layered carries + match v2 (flow benchmark)

![contact sheet](sheet.png)

### Critique

# Critique B2: example-launch (layered carries + match v2), independent critic

- Branch claude/kind-wozniak-vfwwac · HEAD e916070 · sources hash 77e5bb2d4eac
- Gate (iteration 15 findings.json): **0 errors · 0 warnings · 0 info** (B1 had 11 info on the portal's "Plan" ghost; gone).
  Render QC: one info, `frozen` 1.67s from 15.00s (check's deliberate red hold, same as B1).
- Draft: out/example-launch/example-launch-77e5bb2d4eac-draft.mp4 (32.90s, 987 frames, 30fps). B1's draft
  (out/example-launch/example-launch-572370c48198-draft.mp4) was already on disk, so no worktree render was needed.
- `ct motion`: active 68% · **0 dead zones · 0 jolts** · mean energy 0.76 (B1 0.68). The B1 signature "trough → pre-cut
  spike → post-cut spike" ×3 is gone. J3 is a broad ramp then a spike, J4 a bump then a spike, J5 a 1.1s plateau (one
  panel sliding through the cut), and J6 is a single full-height line at 28.70, the tallest event in the film, matched
  only by the hard cut into the cobalt field at J1 (3.60).
- Register: calm. Joins: J1 hook→studio `cut` @3.60 · J2 studio→plan `portal via plan` 7.10–8.00 ·
  J3 plan→check `carry left 12, layers` @12.10 · J4 check→measure `carry left 10, layers` @19.10 ·
  J5 measure→critic `match [chart→card]` 0.9s @23.70 · J6 critic→end `match [ships→cta]` 0.6s @28.70.
  The only accent is the portal. Match and carry count as cuts. There is no still cut left.

```
Scores: intent 4 · composition 4 · typography 5 · temporal 4 · craft 4   (mean 4.2)
litt: ✅ P1 P2 P4 P5 P6 P7 P9 P11 P12 Motion Tells · n/a P3
      (P6/P7 note: the chapter cameras still scale about the frame centre, so the edges drift: check's label settles
       at x≈70 and critic's card at x≈72 instead of 96. Tells note: the end card's aurora field is the house
       magenta→violet→blue preset. It is the nearest the film comes to the "purple-blue hero" tell.)
energetic: n/a (calm)
```

## Axis evidence

- **Intent 4.** The settled frames say the same thing as B1. The hook lands by 1.69s, one idea per chapter is shown as
  the product's own artifact, and the CTA is the one accent fill. New: the verdict's "Ships" tag *becomes* "Open source"
  (J6), and the motion chart *becomes* the score card (J5). That is semantic linking the edit now does for the copy,
  so "only the best version ships → open source" reads as one thought. Still docked: after the portal the rail is never
  revisited (Check, Measure, Critique and Ship are only "0N · Label" slides), and the see→"eyes." rhyme at J1 is
  carried by timing only.
- **Composition 4.** iterations/015/stills: plan and measure keep the split (lockup left, a 1024-wide surface right), check
  is stacked and dense (y≈60–1020, about 75% of the safe area), and critic is now mirrored: the card is at x 72–1123
  and the lockup at x 1224 (t-27.382). The mirror reads as a deliberate turn rather than a broken formula. The lockup is
  still left-aligned in its own column, and the frame stays airy. Docked for the same two B1 items, both unfixed. First,
  the camera drift: no `origin` on the chapter cameras, so the label is at x≈70 in t-17.732 and the card at x≈72 in
  t-27.382. Second, check's density.
- **Typography 5.** Geist 400/500/600 by role, two inks, one display line per scene in ≤ 2 lines, sentence-case labels,
  mono only for data, tabular score figures, and status as words. One nit in UI imagery remains: measure's axis labels
  read "studio plan" butted together at x≈950–1117 (t-21.612).
- **Temporal 4.** Lint-clean micro-timing. The J5 match is physically right, measured on full-res frames from the window's
  right edge:
  - into the cut, 1849 → 1840 → 1811 → 1763 → 1696 (23.2–23.6, t² from rest), then 1669 → 1639 → |cut| → 1611, a
    steady −27/−30/−28 px/frame;
  - out of the cut, the card at −31, −31, −29, −29, −28, −27, then an average of −24 (23.9–24.0), −19, −12 and −4,
    settling at x 95 by 24.6.
  - The speed only falls after the cut. There is no surge and no reversal, and the size goes from 1058 to 1064 to
    1025 wide. That is the reach rule working.

  The chapters no longer run on one clock. J3 is copy-led out, J4 is product-led out and copy-led in, and J5 is a
  1.4s continuous slide. Docked for three things:
  - (a) **Every carry has a zoom pump at the cut.** The outgoing plane scales up into the cut: plan's board goes from
    1054 to 1124 px wide over 11.80–12.07. The incoming plane starts about 15% oversize and shrinks to rest in 0.3s:
    check's sheet goes 1025 → 997 → 972 → 952 → 892 px over 12.10–12.40, about 50% zoom/s, far past the 15%/s
    camera bound. So the radial velocity flips sign on the cut frame. That flip is the root of the "speed mismatch":
    left of centre the shrink subtracts from the travel, and right of centre it adds.
  - (b) As a result, J3's incoming surfaces split. The sheet's left edge moves 26 → 22 → 21 px/frame while the
    terminal's moves 55 → 48 → 41 against the board's 34–44. J4 surges a little: the terminal leaves at 27–34 and
    the chart arrives at 44, 37, 32.
  - (c) J5 has a copy-free transit. Measure's lockup has gone by 23.54 and critic's label arrives at 24.45, so for
    0.9s the only thing on screen is a panel gliding across black. It moves, but there is nothing to read, and it is
    the longest copy-free stretch after the hook.
- **Craft 4** (B1: 4, a stronger 4). Material static, flat cards, one transition language (portal is the only accent),
  and no still cut. Join tally: element 2 (J2 portal, J6 match), place+speed 1 (J5), layered direction 2 (J3, J4),
  action 1 (J1), punctuation 0. B1 was element 1, action 1, direction 3, punctuation 1. The portal's "Plan" ghost is
  gone: at t7.100 the tile is a clean dark window. Docked for three things:
  - (a) J6's carrier is too small for its cut. A 110×56 px tag (about 0.3% of the frame) has to carry the eye across a
    full-frame jump from near-black to saturated aurora.
  - (b) The carry zoom pump above. It is visible as a "breath" on the cut frame of J3 and J4.
  - (c) The portal still flattens the cobalt field to a uniform blue from t7.5 (unchanged from B1).

## Per-join FLOW notes (frames in frames-B2-critic/)

**J1 hook→studio, cut @3.60. Unchanged from B1.** At t3.567 "see" sits alone in fg. t3.600 is one frame of empty
cobalt field. By t3.633 the label is in and the headline is breaking its mask. It is an action cut on the left edge;
the place is not carried ("eyes." lands at 4.6 at x≈320, y≈515). **Carries: an action (weakly).**

**J2 studio→plan, portal via plan, 7.10–8.00. Better than B1.** t7.000: "Plan" still in the focused tile. t7.100: the
tile is a clean dark pill (plan-word stepped out at 7.00–7.10), so there is no ghosted text over the thumbnail.
t7.2–7.4: the tile grows, with the thumbnail visible inside it. t7.5: "Check" and the headline fly past, huge.
t7.6–7.9: plan's first frame fills the screen from the bottom-left. t8.0: plan. Remaining weaknesses: the zoom is
off-axis (the via sits bottom-left) and the field flattens to flat blue mid-move. Very minor: the tile is blank for
about 3 frames before it starts to grow. **Carries: an element.**

**J3 plan→check, layered carry left @12.10. Much better than B1, but the cut frame jars.** t11.8–12.067: copy-led out.
"Plan before pixels." slides off the left edge ahead of the board, which is half off by 12.033. It reads as a real
wave, not a flat plane. t12.100 (cut): the sheet, already holding its nine frames, and the terminal, both in the lower
half (y≈390–1075). In B1 both were empty. Three problems:
1. The zoom pump. The board was growing into the cut; the incoming pair shrinks 15% in 0.3s.
2. The eye was on the board (upper right, centre ≈1230,540). It lands on the terminal's title bar, which shows only
   "$" until 12.6 (typing starts at b2 = 0.5).
3. The two surfaces go 22–26 vs 48–55 px/frame.

With blur at speed, this reads as a pull-back plus pan rather than two objects disagreeing. But the mass jump from
upper-right to bottom-across remains. **Carries: a direction, with a layered wave.**

**J4 check→measure, layered carry left @19.10. Better than B1.** t18.8–18.9: check's lockup exits first. t19.0–19.067:
the sheet and terminal slide left, the terminal's left edge at 990 → 963 → 929 (27–34 px/frame). t19.100 (cut):
"Motion, measured." is already on screen, motion-blurred and travelling in (headline x 298 → 259 → 225 → 196 → 106 by
19.4), with the chart trailing (1028 → 984 → 947 → 915). The playhead starts at 19.4. Copy carried *in*, mirroring J3.
This is the cleanest carry in the film. There is a small surge at the cut (34 → 44 px/frame, from the zoom pump), and
the place is loosely kept: a window on the right becomes a window on the right. **Carries: a direction, with copy leading in.**

**J5 measure→critic, match chart→card 0.9s @23.70. The best join in the film; reads as one object.** t23.2: the
lockup leaves left while the window starts to slide. t23.5–23.667: the window travels alone, accelerating
(48 → 67 px over 0.1s, then 27–30/frame). t23.700: at the same y (231–851), the same size (1058 → 1064 wide) and the
same speed, motion-blurred, the panel's insides swap. The title bar and plot become meter rows reading "0.0", and the
mean "0.0 / 5". t23.733–24.6: it keeps going and only slows, settling at x 95. The eye never leaves the object
(J5pair.png). The content swap is instant, but blur and unchanged chrome geometry hide it. "The measurement becomes
the score" is the right sentence. Costs: the mirrored layout, which I accept, and 0.9s with no copy (23.54 → 24.45).
**Carries: a place and a speed. B1 threw this identical geometry away.**

**J6 critic→end, match ships→cta 0.6s @28.70.** At t28.667 the "Ships" tag sits at x 965–1075, y 736–792, after a 2.0s
hold since its settle at 26.7. At t28.700 there is a hard cut to the full aurora field, with a dark "Open source" pill
in the tag's exact box (J6cut-crop.png). By 28.9–29.2 it has drifted about 85px to centre and turned accent-blue; the
wordmark settles at 29.35 and the tagline at 29.9. The place match is exact and the meaning is right. But the carrier
is tiny and probably not where the eye is: after a 2s hold, the eye sits on the headline or the 4.6 score. The cut is
read as a full-frame colour flash, the film's biggest single-frame change (motion chart spike at 28.70), and the pill
is discovered afterwards. B1's dip (fade 28.70–29.03, field rises, then the wordmark) was smoother but carried
nothing. In B2's favour: the hard cut black→field rhymes with J1's black→cobalt cut, so the film opens and closes its
argument the same way. Net: **a sidegrade, marginally worse in feel.** It is more meaningful than the dip, but the
carrier loses to the flash. **Carries: an element, in principle. In practice a hard cut.**

## Top fixes (max 5, highest impact first)

1. **[temporal/craft] carry engine, J3 @12.10 and J4 @19.10: the zoom pump.**
   - The outgoing plane scales up about 7% into the cut, and the incoming plane starts at about 1.15 and shrinks to
     1 over 0.3s (sheet 1025 → 892 px). The radial velocity flips at the cut, and objects left and right of centre
     move at 2× different speeds.
   - Fix in `src/motion/transitions.ts` `carry()`: on a solid stage (and on grain), drop the scale overscan. Paint the
     stage background on the viewport behind the translating plane, so no edge can show and the move is a pure
     translation.
   - If a scale is unavoidable (a field backdrop), hold it constant through the move: both sides at the same fixed
     overscan from the outgoing move's start to the incoming land, then release it after the scene has settled. Do
     not ramp it opposite ways across the cut.
   - Re-measure J3 afterwards: the sheet and terminal should both leave at the board's ~30 px/frame.
2. **[craft] critic→end @28.70: the carrier is too small for a full-frame change.**
   - Recommended: make it `{"type":"portal","via":"ships","duration":0.8}`. The tag holds a still crop of the end
     card's first frame (aurora plus the dark pill), so the colour arrives *through* the verdict, and the field grows
     out of the tag instead of flashing. The end card's `cta` starts at rest as the portal lands.
   - Accent budget: the portal is already the film's accent type, so the language stays at one.
   - Cheaper alternative: keep the match, but lead the eye there first. Give `ships` an `emphasize ink` or `press` at
     28.2 (instant), so the eye is on the tag when the cut lands.
3. **[craft] plan→check @12.10: the mass jump and the empty landing.**
   - The eye leaves the board at the upper right and lands on an empty terminal at the bottom right.
   - → Set check's `cmd-l0` typeOn `at: 0.1` (b2 0.5 → 0.1), so the terminal is typing on the cut frame.
   - → Consider raising check's surfaces by about 96px for the first 0.4s, or reordering the wave so the terminal
     leads. As it stands the sheet leads the incoming wave, but the eye arrives on the right.
4. **[temporal] measure→critic, 23.54–24.45: 0.9s without copy.**
   - → Bring critic's label in at b1 = 0.45 (as the card's speed falls below about 15 px/frame, around 24.15) and the
     headline mask at 0.6, instead of 0.75/0.9.
   - Or hold measure's lockup until 23.5 (`b4` 4.1 → 4.35) so it leaves just ahead of the cut.
   - Either way, keep the match's 0.9s.
5. **[composition] chapter cameras (plan, check, measure, critic): edges drift to x≈70–78.**
   - → Add `{ origin: { x: 96, y: 540 } }` to the copy-anchored scenes, and `x: 1824` on critic, whose card is the left
     element but whose copy column is on the right. Alternatively, cap the push at 1.015 on the split scenes. That
     resolves the implementer's worry about the surfaces overrunning the right edge.

## Keep (don't touch)

- **J5's chart→card match.** One panel, one speed (about 30 px/frame on both sides of the cut), only slowing, at the
  same y and size. It is the move that most directly answers "rigid", and it turns "measured" into "scored".
- **J3's copy-led exit and J4's copy-led entrance.** The two carries now differ in who leads, so the chapters stop
  reading as a carousel.
- **The portal through the now-clean Plan tile**, and the "Plan" ghost fix (gate info 11 → 0).
- **Incoming sides that arrive with content**: the sheet's frames from the cut, measure's copy on frame 0, and the
  playhead starting at +0.3.
- **The mirrored critic.** It is the honest consequence of the match's travel and reads as a turn of the page.
- **Ships → Open source as an idea.** Change the carrier (fix 2), not the pairing.

## Pairwise: B1 (iteration 12) vs B2 (iteration 15)

Method:
- Ran `npx ct compare example-launch 12 15` and read
  projects/example-launch/.continuity/iterations/015/compare-12-15/pack-ab.png and pack-ba.png in both orders.
- Compared B2's join frames (frames-B2-critic/) against B1's (frames-B1-critic/) for every join, at matched offsets.
  Speeds were measured on full-res frames with column-run detection.
- Both drafts were on disk, so no worktree was needed.

Per axis:
- **Settled packs (both orders):** identical except critic, which is mirrored in B2. Intent, typography and composition
  tie. The mirror is neutral to slightly positive; it breaks the template.
- **Temporal: B2.** The three-chapter metronome is broken: in B1, J3–J5 shared one exit/drift/lag envelope ×3, and in
  B2 each has its own shape. J5's velocity continuity is exact. The zoom pump is shared by both, since it is the same
  engine. B2's J3 split is smaller (sheet:terminal ratio ≈ 1:2.1 vs B1's 8–9 : 32–37 ≈ 1:3.9).
- **Craft: B2.** Element/place joins go from 1 to 3. J3's incoming side is full (B1's was empty), J4's copy rides in,
  J5 keeps the shared geometry (B1 emptied the slot and refilled it 270px right), and the portal ghost is gone. Against
  that, J6 trades a smooth dip for a hard flash.
- **Both orders agree: winner B2 (iteration 15).** Gate errors are 0 vs 0, so B2 may replace the best.
  Reason: "B2: J3/J4 layered carries differ (copy-led out / copy-led in) and land with content; J5 chart→card is one
  object at one speed through the cut; portal ghost gone; J6 sidegrade."

**Joins where B2 is worse than B1:** J6, marginally. The dip was a soft, carry-nothing breath. The hard cut's
full-frame black→aurora flash outweighs a 0.3%-of-frame carrier. J1 is identical. Every other join is better.

**Top 3 remaining flow problems in B2:**
1. The carry's centred zoom pump (+7% in, −15% out within 0.5s around the cut). It splits J3's surfaces 2× and gives
   J4 a small surge. This is an engine fix, not a project fix.
2. J6's carrier is too small to own a full-frame colour change, so the match reads as a hard cut.
3. J3's mass jump: from the board at the upper right to two windows across the bottom, with the eye landing on an
   empty "$" terminal. Also J5's 0.9s copy-free transit before critic's label.


## Frames read

- Contact sheet (`--anchors`): projects/example-launch/.continuity/iterations/015/sheet.png
- Motion chart: projects/example-launch/.continuity/iterations/015/motion.png
- Settled stills (iterations/015/stills/): t-1.792 hook, t-6.700 studio, t-10.453 plan, t-17.732 check, t-21.612 measure,
  t-27.382 critic, t-30.353 end
- Compare packs: projects/example-launch/.continuity/iterations/015/compare-12-15/pack-{ab,ba}.png

## History

- #8 vs #12 → **#12** — B1: joins carry a direction and an element (portal through Plan tile, entrance on the J1 cut, speed-matched carries) vs four identical slides; rest frames unchanged
- #13 vs #15 → **#15** — B2: distinct layered carries landing with content; J5 one object at one speed through the cut; portal ghost gone. Only J6 marginally worse (hard cut black→aurora, carrier too small)
