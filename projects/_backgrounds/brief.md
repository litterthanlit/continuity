# Backgrounds gallery (reference)

Backdrops are one flat colour or a bold moving field, never a faint wash (docs/decisions/0011).
This gallery shows every backdrop once:

1. **a → b** — two scenes on `bg="gradient" gradient="aurora"`, joined by a plain cut. The field
   is a function of global time with one seed per preset, so it flows straight through the cut.
2. **solid** — one flat colour: the canvas.
3. **accent**, **aurora**, **ember** — the three presets, each under a label in `fg` ink.
4. **glass** — three `<Card glass>` panels floating over `aurora`: the field blurs through them.
5. **glass → carry → portal** — the field under a cut on movement (`carry`, left), then the camera
   goes through a glass tile (`portal`) into the same field, full frame.

Judge from the rendered MP4, not stills: banding and motion only show after encoding. Frames at
the middle of each scene, 1 s apart in `accent` and `ember`, either side of the carry's cut
(16.967 / 17.0) and the portal's midpoint (19.55). This is a reference reel, not a film.
