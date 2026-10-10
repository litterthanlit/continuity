# Scene authoring API

Generated catalog of presets, tokens, transitions and lint rules (always in sync
with the code): `reference/catalog.md` (`npx ct docs` regenerates it).

## Scene file contract

`projects/<slug>/scenes/<sceneId>.tsx` — file name = storyboard scene id.

```tsx
import { scene, Stage, Safe, Center, Stack, Eyebrow, Headline, Accent } from "continuity";

export default scene({
  // Static layout, rendered ONCE to HTML at build time. No state, no effects.
  view: ({ text, portrait, theme, width, height }) => (
    <Stage bg="aurora">
      <Safe zone={portrait ? "social" : "title"}>
        <Center>
          <Stack gap={24} class="items-center">
            <Eyebrow ct="eyebrow">{text.eyebrow}</Eyebrow>
            <Headline ct="headline" size="display">
              Ship <Accent>motion</Accent>, not mockups.
            </Headline>
          </Stack>
        </Center>
      </Safe>
    </Stage>
  ),
  // Motion as data. Times are scene-local.
  motion: (m) => {
    m.enter("eyebrow", "fadeBlur", { at: "b1" });
    m.enter("headline", "maskUp", { at: "b1+0.12", split: "lines" });
    m.camera({ scale: [1, 1.03] });
  },
});
```

`ctx` (view & motion 2nd arg): `id, text, aspect, width, height, portrait,
landscape, square, theme, typeKit, beats, duration, index, total`.

Styling: Tailwind v4 classes. Theme tokens are utilities:
- colors `bg-bg text-fg text-muted text-subtle bg-surface bg-surface-2 border-border text-accent bg-accent text-accent-2 text-accent-fg text-positive …`
- fonts `font-display font-sans font-mono font-serif` — the **type kit's** roles
  (storyboard `type`; see the `typography` skill). In v2 kits the role classes
  carry weight, width, axes and case; explicit utilities (`font-bold`,
  `tracking-[…]`, `font-stretch-75%`) still win.
- type scale (px at 1080 short side, with tuned leading/tracking):
  `text-mega 240 · text-display 168 · text-h1 120 · text-h2 88 · text-h3 64 · text-lead 48 · text-body 38 · text-caption 30 · text-micro 26`
- radius `rounded-sm/md/lg/xl`, shadows `shadow-glow shadow-float`
- CSS vars available inline: `var(--color-accent)` etc.

**Rule:** motion owns `transform`, `opacity`, `filter`, `clip-path`, `mask-image`,
`letter-spacing`, `font-weight`, `font-stretch` and `font-variation-settings` on
`ct` elements it animates. Position with layout (flex/grid/absolute
`left/top`), not Tailwind `translate-*`/`scale-*`/`rotate-*` on animated nodes —
wrap in a parent if you need both.

## Kit components

Layout
- `<Stage bg? grain?>` — every view's root. `bg`: `solid aurora grid dots spotlight mesh none` (default from theme). Background is animatable as `bg`.
- `<Safe zone="title|action|social|none">` — inset content area.
- `<Center>`, `<Stack gap>`, `<Row gap>` — flex helpers (accept `ct`, `class`).
- `<El as="div" ct="…">` — any element with an id.
- `<Glow ct? color="accent|accent-2|fg" size x y opacity>` — soft light blob.
- `<Path ct d viewBox width height stroke strokeWidth>` — SVG stroke for the `draw` preset.

