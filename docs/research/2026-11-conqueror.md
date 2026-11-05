# The Conqueror launch film, frame by frame

A 38.3s, 1280×720, 25fps launch film for Conqueror ("Claude Code for SEO"), posted 2 Nov 2026. The
launch devices in `projects/_launch` (retype, Cycle, NotificationStack, Ring, DotGrid, pixels,
pull-back, music stop) came from a written study of it. This is the film as checked on 5 Nov 2026,
from frames every 0.5s and the audio's loudness, with what the written study got wrong.

## Timeline

| Time | What happens |
|---|---|
| 0–3.3 | A blurred orange-and-black gradient mesh. "Introducing [logo + name] for SEO", small, with a selection box's four corner handles around the line. The slot flips through AI tools, each with its logo: Claude, Grok Bot, Codex, OpenClaw, Hermes. The line moves from the top to the centre at about 2.5s. |
| 3.3–3.6 | A pixel (dither) transition into the next scene. |
| 3.5–6.2 | An orange halftone landscape with a huge "Conqueror" wordmark behind a frosted search bar. "Just enter your website" types above it; the bar types a domain. At 4.5–5.3 the camera is in an extreme close-up on the field ("eld.ai" and the caret, filling the frame), then pulls back to the bar and its submit arrow. |
| 6.5–7.3 | Cut to white. "{ Your website }" between arrows; the braces close in to "{Your website is}" with selection handles. |
| 7.5–13.5 | "Your website is… [ending]", centred. Five endings, each typed (in the accent, then settling to ink) with a small UI above the line: ranking #1 (a Google search), adding $50k MRR (a payment notification), booking demos (a calendar), getting cited by AI (an AI answer card), building authority (a "Domain Rating" ring gauge counting 1 → 82 → 89). |
| 14.0–18.5 | The white frame zooms out to be the screen of a desktop monitor. Keyword rows cascade in with coloured tags, a column of "Conquer this keyword" buttons appears, the camera pushes in and tilts, and the brand orange floods in from the bottom-right corner. |
| 19.0–23.5 | Solid orange. "Agents are working…" types; a white "Keyword rankings" card with progress pills (building backlinks, writing 336 articles, updating posts, finding keywords) and #1 badges; then "Ranked #1 for 317 new keywords" types on the orange. |
| 24.0–27.0 | A macOS desktop over an anime night-city wallpaper: notifications stack in at the top right (traffic spike, 42 demos booked, deployment growing). |
| 27.5–30.5 | A phone, cropped by the top of the frame on a light grey ground: lock-screen payment notifications stack, grouped like iOS. |
| 31.0–33.5 | Light grey. A green contribution grid builds in a left-to-right wave, "Your coding looks like this"; under it a brand-red grid, "now your SEO looks like this". A dark vignette closes in from the bottom. |
| 34.0–36.5 | Black. A metallic 3D medallion (a Roman head); "conquerorapp.com" types under it with a caret. |
| 36.5–38.3 | Black. |

## What the written study got wrong

- **The music never stops.** It runs at -15 to -20 dB mean, dips once near 12s, and steps down to
  about -26 dB from 30s to the last frame. The end card is a quieter outro, not silence. `music.stop`
  is still a sound device, but it is not this film's.
- **Five endings, not four**, and the second is "adding $50k MRR". The sentence is centred with its UI
  above it, and each ending types in the accent before settling to ink.
- **The grid grows dots into squares**, not squares into circles: the wave's leading edge is small dots
  that swell into rounded squares. It is two grids, green then brand red, one above the other.
- **The intro's brackets are a selection box** (corner handles), and each tool name carries its logo.
- **The input scene** has a giant wordmark behind the bar and an extreme macro push onto the typed
  text before it pulls back; the study described only a search bar.
- **The pull-back is from white to a desktop monitor** (as described), and the phone in the reward beat
  bleeds off the top of the frame on purpose.

## Since built from it

The two corrections that change a device are open: `m.grid` has no dots-to-squares mode (DotGrid's
`dots` goes the other way), and the retype has no accent-then-ink settle on the typed ending.
