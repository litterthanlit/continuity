# 0006 — The litt look: two themes, a one-weight kit, a lit backdrop

**Status:** accepted · 2026-10-14

## Context

litt.md is Nick's design language, written as checkable rules (`skills/litt-md`, tokens v0.5):
*technical precision, lit from above.* Cool near-black and off-white neutrals, one accent used as
light rather than paint, one grotesk at weight 400, depth from a zero-offset glow and a 1px ring
instead of drop shadows, slight radius, and motion in three tiers with one expressive moment per
view. A reference frame ("new agent, same project") adds a Helvetica Now Display-style
display setting.

Continuity could only approximate this. `swiss` + `mono-dark` is the nearest look, but the
engine hard-wired the opposite of several litt rules: pill buttons, a 40px-offset drop shadow on
every floating surface, `font-semibold` buttons and medium-weight pills, no top-lit backdrop,
and no way to say "nothing above 400". Continuity ships only OFL fonts, so the
reference face needed a stand-in too.

## Decisions

### 1. Additive: new themes, a new kit, a new backdrop
`litt` (dark) and `litt-light` themes, the `litt` type kit (the seventh; `KIT_NAMES` grows), and
the `lit` value of `StageBackground`. Both themes pin `type: "litt"` and `suggestedType: "litt"`.
`ct new` still defaults to `mono-dark`; a project opts in with `--theme litt`. Nothing about the
three existing themes or six kits changes.

### 2. Optional theme knobs whose defaults are the legacy values, byte for byte
- `radius.control?` → `--radius-control` (unset: `calc(infinity * 1px)`, exactly what
  `rounded-full` computes) and `--radius-field` (unset: `radius.lg`). The UI kit's `Button` and
  `Browser` address bar move from `rounded-full` to `rounded-control`, `Input` from `rounded-lg`
  to `rounded-field`. Pills, `Toggle`, `Avatar` and dots stay `rounded-full`: litt allows pills
  for chips, status dots and avatars.
- `shadows?: { glow?, float? }` override `--shadow-glow` / `--shadow-float`; unset keeps the
  built-in strings. `defineTheme` merges `shadows` like colours.
- `lit` backdrop: one accent radial light from the top edge, `radial-gradient(120% 70% at 50%
  -6%, accent 22% (dark) / 12% (light) → transparent 65%)`. Static, like `Grain`.

**Proof the knobs are inert for existing themes.** The `_kit` UI gallery had no visual guard.
Its golden (settled frames at 3.6, 7.1 and 11.4s) was written from the clean tree *before* any
engine edit (`tests: golden for _kit`), so the UI-kit edits had to leave `mono-dark` pixels
unchanged to pass; `_smoke`, `_type` and `_transitions` stand guard as before.
`tests/css.test.ts` additionally pins mono-dark's exact legacy shadow strings,
`--radius-control: calc(infinity * 1px)` and `--radius-field: 22px`.

### 3. One weight is a build-level property: Tailwind's weight variables
litt rule P9 (nothing above 400) cannot be met by kit roles alone, because the UI kit hard-codes
`font-semibold` and `font-medium`. `TypeKit.oneWeight` makes `themeCss` emit
`--font-weight-{medium,semibold,bold,extrabold,black}: 400`, so every named weight draws at the
kit's sans weight. `src/build/typebase.ts` resolves those classes to 400 in the same way, so the
lint (`hairline-weight`, axis checks) sees what the browser draws.

It follows the **video-level** kit only. The theme layer is global, and a scene-scoped kit
(`[data-ct-type]` CSS) cannot reset it, so a `litt` scene inside a `swiss` video does not
flatten, and a `swiss` scene inside a `litt` video does. An explicit `font-bold` is neutralised
by design; `font-[700]` is not, and the docs tell authors not to write it.

### 4. Host Grotesk, not Hanken Grotesk, for the display and text roles
`@fontsource-variable/host-grotesk@5.3.0`: OFL, `wght` 300–800, italic, no tabular figures, no
`→ ↵ ✓` (they fall back to CT Symbols). It is the closest open-source stand-in for the
Helvetica Now Display setting of the reference frame, and was chosen over Inter Display and
Instrument Sans. Missing `tnum` is handled in the kit: `figures: "mono"`, so `Stat` and counters
use Geist Mono. Host Grotesk's default word space reads wide beside the kit's tight tracking, so
a role can now set `wordSpacing` (litt display: −0.05em); scoped kits reset it like `font-stretch`,
so a litt video's spacing never leaks into a scene kit.

litt.md's own web face is **Hanken Grotesk** and stays so; Continuity already ships it (the
`wonk` text face). Whether a Helvetica-style neo-grotesk replaces it in web UI is litt.md's open
question Q20, logged there with this decision as evidence. Nothing in litt.md's rules changed.

