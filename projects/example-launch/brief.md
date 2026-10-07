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
- **Tone & references:** Linear / Vercel / Raycast launch films: dark, precise, calm
  confidence, one violet accent, hairline UI, generous negative space, product UI as the
  hero. Show the product doing things; don't just state claims.
- **Brand constraints:** theme `mono-dark`. Display face Inter Tight; serif italic accent
  (Instrument Serif) allowed for one emphasis word per line at most.
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
- **Accent = the theme's own violet** (`mono-dark` accent `#8b7bff`), so no `theme.ts` is needed.
  Green (`positive`) and red (`danger`) appear only as UI status colors in the gate moment.
  They are signals, not a second brand accent.
- **What counts as copy:** `storyboard.text` holds every line the viewer is meant to *read*
  (headlines, chapter labels, the pipeline steps, the CTA), budgeted at 12 words or fewer per scene. UI mock
  data (terminal lines, list rows, axis labels, chart pills) is *imagery*. It is written
  verbatim in each element's `note` so the builders use exactly that text, and it follows the
  kit's ui-glance rule instead of the read-time rule.
- **The UI shows this film's own production.** The storyboard rows, beat lanes, contact-sheet
  thumbnails and critique scores all describe *this* video, so every fake number is real
  and the data stays on message.
- **The project slug on screen is `launch`.** The terminal types `pnpm ct check launch`, not
  `example-launch`: it reads better and types faster at video scale.
- **Parallel scene-builders are implied, not shown.** The studio pipeline is shown as
  Plan → Check → Measure → Critique → Ship. A separate "build" chapter would push the cut past
  35s without serving one of the six must-say ideas.
- **The serif-italic swap is used twice, as a pair:** "*see*" in the hook (it goes out of
  focus) and "*eyes*" in the turn (the answer). Nowhere else, so it stays a motif and does not
  become a tic.
