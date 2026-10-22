---
name: social-clip
description: Short, shareable motion clips for X and social feeds in litt (5–15s loops, the form behind most viral motion-design posts) — the one-line claim first, frame one already mid-action, one reveal, a 30–50% hold, a clean loop, the machinery on screen (cursor, code, a slider, the real tool), before → after as a depth swap, template-then-swap, tactile objects in litt's terms, and the caption that ships with it. The storyboard's `loop: true` turns on the loop gates. Load with motion-craft and typography for any short clip meant to be posted rather than presented.
---

# Social clips, in litt

A clip on X is judged in the first frame and remembered for one idea. The evidence (13 recent
motion posts ranked by likes, reposts and views — Higgsfield, Benji Taylor, Jhey, Emil
Kowalski, Josh Puckett, Ayush Soni, mrdoob, Chris Reath and others):

- **The idea beats the craft.** The top post (3.26M views) was a claim — "ChatGPT can now do
  motion design in After Effects" — with solid, ordinary motion as the proof. News plus proof wins.
- **Show the thing working in the real tool.** Code beside the phone, real panels, a slider
  being dragged. Viewers trust motion they can see being made — and can steal something.
- **Short and loopable for pure craft.** The craft hits run 4.8–14.3s: one move, then a hold
  that makes the loop feel finished. The long ones are launches, demos or tutorials.
- **Tactile gets shared.** Jhey's peelable stickers had the most reposts of any craft clip.
- **No intro, ever.** Every craft post starts mid-action at frame one.

This skill is the *form*. The *look* is litt (`motion-craft`, `typography`); the *energy* is
the register — most craft clips are `calm` with the glide ease; a burst reveal (a chat answer
exploding into a grid of slides) is an `energetic` scene. A loop can be either.

## 1. Write the claim first
One sentence a stranger cares about, before any storyboard: "Safari makes your site look
terrible — here's the fix", "One slider turns a skeleton into a sheet". If the clip can't be
described that way, don't animate it yet. The claim goes in the storyboard as `caption` (plus a
link to the live demo or the how-to); the video is the evidence. Copy on screen stays minimal —
the caption carries the words.

## 2. The storyboard
```jsonc
{
  "format": { "aspect": "1:1", "fps": 30 },   // 1:1 or 4:5 for the feed; 16:9 when the machinery is a wide tool
  "loop": true,                               // turns on loop-open, loop-hold, loop-length
  "caption": "Skeletons tell people to wait. A sheet tells them it's ready. (demo + code in thread)",
  "scenes": [{ "id": "swap", "duration": 5, "beats": [{ "id": "drag", "at": 0.1 }, { "id": "swap", "at": 1.1 }] }]
}
```
Usually **one scene**: build-up 1–2s → the reveal → the hold. Two or three scenes only for a
template swap (§7) or a mode switch.

## 3. The rules (each one gated or checkable)
1. **Frame one must be interesting** (`loop-open`, `slow-open`). No fade from black, no logo,
   no empty canvas waiting for an entrance. Put the *before* state or the subject mid-move on
   screen at t = 0 — elements that are there from the start simply have no `enter`. The first
   motion (a press, a drag) within 0.1–0.4s.
2. **One reveal per clip.** Build for 1–2s, reveal, hold. In calm the reveal is the scene's one
   expressive moment (or the glide swap); everything else supports it.
3. **5–15s** (`loop-length`). Longer is a launch film or a tutorial — drop `loop`.
4. **Hold 30–50% of the clip on the final state** (`loop-hold`), so the loop reads as finished
   and the viewer can study it. `dead-air` leaves a loop's closing hold alone; a camera drift is
   optional, not required.
5. **Make it loop.** The last frame cuts cleanly back to frame one: either a true cycle (the end
   state *is* the start state) or a before → after whose cut back to "before" reads as *again*.
   Never fade out at the end; never exit everything before the seam.
6. **Ease by role.** A surface that arrives and rests (a sheet, a panel, a phone stepping
   forward): `ease: "glide"` — cubic-bezier(0.32, 0.72, 0, 1), the iOS sheet curve, fast start
   and a very long soft stop — with `duration: "glide"` (0.45s; 400–500ms). Something you can
   grab: a spring with slight overshoot (`expressive` in calm, `pop` in energetic). A hand
   dragging: `inOut`. Typing and machines: `linear`.
