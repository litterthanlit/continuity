# Scene transitions: best practice for Continuity v2 (2026-10)

Research behind the v2 transition library (`src/motion/transitions.ts`, `src/motion/fx.ts`, ADR 0005).
Library/spec/API facts come from primary docs and source. Claims about what specific brands "really
do" come from secondary sources or craft knowledge and are marked **[unverified]** — frame-by-frame
breakdowns of Linear/Vercel/Stripe/Apple films are not public.

## 1. Catalog

Frames at 30fps (double for 60). "Implementation" is what a deterministic, seeked DOM renderer needs.

| Transition | Looks like / when | Duration · ease | Implementation |
|---|---|---|---|
| **Hard cut** (on beat / on action) | The premium default for punchy beats. Cut-on-action: cut at the fastest movement | 0 | Scene swap |
| **Punch cut** (Remotion `pushCut`) | Hard edit with a tiny punch-in each side and a faint flash. Editorial | ~11f; out ease-in scale 1→1.04, in ease-out 1.04→1.07 (we settle to 1); flash ≈0.2 for 2f | Scale + overlay |
| **Match / graphic match** | Same shape/position/velocity across the cut. School of Motion: 12f move → cut on f6, pick up on f7 | 0–10f | Both scenes place an anchor at the same rect & velocity |
| **Shared-element morph** (Magic Move, Smart Animate, FLIP) | An element persists and transforms. Unmatched content fades | 0.5–0.8s · standard/hero | Measure both rects, animate translate+scale; clip-path for aspect changes. *P1* |
| **Type-driven** | Word scales until its counter fills the frame; media in letterforms; baseline line-wipes | 0.35–0.9s, exponential scale | SVG text masks / `clip-path: path()`. *P1* |
| **Mask / shape wipe** (edge, diagonal, iris, logo, rounded-rect) | Clean, graphic; needs a feather or motion blur to feel premium | 0.4–0.7s · inOut | `clip-path` / `mask-image` gradients, 8–20% feather. Iris radius must reach the farthest corner |
| **Card → fullscreen** (container transform) | UI card expands into the next scene | 0.6–0.8s | `clip-path: inset(round r)` from the card rect. *P1* |
| **Zoom-through / dive** | Push into a UI element; next scene is "inside" | 0.6–1.0s; scale = exp(k·t) (linear scale feels like it decelerates) | Scale about the target; cross at 55–65%. *P1* |
| **Whip pan** | Fast directional move with heavy directional blur; the camera does the transition (Linear films, per secondary source) [unverified] | 6–12f · strong in-out | Translate both scenes; blur peaks mid; swap hidden at peak velocity |
| **Push / slide / parallax / deck** | Sequential steps; Remotion slide epsilon avoids a seam | 0.4–0.6s | translate (+ depth-scaled offsets) |
| **Blur dissolve / focus pull** | Calm, premium | 0.5–0.9s · sine | Keep outgoing opaque; fade incoming — two half-opacity layers dip in brightness |
| **Light leak / gradient sweep** | Luminous band crossing the cut (Remotion `LightLeak` overlay) | 0.5–0.8s | Overlay layer, `plus-lighter`/`screen` |
| **Strips / venetian / grid** | Staggered reveal; high-energy accent | 0.3–0.5s, 20–40ms stagger | clip-path per strip, per-cell eased progress |
| **Glitch / RGB split / dither** | Rare accent only | 4–8f | channel copies / pixel pass |
| **3D flip / cube** | Dated (PowerPoint default) [judgement] | 0.6s | CSS 3D — avoid |
| **Morphing gradient as continuity** | Persistent background; cuts only swap foreground (Stripe-like) | whole video | Global stage layer. *Follow-up* |

## 2. Craft that makes it premium

1. **Velocity continuity** — cut at peak velocity, resume with the same vector (School of Motion, match cuts).
2. **Hide the swap inside the motion** — whips/dives swap at 45–55% of progress where speed and blur peak
   (Remotion blur-slide crossfades over 0.3–0.7).
3. **Asymmetric curves** — exit accelerates, enter decelerates, overlapped (Material).
4. **Restraint** — at most one overshoot; never bounce full-frame moves.
5. **Sound** — the hit lands on the first frame of the new shot; whooshes start a few frames before.
6. **Beat sync** — frames/beat = 60/BPM × fps; cut on 2/4/8-beat phrases, tolerance ±2–4f.

## 3. Code libraries — what we borrowed

- **Remotion `@remotion/transitions`**: `TransitionSeries` overlaps both scenes; total = Σ scenes − Σ
  transitions (same as our overlap model). Presentations are pure `(progress, direction)` components;
  timing is separate (`springTiming`, `linearTiming`). `Overlay` adds a layer on the cut without changing
  timing → our `<id>.fx` layer.
- **Motion Canvas / Revideo**: transitions run at the start of the incoming scene; `zoomIn(area: BBox)`
  is the right shape for a rect-driven dive (P1).
- **Framer Motion `layoutId`, GSAP Flip, View Transitions API**: pair by name, morph the group box,
  cross-fade contents; parent/child flips must not compound. Seam for P1 `sharedMorph`.