### 5. Lit precision is a docs-level language on existing tokens
No new motion tokens, presets, transitions or lint rules. `motion-craft` §7 maps litt's tiers
onto what exists: instant → `instant` + `standard`; responsive → `base` (`fast` for small
things) + `standard`, `rise` with `distance: 32` (litt's 16px at video scale); expressive →
`snappy` (damping ratio 0.87, bounce ≈ 0.13 against litt's 0.12) at `slow`, one per scene;
exits → one duration token down with `standard`, never bouncy (decelerating, which departs from
§2's accelerating `exit` ease on purpose); stagger → `grid`/`word`, ≤ 0.4s total. Transitions
are `crossfade` 0.4, one `dip` before the end card, and cuts on the beat: two types, inside every
craft range, so `lintStoryboard` is clean. `lightSweep`, `blur`, `zoom`, `whip`, `punchCut`,
`iris`, `wipe`, `strips`, `push` and `pushUp` are out, because they animate light, filters, masks
or full-frame travel and litt's material never moves (P5). The `typography`, `product-launch`,
`critique`, `kinetic-type` skills and the director carry the rest.

## Token mapping (litt.md v0.5 → Continuity)

| litt token | dark | light | Continuity token |
|---|---|---|---|
| `--canvas` | `#08090a` | `#fafbfc` | colour `bg` |
| `--surface-1` | `#0f1011` | `#ffffff` | `surface` |
| `--surface-2` | `#161719` | `#f4f5f7` | `surface-2` |
| `--line` | `#232529` | `#e3e5e9` | `border` |
| `--fg` | `#f7f8f9` | `#0e0f11` | `fg` |
| `--fg-muted` | `#d0d6e0` | `#3c3f45` | `muted` |
| `--fg-subtle` | `#8a8f98` | `#64686f` | `subtle` |
| `--accent` | `#4c9fff` | `#1a73d5` | `accent` |
| `--accent-hover` | `#6bb3ff` | `#0961bb` | `accent-2` (the tonal step: one light source, not a second hue) |
| `--accent-fg` | `#08090a` | `#ffffff` | `accent-fg` |
| `--success` | `#4bc680` | `#007c3b` | `positive` |
| `--warning` | `#e19b1b` | `#9c5a00` | `warning` |
| `--danger` | `#ff756f` | `#be2e31` | `danger` |
| `--light` + `--light-strength` | 22% | 12% | `background: "lit"` (anchored at −6% where litt.md has −10%) |
| `--grain-opacity` | 0.04 | 0.02 | `grain` |
| `--glow` (1px ring, 24px light) + `--glow-strength` | 40% | 28% | `shadows.glow`: 2px ring at 55%, 48px light at 40% / 28% |
| `--shadow-float` (8 / 24px glows + ring) | black .4 / .3 / .5 | ink .08 / .06 / .06 | `shadows.float`: 16 / 48px glows + ring, doubled blur |
| `--radius-control` 4px | | | `radius.control` 8px (also `sm` 4, `md` 8) |
| `--radius-surface` 8px (control + 4) | | | `radius.lg` and `xl` 16px (control + 8: corners still nest) |
| `--radius-pill` | | | `rounded-full`, unchanged |
| `--weight` 400, Hanken Grotesk | | | kit `litt`: all roles 400, `oneWeight`, Host Grotesk |
| `--font-mono` Geist Mono | | | kit mono role and `figures: "mono"` |
| `--type-*-tracking` | | | kit `scale`: mega −0.045em · display −0.04em · h1 −0.035em · h2 −0.03em · h3 −0.022em, display word space −0.05em (Helvetica-style, tighter than litt.md's web scale) |
| `--stagger` 40ms, `--travel` 16px | | | `grid` / `word`, `distance: 32` |
| spring tiers, exits 0.75× | | | Lit precision (decision 5) |

px values are doubled for the 1080p frame (ring 1px → 2px, glow 24px → 48px, radius 4/8 →
8/16). Not carried: `--surface-3`, `--line-strong`, `--line-control`, `--fg-disabled`,
`--accent-tint`, `--focus*`, `--shadow-tooltip`, `--shadow-modal` and glass. A video has no
focus states, tooltips, dialogs or scroll.

## Consequences

- **New goldens:** `_kit` (mono-dark UI gallery, guards the knobs) and `_type-litt` (the `litt`
  scene of the `_type` specimen at 25.3s, its own file so `tests/golden/_type.json` is untouched).
  `tests/themes.test.ts` checks that every theme has all 13 colour tokens and that, for both litt
  themes, `fg`, `muted` and `subtle` reach 4.5:1 on `bg` and `accent-fg` on `accent`.
- **`font-bold` is neutralised** under one-weight kits (video level). That is the point of P9,
  and it is documented in `typography`; a brand kit that wants bold must not use `oneWeight`.
- **Known UI-kit gaps under litt**, avoided in litt videos and listed in `product-launch` and
  `critique`: the traffic-light dots of `Window` and `Browser`, the `Toast` accent disc and the
  `Avatar` gradient are off-language. The `Phone` bezel colour is a hard-coded hex too. A quiet
  variant of each could follow.
- **Values are copied one-way** from litt.md v0.5 into `src/themes/index.ts` and `kits.ts`;
  there is no runtime link. When litt.md's `tokens.css` changes, re-sync the table above, the
  two themes and the kit's scale, and re-run the goldens.
- **Cost:** one more `@fontsource` package (Host Grotesk, ~42 KB for the Latin `wght` normal and
  italic files); builds copy only the faces a kit uses.
- **No new lint.** Lit precision is enforced by review (`critique` § litt checks), not by the
  engine, except where existing rules already bite (`transition-language`, `transition-bounce`,
  `exit-slower-than-enter`, `counter-proportional`, `axis-unsupported`).
