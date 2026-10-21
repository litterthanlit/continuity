# Brief — example-launch

- **Product / subject:** Continuity — an open-source harness that lets AI coding agents make
  launch-quality motion design as code, and *check their own work*: a director plans the
  storyboard, scene-builders work in parallel, every frame is gated (layout, contrast,
  safe areas, type size, collisions), motion is measured (easing, settle, read time,
  dead air), and a critic scores each cut before it ships.
- **Audience:** design engineers, motion designers and AI tooling folks watching a launch
  post on X / a product page hero. They have seen a lot of sloppy "AI video".
- **The one thing they should remember:** Continuity gives agents a studio process and
  eyes — so what they make is good enough to ship.
- **Call to action:** "Open source" + the name. End card holds the wordmark and the line
  "Motion design, as code."
- **Format:** 16:9 · 1920×1080 · 30fps · ~30s (25–35s) · silent-first (works muted).
- **Tone & references:** Linear / Vercel / Raycast launch films, in litt (Continuity's house
  language, docs/decisions/0006): technical precision, lit from above. Dark, calm confidence,
  hairline UI, generous negative space, product UI as the hero. Show the product doing
  things; don't just state claims.
- **Brand constraints:** theme `litt-dark`, type kit `litt`. Continuity is a litt product, so
  litt's own cobalt accent is the accent (no `theme.ts`). Geist in three weights by role, Geist
  Mono for commands, ids and numbers. One display line per scene. Emphasis is by ink — the key
  word in fg, the rest in the grey — never a second colour, an italic or a serif.
- **Must-say ideas (copy is the director's call, keep it short):**
  1. Agents can write motion — they just can't *see* it.
  2. Plan before pixels (storyboard with beats).
  3. Eyes on every frame (contact sheet + gate catching a defect, then passing).
  4. Motion, measured (timeline/easing/rhythm, not vibes).
  5. A critic that scores every cut (5 axes) — only the best version ships.
  6. Continuity — Motion design, as code. Open source.
- **Must show:** the product's own artifacts as UI: a terminal running `pnpm ct check`,
  a storyboard/scene list, a contact sheet grid, a findings list going red → green,
  a motion-energy or timeline chart, critique scores. Use the UI kit (projects/_kit is
  the reference gallery).

## Assumptions (director)

- **No URL, no VO, no music.** The CTA is the word "Open source" plus the wordmark (the link lives
  in the post). The film is silent-first, so every idea is carried by type and UI, and the hook
  has to land in the first 2s of a muted autoplay. No `bpm`: cuts are placed on visual beats.
- **Accent = litt's cobalt, used the litt way.** It is light (the top light on the turn and the
  end card), focus (the caret, the focus ring on "Plan", the playhead) and the one fill: the
  end card's primary "Open source" button. Red and green appear only in the gate moment and
  the verdicts, as status words in tags (and the one danger mark on the sheet): signals, not
  a second brand colour. No data hue is needed: nothing in the film is a category that recurs.
- **What counts as copy:** `storyboard.text` holds every line the viewer is meant to *read*
  (statements, chapter labels, the pipeline stations, the CTA), budgeted at 12 words or fewer
  per scene. UI mock data (terminal lines, list rows, axis labels, tags) is *imagery*. It is
  written verbatim in each element's `note` so the builders use exactly that text, and it
  follows the kit's ui-glance rule instead of the read-time rule.
- **The UI shows this film's own production.** The storyboard rows, beat lanes, contact-sheet
  thumbnails, frame count, running time and energy axis are read from `storyboard.json`
  (`lib/film.ts`), so every fake number is real and stays true when scenes are retimed.
- **The project slug on screen is `launch`.** The terminal types `pnpm ct check launch`, not
  `example-launch`: it reads better and types faster at video scale.
- **Parallel scene-builders are implied, not shown.** The studio pipeline is shown as
  Plan → Check → Measure → Critique → Ship. A separate "build" chapter would push the cut past
  35s without serving one of the six must-say ideas.
- **The ink motif is used twice, as a pair:** the hook ends with only "see" in fg (everything
  else steps back to the grey), and the turn lights "eyes." the same way (the answer). The
  hook's two lines are one statement in one display block, broken by meaning.
