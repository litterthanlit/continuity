---
name: typography
description: Type kits for Continuity videos — the six curated font pairings (swiss, atelier, wonk, terminal, broadside, flexion), when to use which, how kit roles drive the kit components, serif-accent sizing, tracking/leading numbers, tabular figures, no faux styles, and variable-axis motion (weight, width, softness). Load when choosing a video's look (director) and whenever setting type in scene code.
---

# Typography: type kits

A **type kit** is the typographic half of a look: a display face, a text face, a
mono for labels, a serif accent, with tuned weights, widths, tracking, leading and
figures. It is chosen once per video, like the colour theme, and is independent
of it. The kit components (`Headline`, `Eyebrow`, `Serif`, `Stat`, `Body`…) read
it, so scenes rarely need font classes at all.

Research: `docs/research/2026-10-type-kits.md` (what Linear, Vercel, Stripe,
Raycast, Cursor, Arc/Dia, Anthropic and motion studios ship).

## Pick one kit

| Kit | Looks like | Display / text / labels | Best for | Pairs with |
|---|---|---|---|---|
| `swiss` | Vercel, Linear, Stripe | Geist 600, tight · Geist · Geist Mono caps | product launches, dev tools, anything precise | mono-dark, vivid-gradient |
| `atelier` | editorial (Tiempos + Styrene) | Newsreader 340 · Instrument Sans · Geist Mono caps | manifestos, AI/brand films, quiet confidence | light-editorial |
| `wonk` | Reckless, Recoleta, Arc/Dia | Fraunces soft & wonky · Hanken Grotesk · DM Mono caps | warm, characterful brands; consumer, creative tools | light-editorial, mono-dark |
| `terminal` | Vercel, Resend, Cursor | Geist Mono 500 · Geist · Geist Mono caps | CLIs, APIs, infra, changelogs | mono-dark |
| `broadside` | Figma Config, brutalist social | Archivo 66% width, 850, CAPS · Inter Tight · Martian Mono | 9:16 social cuts, hype, events | vivid-gradient, mono-dark |
| `flexion` | GitHub Universe, Söhne Breit | Mona Sans (width/weight animate) · Mona Sans · Martian Mono | kinetic type, variable-axis showpieces | mono-dark, vivid-gradient |

- Set it in `storyboard.json`: `"type": "swiss"`. `ct new` writes the theme's suggested kit
  (mono-dark → swiss, light-editorial → atelier, vivid-gradient → broadside); `--type` overrides.
- Without `type` a project renders **classic** (the theme's v1 fonts) — fine for old work, but
  new videos should pick a kit.
- A scene may set its own `type` only for a deliberate chapter break or a gallery. One kit per
  video is the rule; mixing kits reads as a template.
- Brand kit: `theme.ts` → `defineTheme("mono-dark", { type: defineKit("swiss", { roles: { display: { weight: 700 } } }) })`.
  Families must come from the registry (`fonts` export) — no other fonts exist at render time.

## Roles → components

| Role class | Component | What the kit sets |
|---|---|---|
| `font-display` | `Headline` | display family, weight, width, axes, case |
| `font-sans` | `Body`, `Subhead`, `Caption`, everything by default | text family, weight |
| `font-mono` + `ct-label` | `Eyebrow` | mono family, caps, label tracking |
| `font-serif` + `ct-accent` | `Serif` | accent family, italic, x-height-matched size |
| figures role | `Stat` | a family with tabular figures (or mono) |

- **Don't hardcode weights on Headline** (`font-semibold` etc.) unless the design needs a change:
  the kit already chose the weight. Any utility you do write wins over the kit (`font-bold`,
  `tracking-[0.3em]`, `normal-case`).
- `<Serif>` is x-height matched (Instrument Serif ×1.04 next to Geist; Newsreader/Fraunces
  accents use their own family at ×1). Don't resize it by hand.
- v2 kits turn **font synthesis off**: a weight or italic the family doesn't ship renders as the
  nearest real face, never faked. The probe reports it (`font-face-missing`). Known gaps:
  Instrument Serif is 400 only · Martian Mono has no italic · DM Mono is 300/400/500 ·
  Instrument Sans starts at 400.

## Numbers

- **Tracking**: display grotesk −0.045…−0.06em (swiss is tight like Vercel), serif display
  −0.02…−0.03em, condensed caps 0…+0.01em, mono caps labels +0.08…+0.16em. Kits set these per
  size; don't fight them.
- **Leading**: display 0.86–1.0, serif display 0.98–1.06, body 1.38–1.5.
- **Figures**: counters and stats need tabular figures. Fraunces, Hanken Grotesk and Instrument
  Serif have none — `Stat` uses the kit's figures role; a raw `<Counter>` should sit in
  `font-mono` or a sans with tnum (`counter-proportional` warns otherwise).
- **Hairlines**: serif display ≥ 320–400 weight; light weights shimmer after H.264 and social
  re-encodes (`hairline-weight`). Didones and thin strokes only ≥ 96px.
- **Optical size** follows the CSS px size automatically (Newsreader, Fraunces) — but not
  `transform: scale()`. Scale type with the type scale, not with transforms, when it settles.
- **Legibility floor** is unchanged: 26px (16:9), 34px (9:16).

## Variable-axis motion

Channels: `wght` (weight), `wdth` (width %, flexion/broadside), `soft` (Fraunces SOFT, wonk),
`opsz`. They start from the element's settled kit values, so `from: null` and loops just work.

| Preset | What it does | Kits |
|---|---|---|
| `weightIn` | weight swells from light to settled while fading in | swiss, flexion, wonk, atelier |
| `widthIn` | letters settle from wide | flexion, broadside |
| `softIn` | serifs soften from sharp | wonk |
| `weightPulse` / `widthPulse` | emphasis without moving anything | variable families |

```ts
// flexion: letters settle from wide, then a width wave breathes through them
m.enter("title", "widthIn", { at: "b1", split: "chars", stagger: "char" });
m.emphasize("title", "widthPulse", { at: "b1+1.6", split: "chars", stagger: "char" });
// wonk: serifs start sharp and soften as the line lands
m.tween("title", { soft: [0, 100] }, { at: "b1", duration: "linger", ease: "hero", kind: "emphasis" });
```

- **Weight and width change letter widths**: animate split chars/words, or keep the line
  `whitespace-nowrap` — otherwise lines re-break mid-motion (`axis-reflow`).
- An axis the family doesn't have animates nothing (`axis-unsupported`): wdth only on Mona Sans,
  Archivo, Martian Mono; soft only on Fraunces. WONK is a kit setting, never animated.

## Anti-patterns

1. Instrument Serif italic on every line — one accent word per scene, at most two.
2. Two loud faces competing (an expressive serif display *and* a condensed caps display).
3. Mixing kits across scenes without a chapter reason.
4. Uppercase serif italics; letter-spaced lowercase display.
5. Thin weights at small sizes; faux bold (asking a static face for a weight it lacks).
6. Display face for body copy; mono for paragraphs.
7. Proportional figures in counters (width jitter).
8. Reaching for Playfair / Space Grotesk / Poppins looks — they don't exist here, and the kits
   cover the tasteful versions (atelier, swiss).
