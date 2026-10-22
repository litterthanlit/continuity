# Scene authoring API

Generated catalog of presets, tokens, transitions and lint rules (always in sync
with the code): `reference/catalog.md` (`npx ct docs` regenerates it). The look is
litt (`docs/decisions/0006`); the `typography` and `motion-craft` skills explain
the taste behind every token below.

## Scene file contract

`projects/<slug>/scenes/<sceneId>.tsx` — file name = storyboard scene id.

```tsx
import { scene, Stage, Safe, Stack, Label, Headline, Body } from "continuity";

export default scene({
  // Static layout, rendered ONCE to HTML at build time. No state, no effects.
  view: ({ text, portrait }) => (
    <Stage bg="lit">
      <Safe zone={portrait ? "social" : "title"}>
        <Stack gap={32} class="absolute bottom-[96px] left-[96px] max-w-[1120px]">
          <Stack gap={8}>
            <Label ct="label">{text.label}</Label>
            <Headline ct="headline">{text.headline}</Headline>
          </Stack>
          <Body ct="body">{text.body}</Body>
        </Stack>
      </Safe>
    </Stage>
  ),
  // Motion as data. Times are scene-local.
  motion: (m) => {
    m.enter("label", "fade", { at: "b1" });
    m.enter("headline", "maskUp", { at: "b1+0.08", split: "lines", ease: "expressive" });
    m.enter("body", "rise", { at: "after:headline-0.2" });
    m.camera({ scale: [1, 1.03] });
  },
});
```

`ctx` (view & motion 2nd arg): `id, text, aspect, width, height, portrait,
landscape, square, theme, typeKit, beats, duration, index, total`.

Styling: Tailwind v4 classes. litt's tokens are utilities (the same names as litt.md's own
Tailwind layer):
- colour `bg-canvas bg-surface-1 bg-surface-2 bg-surface-3 border-line border-line-strong
  text-fg text-fg-muted text-fg-subtle text-fg-disabled bg-accent text-accent-fg text-accent-text
  bg-accent-tint bg-focus text-success text-warning text-danger`, data hues
  `bg-data-{blue,amber,teal,violet,rose}` (marks), `text-data-<hue>-text` (words),
  `bg-data-<hue>-tint` (fills behind words). Opacity modifiers work: `bg-fg/12`.
- fonts `font-display font-sans font-mono` (Geist 500 / Geist 400 / Geist Mono 400) and weights
  by role `font-normal` (400) `font-title` (500) `font-label` (600). Nothing else (`litt-weight`).
- type scale `text-display text-title text-body text-small text-label` (112 / 48 / 36 / 30 / 28
  at the 1080 short side; 9:16 gets 112 / 56 / 40 / 36 / 34 automatically).
- radius `rounded-control` (8) `rounded-surface` (16) `rounded-full` — nothing else (`litt-radius`).
- depth `shadow-raised` (cards: hairline + top highlight) `shadow-float` `shadow-modal`
  `shadow-tooltip` (floating: raised + zero-offset glow + ring) `shadow-lift` (the glow alone)
  `shadow-glow` (the one primary action) `shadow-hairline` `shadow-control` `shadow-field`
  `shadow-focus` — never an offset or ad-hoc shadow (`litt-shadow`).
- material classes `ct-lit` (the top light; prefer `<Stage bg="lit">`), `ct-grid` (the technical grid; prefer `<Stage bg="grid">`) and `ct-glass` (floating UI only).
- CSS vars inline: `var(--color-fg)` etc. No hex values in scene code (`litt-hex`).

**Rule:** motion owns `transform`, `opacity`, `color` (the ink channel), `filter`, `clip-path`,
`mask-image`, `letter-spacing`, `font-weight`, `font-stretch` and `font-variation-settings` on
`ct` elements it animates. Position with layout (flex/grid/absolute `left/top`), not Tailwind
`translate-*`/`scale-*`/`rotate-*` on animated nodes — wrap in a parent if you need both.

## Kit components

Layout
- `<Stage bg? grain?>` — every view's root. `bg`: `solid` (default) · `lit` (litt's one light,
  from the top — the hero, maybe the end card) · `grid` (a static 2px hairline grid, 96px cells,
  centred — collage and UI scenes in the energetic register) · `none`. Static: the backdrop never animates.