Type
- `<Headline size="mega|display|h1|h2|h3" as="h1">` — the kit's display role (weight/width/case from the kit), balanced.
- `<Subhead size="lead">`, `<Body>`, `<Caption>`, `<Eyebrow>` (the kit's mono label: caps, tracked).
- Inline: `<Accent>`, `<Serif>` (italic serif accent, x-height matched by the kit), `<GradientText>`, `<Highlight ct>` (marker bar `ct-bar`, animate with `emphasize("<ct>-bar","underline")`).
- `<Fit ct max min>` — single-line text auto-fit to container width at load.
- `<Counter ct from decimals prefix suffix>` + `m.counter(ct, { to })`.

Product UI (video-scale: all text ≥ 26px; sub-parts expose `<ct>-…` ids)
- `<Window ct title width height glass?>` (body `<ct>-body`) · `<Browser ct url>` (`<ct>-url`, `<ct>-body`) · `<Phone ct width>` (`<ct>-screen`)
- `<Card ct glow? glass?>` · `<Button variant="primary|secondary|ghost">` · `<Pill dot>` · `<Kbd>` · `<Avatar initials>`
- `<Input ct value placeholder>` → type `<ct>-text`, blink `<ct>-caret` · `<Toggle ct>` → `<ct>-knob` x 0→36, `<ct>-on` opacity · `<Progress ct value>` → `<ct>-fill` scaleX
- `<Toast ct title body>` · `<Sidebar ct items active>` (`<ct>-i0…`) · `<List ct rows>` (`<ct>-r0…`)
- `<CodeBlock ct code>` (lines `<ct>-l0…`, highlighted) · `<Terminal ct lines>` (`<ct>-l0…`)
- `<BarChart ct data highlightIndex>` (bars `<ct>-b0…`, grow with `scaleY: [0, 1]`) · `<LineChart ct data>` (`<ct>-line` draw, `<ct>-area` fade) · `<Stat ct value label>` (+ `m.counter`)
- `<Cursor ct class="left-… top-…">` (+ `<ct>-ripple`) · `<Sheen ct>` light sweep (tween `xPct: [-160, 360]`)
- Kit UI roots carry `data-ct-ui`: their text is judged as UI imagery (`ui-glance`, ≥ 0.8s landed), not copy (`read-time`).
- Characters must exist in the vendored fonts (Latin + "CT Symbols/Arrows/Math" fallbacks: ✓ ✔ ❯ ◆ ⌘ ★ ● ■ ▲ ✕ → ← ↗ × ÷). Emoji are rejected (`glyph-missing`) — draw icons as SVG.

## Motion DSL (`m`)

Timing (`at`): seconds · `"b1"` · `"b1+0.2"` · `"end-0.6"` · `"after:headline"`.

```ts
m.enter(targets, preset, { at, duration?, ease?, split?, stagger?, distance?, mask? })
m.exit(targets, preset, { … })
m.emphasize(targets, preset, { … })            // pulse glow nudge underline
m.tween(targets, { x: [from, to], opacity: 1 }, { at, duration, ease, kind?, split?, stagger? })
m.camera({ scale: [1, 1.04], x: [0, -40] }, { at?, duration?, ease? })  // whole-scene camera
m.loop(target, { y: 8, rotate: 1.5 }, { period: 6, phase?, at?, until? })  // ambient sine
m.counter(target, { from?, to, at, duration?, decimals?, prefix?, suffix? })
m.path("cursor", [{ x: -280, y: -330 }, { x: 40, y: 10, hold: 0.3 }], { at })   // waypoints, px offsets
m.click("cursor", { at })                                   // press + ripple
m.type("search-text", { at, cps: 22 })                      // typeOn by chars
m.blink("search-caret", { at, until })                      // soft caret blink
m.time(at) → seconds · m.endOf(id) → seconds
```

- `targets`: one id or an array (auto-staggered by `list`, override with `stagger`).
- `split: "chars" | "words" | "lines"` animates parts; default stagger
  `char/word/line`; mask presets add an overflow mask automatically.
- `stagger`: token, seconds, or `{ each, from: "start|end|center|edges" }`.
- Props: `x y (px) xPct yPct (% of own size) z scale scaleX scaleY rotate rotateX rotateY skewX opacity blur brightness saturate clipTop clipRight clipBottom clipLeft (% inset) tracking (em) draw (0..1) counter`
  · font axes `wght wdth (%) opsz soft` (start from the element's kit values; split or nowrap the text)
  · `blurX blurY` (px, directional motion blur) · `fx` (0..1 progress of a tween's shape mask — used by transitions).
- `[from, to]` or just `to` (inherits the current value).
- `allow: ["rule-id"]` silences a lint rule for that tween — justify in a comment.

Reserved ids per scene: `scene` (the scene root; used by transitions),
`camera` (wrapper used by `m.camera`), and `reveal` / `fx` (layers some
transitions add: a mask wrapper and an overlay). Using them in a view is a
build error (`reserved-id`).

## Storyboard (`storyboard.json`)

```json
{
  "title": "…", "logline": "…",
  "format": { "aspect": "16:9 | 9:16 | 1:1 | 4:5", "fps": 30 },
  "theme": "mono-dark | light-editorial | vivid-gradient",
  "type": "swiss | atelier | wonk | terminal | broadside | flexion",
  "bpm": 120,
  "scenes": [{
    "id": "hook", "duration": 2.8, "intent": "…",
    "beats": [{ "id": "b1", "at": 0.2, "note": "headline lands" }],
    "text": { "headline": "…" },
    "elements": [{ "id": "headline", "role": "headline", "anchor": "B2:E3" }],
    "motion": "director notes for the builder",
    "transition": { "type": "push", "dir": "left", "blur": true },
    "type": "(optional) a scene's own kit — chapter breaks and galleries only"
  }]
}
```
Scene `duration` includes the outgoing transition overlap; the next scene starts
`duration − transition.duration` later. A scene's incoming and outgoing
transitions must fit inside it together.

Transition params (validated per type; `duration` defaults per type):
`ease` (token or `[x1,y1,x2,y2]`) · `dir` (`left|right|up|down`: push, whip,
strips, wipe; lightSweep left/right) · `angle` + `feather` (wipe) · `origin
{x,y}` % + `feather` (iris) · `n` + `stagger` s (strips) · `blur` (push/whip:
`true` = speed-matched, number = σ px, `false`) · `color` (lightSweep: `accent
accent-2 fg white`) · `flash` 0–0.5 (punchCut). Types, defaults and ranges:
`catalog.md` → Scene transitions.

## Custom brand theme

`projects/<slug>/theme.ts`:
```ts
import { defineTheme } from "continuity";
export default defineTheme("mono-dark", { colors: { accent: "#ff5a1f" } });
```
A brand kit: `defineTheme("mono-dark", { type: defineKit("swiss", { roles: { display: { weight: 700 } } }) })`
(families come from the registry: `import { fonts } from "continuity"`). The
storyboard's `type` wins over a theme's `type`.
