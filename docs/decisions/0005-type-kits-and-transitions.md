# 0005 — v2 look: type kits, variable-axis motion, transition presentations

**Status:** accepted · 2026-10-10

## Context

Every Continuity video looked alike: Inter Tight / Geist + Geist Mono + a one-word Instrument
Serif italic, and eight scene transitions that were plain tweens on the scene root (`inset()` clips
only). Research into what top product brands and motion studios ship in 2026
(`docs/research/2026-10-type-kits.md`, `docs/research/2026-10-transitions.md`) points to curated
serif/grotesk/mono pairings, variable-axis type motion, and a small, consistent *transition
language* per video built from feathered masks, motion-blurred camera moves and luminous overlays.

## Decisions

### 1. Type kits are orthogonal to colour themes
`src/themes/kits.ts`: six kits — `swiss`, `atelier`, `wonk`, `terminal`, `broadside`, `flexion` —
each a set of roles (display, sans, mono, serif) with weight, width, variation axes and case, plus
label tracking, an x-height-matched serif accent, a figures role and per-size tracking/leading.
A storyboard picks one (`type`); a scene may override it (scoped CSS, for chapter breaks and
galleries); a brand `theme.ts` may pin one (`defineTheme(…, { type })`, `defineKit()`). The
storyboard wins over the theme. All families are OFL, exact-pinned `@fontsource*` packages; the
registry records each file's real axes, ranges and `tnum` support, and a test reads the woff2s to
keep it honest.

### 2. Kits reach CSS through role rules in `@layer components`
Variables (`--font-*`, per-size tracking/leading) go in `@theme static` (or under
`[data-ct-type]` for a scene kit). Role rules (`.font-display`, `.ct-label`, `.ct-accent`…) sit in
the components layer: after preflight, before utilities — so an author's `font-bold` or
`tracking-*` still wins. v2 kits turn `font-synthesis` off; the probe reports any weight, style or
width a family doesn't ship (`font-face-missing`) and counters set without tabular figures
(`counter-proportional`). The dead Inter `ss01/cv11` settings are dropped for v2 kits (the vendored
latin subsets carry no stylistic sets).

### 3. Existing projects render identically (`classic`)
Without a `type`, a build uses `classic`: the theme's own fonts, the v1 component classes and no
role CSS. Builds of every pre-v2 project are byte-identical, and the `_smoke` golden is unchanged.
`ct new` writes the theme's suggested kit, so new work starts in v2.

### 4. Variable font axes are motion channels
`wght` → font-weight, `wdth` → font-stretch (the @font-face declares the width range, or Chrome
clamps it), `opsz` and `soft` → font-variation-settings, merged at runtime over the element's
settled settings (so animating SOFT keeps the kit's WONK). Each animated element's settled values
come from its kit role and classes at build time (`SceneTimeline.bases`), so `from: null` and
loops start from the real face. WONK is never animated (fractional values swap glyphs).

### 5. Transitions are a table of presentations
`TRANSITION_DEFS` (description, default duration, craft range, params, layers, `build()`) drives
the build, the schema, lint and the docs. Shape reveals are one `fx` progress channel plus a static
`FxSpec` interpreted by a pure `fxStyle()` (feathered linear/radial masks, a staggered "skyline"
polygon). Directional motion blur is `blurX`/`blurY`, backed by per-element SVG `feGaussianBlur`
filters created once in `prepare()`; σ follows the 180° shutter rule (≈ 0.144 × peak px/frame,
capped at 6% of the travel) and the filter is skipped near zero. Overlays (a punch-cut flash, a
light band) are real DOM layers the incoming scene grows only when its transition needs them
(`<id>.reveal`, `<id>.fx` — reserved ids). The incoming scene stays on top. Legacy
`{type, duration}` transitions produce exactly the v1 tweens (characterization snapshot); `blur`
was kept as-is because it already keeps the outgoing scene opaque.

### 6. The transition language is linted on the storyboard
`lintStoryboard()` (also `ct lint --storyboard`): `transition-language` (> 2 types besides cuts),
`transition-too-long/-short` (per-type craft range, replacing the flat 1s cap),
`transition-bounce` (spring on a full-frame move), `transition-strobe` (pushes over 200px/frame
without blur). The schema rejects params a type doesn't take and overlapping in/out transitions.

## Consequences

- The npm install grows by ~6 MB (eight font packages); builds copy only the faces their kits use.
- Whip/push blur frames cost an SVG blur pass on a full-frame layer; the `_transitions` draft
  render ran at ~12 fps vs ~19 fps for `_type` (4 workers). Acceptable; a CSS-blur fallback is the
  escape hatch if it ever matters.
- The engine hash changed (it covers `src/themes`, `src/motion`…): old iteration snapshots read as
  a different engine.
- Seams for P1 transitions (not built): an element-rect registry measured in `prepare()` would
  let `origin` name an element and enable sharedMorph/FLIP, cardExpand, dive and typePortal; a
  `zOrder` flag for out-on-top presentations; a persistent stage layer for gradient continuity;
  sub-frame motion blur at render time.
- Galleries: `projects/_type`, `projects/_transitions`, with goldens and a kit cascade contract
  test (`tests/fixtures/kit-cascade`).
