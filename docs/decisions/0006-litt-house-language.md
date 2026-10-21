# 0006 — litt is the house language

**Status:** accepted · 2026-10-21 · supersedes the looks in 0005 (the mechanisms stay)

## Context

Continuity shipped three colour themes (a violet aurora, an editorial paper, a purple-blue mesh),
six type kits (serif, condensed caps, wonky, mono-led…), bouncy springs, light sweeps, gradient
text and a serif accent word. The result was a capable toolbox with no point of view: every
video could look like any template.

litt.md is Nick's design language (`litterthanlit/litt.md`, profile v0.16): technical precision,
lit from above. Nick asked for continuity to get "the litt pass" and chose, for each open
translation question:

- **Scope: replace.** The off-language looks go. One house language, no opt-ins.
- **Type: translated restraint.** Video needs one display step; everything else stays litt.
- **Motion: video-translated.** litt's tiers and bounds, material static, and the camera's slow
  push as the only ambient life.

This record is the translation table. litt's rules are written for web UI at 1×; a 1080p frame
is read from across a room, after H.264. Where litt names a number, the video number is below.

## The scale rule

**Chrome is litt at 2×.** Everything that is UI or structure doubles: the 8px grid becomes 16
(8 inside components), 1px hairlines become 2px, the 4px control radius becomes 8 and the 8px
surface radius 16, the 16px travel becomes 32, the 44px control becomes 88. Scene typography is
the one exception and has its own scale (below), because a video's statement must read at a
glance.

## Decisions

### 1. Two themes, both first-class (P8)
`litt-dark` (the `ct new` default) and `litt-light`, with litt's tokens copied from
`tokens.css`: warm stone neutrals on OKLCH hue ~60, cobalt accent, success/warning/danger, five
data hues (blue, amber, teal, violet, rose) with `-text` and `-tint` tones. The colour vocabulary
is litt's own names, so a class reads the same in both systems: `bg-canvas`, `bg-surface-1..3`,
`border-line`, `border-line-strong`, `text-fg`, `text-fg-muted`, `text-fg-subtle`,
`bg-accent`, `text-accent-text`, `bg-data-blue-tint`… Material strengths are tuned per theme
(light 12% / 22%, glow 28% / 40%, grain 0.02 / 0.04, glass, highlight, shadows), never derived.
A brand `theme.ts` overrides the accent through `defineTheme` (litt: one accent per project).

### 2. Material: solid, lit, grain (P1–P5)
`Stage bg`: `solid` (default) or `lit` — litt's one light source, an accent-tinted elliptical
radial anchored above the top edge, fading out by 65%. Use it once or twice per video, on the
hero and maybe the end card. Grain is litt's static noise at plain opacity (no blend mode). The
aurora, mesh, spotlight, grid and dots backgrounds are gone (Q7 and Q11 in the profile are still
open; texture returns only if Nick answers them). Depth is litt's: cards in the flow are flat
(`shadow-raised`: the hairline plus the top highlight), floating surfaces get a zero-offset glow
plus a ring (`shadow-float`, `shadow-modal`, `shadow-tooltip`), the one primary action gets
`shadow-glow`. Nothing has an offset shadow. Glass (`ct-glass`) is only for floating UI (a toast,
a menu) with content behind it.

### 3. One type kit: `litt` (P9)
Geist for everything, Geist Mono for code, keys, ids, versions and numbers in tables. Weight by
role and nothing else: text 400, titles 500 (`font-title`), labels 600 at the label step only
(`font-label`). No serif, no italic accent, no uppercase, no letter-spaced labels: labels are
sentence case. The kit mechanism (`TypeKit`, `defineKit`, scene `type`) stays for brand tweaks;
the registry is Geist, Geist Mono and the symbol fallbacks, so there is nothing else to reach for.

| Step | 16:9 / 1:1 | 9:16 | Weight | Use |
|---|---|---|---|---|
| `display` | 112 / 112 · −0.04em | 112 / 112 | 500 | The one statement of a scene. One per scene |
| `title` | 48 / 56 · −0.025em | 56 / 64 | 500 | A title in a lockup, a feature name, a big stat label's partner |
| `body` | 36 / 48 · −0.01em | 40 / 52 | 400 | Supporting copy, in the grey |
| `small` | 30 / 40 · −0.005em | 36 / 48 | 400 | Captions, meta |
| `label` | 28 / 36 · 0 | 34 / 44 | 600 | A label over a title, in the grey, sentence case |

Line heights are whole pixels. The portrait column exists because the probe's legibility floor is
34px in 9:16 (26px otherwise); the build picks it from the aspect, so components never branch.
Hierarchy comes from weight and the two inks first (a 500 title in `fg` over 400 text in the
grey), then space (tight lockups, wide gaps), and only then from the one size step to `display`.

### 4. Motion: litt's tiers, as springs of visual time and bounce
A spring ease can now be written the way litt (and Motion, and Framer) define it:
`{ type: "spring", visual, bounce }`, converted with Motion's formula (stiffness
`(2π / 1.2·visual)²`, damping `2·(1 − bounce)·√stiffness`). Tokens:

