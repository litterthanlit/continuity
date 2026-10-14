# Brief — example-litt

- **Product / subject:** Continuity, in the litt look. Continuity is an open-source harness in
  which AI agents write motion design as code, and a gate checks every frame (layout, contrast,
  type size, safe areas, easing, read time) before anything ships.
- **Audience:** design engineers and motion designers seeing the litt look for the first time,
  as a README example next to `example-launch` and `example-type`.
- **The one thing they should remember:** motion design written as code, and every frame of it
  checked: precise, quiet, provable.
- **Call to action:** end card with the name "Continuity", the line "Motion design, as code."
  and one primary button ("Get started") beside the mono command `npx ct init`.
- **Format:** 16:9 · 1920×1080 · 30fps · ~12–14s · silent-first (works muted).
- **Tone & references:** litt.md, "technical precision, lit from above". Linear/Vercel calm.
  Large Helvetica Now Display-style lowercase-friendly display type on near-black, generous
  negative space, left-aligned, one idea per scene. Do NOT use the reference frame's tagline
  ("new agent, same project"); the copy is Continuity's own.
- **Brand constraints:** theme `litt`, kit `litt` (Host Grotesk 400, Geist Mono for code and
  figures). One weight only. Sentence case. Never pick out a headline word in accent, italic
  or serif. At most one accent fill and one `shadow-glow` per view (the primary action). The
  `lit` backdrop, grain and glow never animate. Avoid the off-language UI parts: traffic-light
  `Window`/`Browser` dots, the `Toast` accent disc, the `Avatar` gradient.
- **Look:** colour theme `litt`, type kit `litt`, transition language **Lit precision**
  (crossfade 0.4 `standard`, one `dip` before the end card, cuts on the beat; one expressive
  `snappy` moment per scene; exits one duration token down with `standard`).
- **Must-say ideas (copy is the director's call, keep it short, ≤ 12 words on screen):**
  1. Motion design, written as code.
  2. Every frame, checked (a findings list resolving to "0 errors").
  3. Proof in numbers (stable facts only, e.g. 0 gate errors, 5 critique axes, the 26px type floor).
  4. Continuity — Motion design, as code.
- **Must show:** at least one product artifact as quiet UI (a findings list in a `Card` with a
  `Pill`, mono time stamps), built from `Card`, `List`, `Pill`, `Kbd`, `Button`.

## Assumptions (director)

- **Case.** Sentence case throughout. The CTA copy is fixed in sentence case ("Motion design, as code."), and one lowercase scene would split the voice.
- **Copy.** Scene copy is the director's: *Motion design, written as code.* / *Every frame, checked.* (findings: Overflow, Contrast, Easing) / *Measured, not guessed.* (5 critique axes, 26 px minimum type, 0 gate errors) / *Continuity, Motion design, as code., Get started, npx ct init.*
- **Facts.** The figures are stable properties of the product (five critique axes, the 26px legibility floor the gate enforces, the gate must report 0 errors to ship). Findings and their time stamps are illustrative, not a real run.
- **Audio.** None. The film works muted; no bpm grid, cuts land on UI beats.
- **Scene ids.** `hook`, `gate`, `proof`, `end` (`hook` keeps the file name `ct new` created).