- **Remotion shader presentations** (zoomBlur, crossZoom, …) need HTML-in-canvas (Chrome 149+ flag) —
  not available in our pinned Chrome 141.

## 4. Motion blur

- SVG `feGaussianBlur stdDeviation="sx sy"` blurs one axis; widen the filter region so streaks aren't
  clipped; the attribute is animatable.
- Real motion blur is a box over `L = v · shutter`. Gaussian stand-in: σ ≈ 0.29·L. At a 180° shutter
  (L = 0.5·v px/frame): **σ ≈ 0.144·v**.
- Remotion `CameraMotionBlur` averages 5–10 sub-frame copies with blend modes (colour loss). A
  deterministic seeker could capture sub-frames and average in linear light (future work).
- AE conventions: 180° shutter, −90° phase.

## 5. Numbers

| Item | Guideline |
|---|---|
| Durations by energy | Calm 0.5–0.8s (sine); medium 0.3–0.5s (power2/3); high 0.15–0.3s (power4/expo) |
| Material | fade 150/75ms; container transform 300/250ms; shared axis 300ms (UI scale) |
| Exits | 60–75% of the matching entrance |
| Transition language | One primary type for ~60–70% of cuts + 1–2 accents. Never a different transition every cut |
| Easing pairs | exit ease-in, enter ease-out, overlapped; mismatched curves look rough |
| Curves | expo-out (.16,1,.3,1), inOut (.65,0,.35,1), emphasized-decel (.05,.7,.1,1), emphasized-accel (.3,0,.8,.15), easeInOutQuint (.83,0,.17,1), easeOutQuint (.22,1,.36,1) |
| Hold | scenes resolve before the transition starts (read time `max(0.83, chars/17 + 0.4)`) |
| When not to | hard cuts are the default for punchy beats; transition only where it carries meaning |
| Direction | keep one direction of travel through a sequence |
| 9:16 | shorter (8–12f), vertical axis |

## 6. Anti-patterns that read as template in 2026

A different transition per cut · 50/50 dissolves of unrelated frames · bounce on full-frame moves ·
zooms between spatially unrelated scenes · default 3D cube/page flip · glitch as an "edgy" default ·
hard-edged wipes with no feather and linear easing · fast moves without motion blur (strobing) · fade to
black between every scene · transitions longer than the content hold · flash+zoom+blur+whoosh stacked ·
light leaks on every cut · easing mismatch between outgoing and incoming.

## 7. What v2 ships (P0) and what waits (P1)

P0 (this change): `push` (+dir, +blur), `whip`, `punchCut`, `blur` (opaque-outgoing dissolve), `wipe`
(+dir/angle/feather), `iris`, `strips`, `lightSweep`, plus the existing `cut`, `crossfade`, `dip`,
`pushUp`, `zoom`.

P1 (needs an element-rect registry measured in the runtime): `sharedMorph`, `cardExpand`, `dive`,
`typePortal`; stage layer for gradient continuity; sub-frame motion blur at render time.

**Transition languages** (one per video):
1. **Swiss cuts** — cut / punchCut for ~90%, feathered wipe at chapter breaks.
2. **Camera-first product** (Linear/Vercel/Raycast) — push with blur, whip, zoom into detail, iris to focus.
3. **Luminous** (Apple/Stripe energy) — blur dissolve, one lightSweep, crossfade on the same surface.
4. **Kinetic / social punch** (9:16) — cut on the beat + two of punchCut, whip (vertical), strips.

## Sources

Read: remotion.dev/docs (transitions/transitionseries, presentations custom/slide/iris/dreamy-zoom,
timings/springtiming, transitioning, light-leaks, motion-blur, camera-motion-blur, html-in-canvas),
remotion.dev/transitions, github.com/remotion-dev/remotion packages/transitions/src/presentations (wipe,
flip, slide, zoom-blur, push-cut, linear-blur, swap, blur-slide, cross-zoom), motioncanvas.io/docs/
transitions, Revideo transitions API, MDN View Transition API, developer.chrome.com view-transitions,
gsap.com Flip docs, help.figma.com Smart Animate, material-components-android Motion.md,
schoolofmotion.com (six essential transitions; match cuts), motiondesign.school (exponential scale),
getlago.com/blog/we-killed-our-motion-design-job, WICG/html-in-canvas, gl-transitions,
skills.sh/heygen-com/hyperframes/transitions, github.com/heygen-com/hyperframes, theatrejs.com,
vercel.com/blog (Ship platform), charlie947/motion-graphics-skills (apple-launch-film),
famouscampaigns.com (MacBook Neo film craft).

Search summaries only: Keynote Magic Move help, Framer layout animations, whip-pan tutorials
(photofocus, provideocoalition), Codrops SVG motion blur (403), MDN stdDeviation, shutter-angle threads
(Adobe, Maxon, Wipster), beat-sync and whoosh guidance (sonilo, pixflow), `plus-lighter` cross-fade
(dev.to, w3.org CSS archive), flixier anti-patterns, Material choreography, Tumult forum, Rive state
machine docs.

Not verifiable: brand-specific transition breakdowns (Linear, Vercel, Stripe, Raycast, Arc, Cursor,
Apple), studio practice (Buck, ManvsMachine, Ordinary Folk, DixonBaxi), easings.net control points
(quoted from memory).