7. **Stagger groups 1–3 frames** (`stagger: 0.033–0.1`) so items settle at slightly different
   moments — Benji's slides fly out of one thumbnail into a grid, each landing a beat apart.

## 4. Show the machinery
Offer a version with the making visible — it is the most reliable credibility signal:
- **A slider being dragged** while the thing it drives answers: `<Slider ct label value>` with
  `<Cursor>` already on its thumb at frame one (recipe: `motion-craft/recipes.md` → the slider).
- **Code beside the result** (Emil): `<Window>` + `<CodeBlock>` on the left, the `<Phone>` on the
  right; change a line (ink-step the edited token, type the new value), the result replays.
- **The real tool panel**: a `<Window>` styled as the tool, keyframes or a timeline in it.
- **A cursor that acts**: grab, drag, release, leave (`m.click`, `m.path`; hide it when idle).

## 5. Before → after, as a depth swap
Before-and-after beats after alone: show the problem for a beat, then fix it — never with a
fade. The before steps back (x away, scale 0.86, a small `rotateY` tilt, dimmed to ~0.55) while
the after steps forward over it on `glide`; both in one move, under a second; then hold.
Give the pair a parent with `perspective` (`style="perspective:1600px"`) so the tilt reads as
depth. Recipe: `motion-craft/recipes.md` → before → after. Gallery: `projects/_clip`.

## 6. Tactile, in litt's terms
Material beats shape — but litt's material is static light (P5), so translate touch into
motion, not surface effects:
- **Lift**: grabbed things scale to ~1.03 and their zero-offset glow grows (a `shadow-lift`
  layer's opacity 0 → 1) — the litt version of "the shadow grows on lift". Set down: back on
  the responsive spring.
- **Press** (`m.emphasize(id, "press")`), **grab and drag** with the cursor, **settle** with a
  spring that overshoots a little.
- Holo foil shimmer, glitter, sheen sweeps, a paper curl and offset drop shadows are outside
  litt (`material-motion`, `litt-shadow`). If the clip *is* a material toy, say so in the brief:
  that is a deliberate exception with `litt-allow` and a reason, not a default.

## 7. Template, then swap
Keep the layout fixed and change content, title and colour *together* on each beat — six
flavours, one template. Build the template once as a `lib/` function; each beat is a scene (or
a state) that passes new content. In litt, colour that changes per variant is **identity**, so
it comes from the data hues in order (P11: a category takes a hue), never arbitrary brand
colours. Swap on cuts, or a `wipe`; no iris.

## 8. Formats that spread
| Format | Shape | Example |
|---|---|---|
| Claim + proof | the caption says it, the clip proves it in the real tool | Higgsfield's AE launch |
| Before → after | problem for a beat, depth swap, hold | Josh Puckett, 4.8s |
| One reveal burst | a quiet prompt, then one thing explodes into many (energetic scene) | Benji Taylor, 8.3s |
| Machinery | split screen: the parameter and the result | Emil Kowalski, 14.3s |
| Template swap | one layout, N variants | Swirl's six flavours |
| Toy | something you want to touch, with a live demo link | Jhey's stickers |

Also: process content (a talk, a breakdown) and reference lists spread for the maker and the
method, not the motion — worth knowing when picking what to post.

## 9. Anti-patterns
1. A logo sting, a fade from black, or an empty first frame.
2. Two reveals competing; a "tour" with no single idea.
3. A clip that ends on an exit or a fade — the loop seam shows.
4. A 2s hold on a 12s clip (the reveal never gets studied), or 70% hold on a 5s clip (no build).
5. Motion with no claim: beautiful, vague, ignored (short alone isn't enough).
6. Fake machinery: a slider that moves while nothing answers it.
7. A colour swap per variant from outside the data hues.

## Checklist (critique, for `loop: true` clips)
**C1** the caption states a claim a stranger cares about · **C2** frame one is a real state, motion
by 0.4s · **C3** one reveal · **C4** 5–15s · **C5** 30–50% final hold · **C6** the seam is clean
(cycle, or the cut back to "before" reads as again) · **C7** the machinery answers (where shown) ·
**C8** groups staggered 1–3 frames · **C9** surfaces arrive on glide, grabbable things spring.
