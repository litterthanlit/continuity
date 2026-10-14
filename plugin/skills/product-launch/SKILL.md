---
name: product-launch
description: Product launch / feature announcement videos (Linear, Vercel, Stripe, Raycast style) — narrative structure, UI choreography with the video-scale UI kit, cursor acting, data reveals, device framing, pacing and copy. Load with motion-craft when the video shows a product or interface.
---

# Product launch videos

The product is the hero; motion explains it. Every move should answer "what does
this let me do?" — never decorate.

## Structure (20–60s, 16:9)
1. **Cold open (0–3s):** the problem or the promise in one line, or a striking
   product moment. First motion ≤ 0.2s.
2. **Reveal (3–8s):** the product appears — window/device rises and settles with a
   slight 3D tilt resolving to flat. Name it.
3. **Features (3 × 4–7s):** ONE feature per scene: a headline (≤ 6 words) + the UI
   doing that one thing. Show, then tell — UI action first, label after.
4. **Proof (3–5s):** a number, a logo row, a quote, or a before/after.
5. **End card (3–4s):** logo/wordmark, one-line promise, CTA (URL or "Available
   today"). Hold ≥ 1.5s.

## UI at video scale
- Real UIs are illegible on video. Rebuild them at ~1.75×, simplified: the kit
  components already use ≥ 26px text, big hit targets, few rows.
- Show 3–6 rows/cards, not 30. Fake data should be plausible and on-message.
- One UI surface per scene; use camera moves to go deeper rather than cramming.

## Choreography patterns
| Moment | Pattern |
|---|---|
| Product reveal | `enter(window, "rise", { distance: 80–120, duration: "hero" })` + `tween(window, { rotateX: [10, 0] }, ease "enter")` |
| Content loads | container lands first, then rows/cards cascade (`stagger: "list"`) starting at `after:window-0.3` |
| Focus a region | `m.camera({ scale: [1, 1.25], x: […], y: […] }, { ease: "inOut", duration: 0.9–1.4 })` — zoom TO the thing, hold, then act |
| Cursor acting | `m.path` with eased legs (`slow`/`hero`), **pause 150–300ms before clicking** (hold), `m.click`, then the UI responds within 100–200ms |
| Typing | `m.type(id, { cps: 18–24 })` + caret `m.blink`; results appear after typing ends |
| Toggle / state change | knob `x` with `snappy`, track overlay opacity with `standard` |
| Data | numbers count (`m.counter`, `linger`), bars grow `scaleY: [0, 1]` staggered, lines draw (`draw`), highlight the winner bar/point last |
| Chart + playhead | reveal the chart with `wipeRight` on a wrapper, not `draw`: `draw` advances along the path *length*, so on a zig-zag the tip lags a playhead moving in x; a wipe tracks x exactly (same start/duration/ease as the playhead `x` tween) |
| Notification / success | `Toast` rises with `snappy` after the action that caused it |
| Premium sheen | `Sheen` sweep across a card once, after it lands |

Cursor acting rules: never teleport; move in eased legs; travel ≤ ~900px per leg;
the cursor enters from an edge or fades in near its first target; hide it when
it has nothing to do.

## Framing
- Device/window at 70–85% of the frame width when it's the hero; 50–60% when
  it shares the frame with a headline (headline left, UI right, or headline
  above).
- Depth: floating cards at slightly different scales/blur; soft shadow
  (`shadow-float`); subtle `rotateY` (−8…−14°) for a 3/4 view, resolved before
  the viewer must read anything.
- Backgrounds stay quiet behind UI (`grid`, `spotlight`, low-contrast `aurora`).
- Type kit (see `typography`): `swiss` for most products (Geist, Vercel/Linear
  grade); `terminal` for dev tools, CLIs and APIs; `atelier` when the brand is
  editorial/AI; `wonk` for warm consumer products.

## Copy
Headline = benefit, not feature ("Ship reviews in minutes", not "Review
module"). One supporting line max. Labels on UI are part of the picture and
must be on-message too.

## Pacing
Feature scenes 4–7s: ~1s headline in, ~2–4s UI action, ~1s hold. Transitions
follow the **camera-first** language: `push` with `blur: true` between features
(direction = reading order), one `whip` for the fast beat, `zoom` only into a
detail, `iris` (origin = the button) to focus, `crossfade` for the same surface
in a new state. A `lightSweep` into the logo end card, once. Everything else is
a cut.