- `<Safe zone="title|action|social|none">` — inset content area.
- `<Center>` (one short statement, once per video), `<Stack gap>`, `<Row gap>` — flex helpers
  (gap defaults to 32, litt's block gap; use 8 for a lockup).
- `<El as="div" ct="…">` — any element with an id (spans for ink emphasis: `as="span"`).
- `<Path ct d viewBox width height stroke strokeWidth>` — SVG stroke for the `draw` preset (fg by default).

Type (litt: weight and ink by role)
- `<Headline>` — the display step, 500, fg, balanced. One per scene. `size` can step down to `title`.
- `<Title>` — the title step, 500, fg.
- `<Body>` — body, 400, the grey. `<Caption>` — small, 400, the grey.
- `<Label>` — the label step, 600, the grey, sentence case (8px above its title).
- `<Emph text word>{(w) => …}</Emph>` — treat one word of storyboard copy on its own (by ink).
- `<Fit ct max min>` — single-line auto-fit for variable data (never to fit more copy).
- `<Counter ct from decimals prefix suffix>` + `m.counter(ct, { to })` (tabular figures).

Product UI (litt's components at 2×; UI text ≥ 26px; sub-parts expose `<ct>-…` ids)
- `<Window ct title width height>` (body `<ct>-body`) · `<Browser ct url>` (`<ct>-url`, `<ct>-body`) · `<Phone ct width>` (`<ct>-screen`)
- `<Card ct>` (flat, raised) · `<Button variant="primary|secondary|ghost" size="sm|md|lg">` (primary = the one accent fill per frame) · `<Tag tone="neutral|success|warning|danger" hue?>` (status in words; a category takes a data hue) · `<Kbd>` · `<Avatar initials hue?>` (identity = a data hue)
- `<Input ct value placeholder focus?>` → type `<ct>-text`, blink `<ct>-caret` · `<Toggle ct on?>` → `<ct>-knob` x 0→32, `<ct>-on` + `<ct>-knob-on` opacity (instant) · `<Meter ct value hue?>` → `<ct>-fill` scaleX
- `<Segmented ct items active segment?>` — the selected segment raised (P12); move `<ct>-thumb` x by `segment`, `ink`/`dim` the labels `<ct>-s0…`
- `<Toast ct title body tone?>` (glass) · `<Sidebar ct items active heading?>` (`<ct>-i0…`; the current item is the raised segment) · `<List ct rows>` (`<ct>-r0…`; rows `{ title, meta?, tag?, tone? }`)
- `<CodeBlock ct code>` (lines `<ct>-l0…`, litt's quiet highlighting) · `<Terminal ct lines>` (`<ct>-l0…`)
- `<BarChart ct data current? hue?>` (bars `<ct>-b0…`, `grow` from the baseline; fg 55%, the current bar fg) · `<LineChart ct data hue?>` (`<ct>-line` draw, `<ct>-dot`) · `<Stat ct value label unit? delta? deltaTone? size?>` (label above, `<ct>-label`, `<ct>-delta`; + `m.counter`)
- `<Cursor ct class="left-… top-…">` (+ `<ct>-ripple`, the focus colour)
- `<Slider ct label? value display? width?>` — the machinery on screen: a label and its mono value
  (`<ct>-label`, `<ct>-value`) over a rail; drag it by moving `<ct>-fill` scaleX, `<ct>-thumb` x
  (value × width) and `m.counter("<ct>-value", …)` together

Imagery and annotation
- `<Media ct src width height treat? position?>` — an image in a strict container (radius 16, the
  raised edge, clipped). `src` is `assets/…`. `treat`: `mono` (default) · `contrast` · `invert` ·
  `none` — imported imagery is forced into the palette. The picture is `<ct>-img`: drift it inside
  its frame (`m.tween("tile-img", { scale: [1.06, 1] }, { duration: "linger", ease: "out" })`). Children
  render above the picture (markers, a Path).
- `<Marker ct label? side?>` — an annotation node: a 24px ring (`<ct>-ring`) with a numbered mono
  label on a canvas chip (`<ct>-label`). Absolutely placed by its centre (`class="left-[x] top-[y]"`);
  join markers with `<Path strokeWidth={2}>` and `draw` it.
- Kit UI roots carry `data-ct-ui`: their text is judged as UI imagery (`ui-glance`, ≥ 0.8s landed), not copy (`read-time`).
- Characters must exist in the vendored fonts (Latin + "CT Symbols/Arrows/Math" fallbacks: ✓ ✔ ❯ ◆ ⌘ ★ ● ■ ▲ ✕ → ← ↗ × ÷). Emoji are rejected (`glyph-missing`) — draw icons as SVG.

## Motion DSL (`m`)

Timing (`at`): seconds · `"b1"` · `"b1+0.2"` · `"end-0.6"` · `"after:headline"`.

```ts
m.enter(targets, preset, { at, duration?, ease?, split?, stagger?, distance?, mask? })
m.exit(targets, preset, { … })                  // 0.75× the entrance, ease out, no bounce
m.emphasize(targets, preset, { … })             // ink · dim · press
m.tween(targets, { x: [from, to], opacity: 1 }, { at, duration?, ease?, kind?, split?, stagger? })  // responsive spring by default
m.camera({ scale: [1, 1.03] }, { at?, duration?, ease?, origin?: { x, y } })   // whole-scene camera; ambient ≤ 3% (energetic 8%); origin (px) holds a point still
m.counter(target, { from?, to, at, duration?, decimals?, prefix?, suffix? })
m.path("cursor", [{ x: -272, y: -336 }, { x: 40, y: 16, hold: 0.3 }], { at })   // waypoints, px offsets
m.click("cursor", { at })                                   // press + focus ring
m.type("search-text", { at, cps: 22 })                      // typeOn by chars
m.blink("search-caret", { at, until })                      // caret blink — the one loop litt allows
m.loop(target, { rotate: 8 }, { period: 2 })                // a sine swing; warns (ambient-loop) — energetic: an info, for an object that swings
m.time(at) → seconds · m.endOf(id) → seconds
```

- `targets`: one id or an array (auto-staggered 40ms by `list`, override with `stagger`).
- `split: "chars" | "words" | "lines"` animates parts; default stagger `char/word/line`
  (20/40/80ms); mask presets add an overflow mask automatically.
- `stagger`: token, seconds, or `{ each, from: "start|end|center|edges" }`.
- Eases: `responsive` (spring, visual 0.2s, bounce 0 — the default), `expressive` (visual 0.35s,
  bounce 0.12 — one per scene), `out` (instant tier, exits), `inOut` (camera, cursor, playhead),
  `linear` (typing, a machine turning); energetic register: `steep` (cubic-bezier(0.87, 0, 0.13, 1) —
  interface and camera) and `pop` (spring, visual 0.3s, bounce 0.3 — things that act like objects);
  `glide` (cubic-bezier(0.32, 0.72, 0, 1) — a surface that arrives and rests: a sheet, a panel; every
  register); or `spring(visual, bounce)` (bounce ≤ 0.12 calm, ≤ 0.35 energetic).
- Durations: `instant` 0.1 · `responsive` 0.2 · `expressive` 0.35 · `exit` 0.26 · `slow` 0.6 ·
  `linger` 1.4 · `snap` 0.3 (energetic: a decisive move on `steep`) · `glide` 0.45 (with the glide ease). Springs take their own settle
  time unless you pass a duration.
- Props litt animates: `x y (px) xPct yPct scale scaleX scaleY rotate opacity`, `ink` (0 the
  grey → 1 fg), `clipTop clipRight clipBottom clipLeft (% inset)`, `draw (0..1)`, `counter`.
  The engine also has `z rotateX rotateY skewX blur brightness saturate tracking wght wdth opsz
  soft blurX blurY fx` — outside transform/opacity they warn (`property-motion`).
- `[from, to]` or just `to` (inherits the current value).
- `allow: ["rule-id"]` silences a lint rule for that tween — justify in a comment.

Reserved ids per scene: `scene` (the scene root; used by transitions), `camera` (wrapper used by
`m.camera`), `bg` (the backdrop — static), and `reveal` / `fx` (layers a transition may add).
Using them in a view is a build error (`reserved-id`).

## Storyboard (`storyboard.json`)

```json
{
  "title": "…", "logline": "…",
  "format": { "aspect": "16:9 | 9:16 | 1:1 | 4:5", "fps": 30 },
  "theme": "litt-dark | litt-light",
  "type": "litt",
  "register": "calm | energetic",
  "loop": true,
  "caption": "the claim that ships with a posted clip, + a link",
  "bpm": 120,
  "scenes": [{
    "id": "hook", "duration": 2.8, "intent": "…",
    "beats": [{ "id": "b1", "at": 0.2, "note": "the statement lands" }],
    "text": { "headline": "…" },
    "elements": [{ "id": "headline", "role": "headline", "anchor": "A4:D5" }],
    "motion": "director notes for the builder",
    "transition": { "type": "dip" },
    "register": "energetic"
  }]
}
```
Element roles: `headline title body label caption cta stat logo ui decor media`.
`register` (top level, default `calm`; a scene's own wins) sets the motion's energy and the lint
bounds — `catalog.md` → Registers, motion-craft §12. `loop: true` marks a clip meant to be posted
(X, social): `loop-open`, `loop-hold` and `loop-length` run, and the closing hold may be still
(the `social-clip` skill). `caption` is the post's text; `ct report` prints it.
Scene `duration` includes the outgoing transition overlap; the next scene starts
`duration − transition.duration` later. A scene's incoming and outgoing transitions must fit
inside it together.

Transition params (validated per type; `duration` defaults per type): `ease` (token or
`[x1,y1,x2,y2]`) · `dir` (`left|right|up|down`: push, wipe; `in|out`: depth) · `angle` + `feather` (wipe) ·
`blur` (push/pushUp: `true` = speed-matched, number = σ px, `false`). Types, defaults and
ranges: `catalog.md` → Scene transitions.

## Brand accent

litt has one accent per project; Litt's own is cobalt. For a client, `projects/<slug>/theme.ts`:
```ts
import { defineTheme } from "continuity";
export default defineTheme("litt-dark", {
  colors: { accent: "#…", "accent-text": "#…", "accent-tint": "#…", focus: "#…" },
});
```
Keep the accent a fill that reaches 3:1 on the canvas with `accent-fg` at 4.5:1 on it, and
`accent-text` at 4.5:1 on the canvas. The neutrals, type and material stay litt's. A brand kit
(`defineKit("litt", { roles: { display: { weight: 600 } } })`) exists for the rare brand that
needs it; families come from the registry (Geist, Geist Mono).
