---
name: product-launch
description: Product launch / feature announcement videos in litt (Linear, Vercel, Stripe, Raycast lineage) — narrative structure, UI choreography with the video-scale litt UI kit, cursor acting, data reveals with colour that carries data, device framing, the light, pacing and copy. Load with motion-craft and typography when the video shows a product or interface.
---

# Product launch videos, in litt

The product is the hero; motion explains it. Every move answers "what does this let me do?" —
never decorates. litt's way: the product is placed, not thrown; the UI is precise and quiet;
colour appears only as light (the one primary action) or as data.

## Structure (20–60s, 16:9)
1. **Cold open (0–3s):** the problem or the promise in one line, or a striking product moment.
   First motion ≤ 0.2s.
2. **Reveal (3–8s):** the product is placed — the window `settle`s (the scene's one expressive
   moment) under the top light. Name it.
3. **Features (3 × 4–7s):** ONE feature per scene: a title (≤ 6 words) + the UI doing that one
   thing. Show, then tell — UI action first, the label after.
4. **Proof (3–5s):** a number (`Stat` with a delta in words), a logo row, a quote, a before/after.
5. **End card (3–4s):** the name, one line, the CTA. The one centered statement. Hold ≥ 1.5s.

## The UI kit is litt at 2×
- Real UIs are illegible on video, so the kit rebuilds litt's components at 2×: 28px UI text,
  88px controls, 2px hairlines, 8/16px radii (`src/kit/ui.tsx`; gallery: `projects/_kit`).
- Show 3–6 rows, not 30. Fake data plausible and on-message.
- One UI surface per scene; go deeper with the camera rather than cramming.
- **Colour stays off chrome (P11).** Window dots are neutral; nav, rows and borders are neutral.
  Status is a word (`Tag tone="success"`), never a dot. A category or a person takes a data hue
  (`Tag hue`, `Avatar`), in the fixed order. Charts are quiet: bars at fg 55% with the current
  one in fg, a line in fg; a data hue only when the series has a colour elsewhere.
- **Selected is a raised segment (P12):** the current nav item (`Sidebar active`) and a
  segmented control's selection (`Segmented`) wear surface-raised + hairline + highlight, never
  the accent, a dot or a weight change.
- **One accent fill per frame (P1):** the primary `Button` (with its glow) is the only one. A
  switch fills with fg, never the accent. Focus (a field's ring, the caret, the cursor's click
  ring) is the accent as light.
- **Depth (P4):** cards flat (`Card`, `shadow-raised`); windows and toasts float with a
  zero-offset glow and ring; the toast is glass because content passes behind it.

## Choreography patterns
| Moment | Pattern |
|---|---|
| Product placed | `enter(window, "settle")` — up 32px from 0.98 on the expressive spring. No tilt, no fly-in |
| Content loads | the container lands, then rows cascade `enter([...rows], "rise", { at: "after:window-0.3" })` (40ms) |
| Focus a region | `m.camera({ scale: [1, 1.2], x: […], y: […] }, { ease: "inOut", duration: 1.4–2 })` — zoom to the thing, hold, then act |
| Cursor acting | `m.path` in eased legs (`slow`), **pause 150–300ms before clicking**, `m.click`, then the UI answers within 100–200ms |
| Typing | `m.type(id, { cps: 18–24 })` + `m.blink(caret)` on a focused `Input`; results appear after typing ends |
| Toggle | knob `x 0→32` and the `-on` layers' opacity at the instant tier |
| Selection moves | a `Segmented` thumb `x` on the responsive spring + `ink`/`dim` on the labels |
| Data | `m.counter` (`linger`); bars `grow` from the baseline (40ms apart); a line `draw`s then its dot fades in; never animate the backdrop |
| Chart + playhead | reveal the chart with `wipeRight` on a wrapper (tracks x exactly), same start/duration/ease as the playhead's `x` |
| Confirmation | a `Toast` `rise`s (responsive) after the action that caused it |

Cursor acting rules: never teleport; eased legs ≤ ~900px; enter from an edge or fade in near
the first target; hide it when it has nothing to do.

## Framing
- The window at 70–85% of the frame width when it's the hero; 50–60% beside a title (title
  left on the safe edge, UI right — columns 1–5 and 7–12).
- The light (`bg="lit"`) falls on the reveal and maybe the end card; the feature scenes sit on
  the solid canvas so the UI reads.
- No 3D tilts or perspective flourishes; depth is surfaces stepping and the zero-offset float.
  (One exception: a before → after depth swap in a short clip, where the *before* tilts ≤ 16° as
  it steps back — `social-clip` §5.)
- Ambient life is the camera's ≤ 3% push; never floating cards or breathing glows.

## Posting it: the clip cut
A launch film is presented; its clip is posted. Cut a 5–15s loop from the strongest feature —
claim in the caption, frame one mid-action, the feature working in the real UI, one reveal, a
30–50% hold — with `"loop": true` (the `social-clip` skill). Show the machinery: the cursor, the
code, the slider.

## The energetic UI run (motion-craft §12)
A launch stays `calm`; a **brand reel or a recap** that shows product goes `energetic` — or a calm
launch gives one chapter to an energetic "UI run" (scene-level `register`). There the UI moves
like an interface, not like an object:
- Fast cuts and slide wipes between surfaces (`push`, `blur: true`, `ease: "steep"`, 0.3–0.4s;
  `wipe` with `ease: "steep"`), 1–2s per surface, then a ~1s hold.
- Panels and rows on `steep` with `duration: "snap"` (9 frames), staggered 1–3 frames; charts
  `draw` / bars `grow` on `steep`; search results stack row by row; a highlight block sweeps
  across the matched text (the selection-block recipe). Queries type on (`m.type`, linear).
- `pop` only for what acts like an object over the UI — a sticker, a badge, a marker — never
  for windows, rows or chrome.
- Surfaces sit on `bg="grid"`; screenshots of real product go in `Media` (`treat="none"` for
  your own UI, which is already in the palette).

## Copy
Title = benefit, not feature ("Ship reviews in minutes", not "Review module"). One supporting
line max, in the grey. Labels on UI are part of the picture and must be on-message too.
Sentence case everywhere.

## Pacing
Feature scenes 4–7s: ~1s title in, ~2–4s UI action, ~1s hold. Transitions: cuts on the beat
between features, or `push` with `blur: true` in reading order when the features are steps in
one flow; `crossfade` for the same surface in a new state; a `dip` before the end card. Two
accent types at most.