| Token | What | Settles | Use |
|---|---|---|---|
| `instant` / ease `out` | 0.1s tween, cubic-bezier(0.25, 0.46, 0.45, 0.94) | 0.1s | ink steps, a press, a toggle, opacity on small UI |
| ease `responsive` | spring, visual 0.2s, bounce 0 | ~0.35s | copy, rows, chips, cascades, the gliding highlight, the default |
| ease `expressive` | spring, visual 0.35s, bounce 0.12 | ~0.58s | the scene's one moment: the statement, the product placed |
| exits | 0.75× the entrance's visual time, ease `out`, never a bounce | 0.15s / 0.26s | exit presets derive it from the element's entrance |
| `slow` 0.6 · `linger` 1.4 · ease `inOut` | video only: the eye and the hand | | a camera focus move, a cursor leg, a chart drawing, a counter |

Stagger 40ms between siblings (`list`, `grid`, `word`), 80ms between lines, 20ms between
characters. Travel 32px (litt's 16 at 2×); menus and tooltips a quarter. Press scale 0.98.

**Transform and opacity animate**, plus three video channels with a job: masks and clips
(revealing a line from its baseline, a chart from its axis), `draw` and `counter` (data), and
the new **`ink`** channel — 0 is the grey, 1 is `fg` — at the instant tier, because in litt rank
comes from ink. Nothing material animates: no loops on the backdrop, no glow, no light sweep,
no sheen, no pulse. Ambient life is the camera's slow push (≤ 3% over the scene); a loop is a
lint warning unless it is a caret blink. Because litt's frames are left-aligned, `m.camera`
takes an `origin` (px): the push holds the statement's left edge still instead of scaling about
the frame centre, so the type never drifts and snaps back on a cut.

**Presets.** Enter: `fade`, `rise`, `slideLeft`, `slideRight`, `settle` (rises by travel from
0.98, the expressive moment — "placed, not thrown"), `maskUp`, `grow` (bars from the baseline),
`wipeRight` (a chart's reveal), `draw`, `typeOn`. Exit: `fadeOut`, `liftOut`, `dropOut`,
`maskOut`, `scaleOut`. Emphasis: `ink` (to fg), `dim` (to the grey), `press`.

### 5. Transitions: one language
`cut` on the beat is the primary. Accents: `crossfade` (the same surface in a new state), `dip`
(a chapter break, to the canvas), `push` / `pushUp` (sequential steps, in reading direction,
motion blur when fast), `wipe` (a feathered state reveal). The lint keeps ≤ 2 types besides cuts.
Whip, punch cut, iris, strips, light sweep, blur and zoom are gone: each one performs.

### 6. The kit at video scale
Every UI component is rebuilt from litt's `system/components.md` at 2×: Window and Browser
(solid surface-1, the raised edge plus a float glow, neutral window dots, never colour on
chrome), Card (flat, raised), Button (primary = the one accent fill with `shadow-glow`;
secondary; ghost; sm/md/lg = 64/88/112), Tag (the raised segment's look, status as a coloured
word, category as a data-hue tint, never a dot), Kbd, Input (with a focus caret), Toggle (fills
with `fg`, never the accent), Meter, Toast (glass), Avatar (identity is a data hue), Sidebar (the
current item is P12's raised segment), Segmented, List (status in words), CodeBlock (litt's quiet
highlighting), Terminal, BarChart (fg at 55%, the current bar in fg, square tops), LineChart (a
2×-hairline line, no area), Stat (label above value, tabular, delta in words), Cursor (a zero-
offset shadow). Removed: `Serif`, `Accent`, `GradientText`, `Highlight`, `Glow`, `Sheen`,
`Eyebrow` (now `Label`), `Subhead` (now `Body`), `Pill` (now `Tag`), `Progress` (now `Meter`).

### 7. The taste is gated
Timeline lint adds `spring-bounce`, `exit-bounce`, `expressive-budget` (one per scene),
`material-motion` (anything animating the backdrop or a filter), `property-motion` (a channel
outside transform, opacity, ink, masks and data), `travel-too-far`, `camera-drift` (an ambient
push over 3%) and `ambient-loop`. The source scan adds the `litt-*` rules: weights outside the
roles, uppercase, gradients, off-scale radii, offset or ad-hoc shadows, accent-coloured text and
hex colours in scene code. A deliberate exception carries `litt-allow: <rule>` and a reason on
the line or the one above.

## Consequences

- Every project re-renders: the examples and galleries were rebuilt on the new kit, and the
  goldens were regenerated. There is no `classic` path any more.
- The npm install drops nine font packages; the registry is Geist, Geist Mono and the symbols.
- The engine hash changed, so older iteration snapshots read as a different engine.
- litt.md is the source of taste. When its tokens or rules change, this record and
  `src/themes/index.ts` change with them; the profile's open questions (Q1 labels, Q7 texture,
  Q8 the page light, Q11 editorial structure, Q12 which theme first) are open here too.
