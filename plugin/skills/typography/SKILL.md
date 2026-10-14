---
name: typography
description: Type kits for Continuity videos — the seven curated font pairings (swiss, atelier, wonk, terminal, broadside, flexion, litt), when to use which, how kit roles drive the kit components, serif-accent sizing, tracking/leading numbers, tabular figures, no faux styles, and variable-axis motion (weight, width, softness). Load when choosing a video's look (director) and whenever setting type in scene code.
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
| `litt` | litt.md, Linear, Vercel; Helvetica Now Display setting | Host Grotesk 400, tight · Host Grotesk · Geist Mono, sentence case | quiet, lit, precise product and brand films; one weight, no picked-out word | litt, litt-light |

- Set it in `storyboard.json`: `"type": "swiss"`. `ct new` writes the theme's suggested kit
  (mono-dark → swiss, light-editorial → atelier, vivid-gradient → broadside, litt and
  litt-light → litt); `--type` overrides. The litt themes also pin `type: "litt"`, so a
  project on them gets the kit even with `type` omitted (the storyboard still wins).
- Without `type` (and a theme that pins none) a project renders **classic** (the theme's v1
  fonts) — fine for old work, but new videos should pick a kit.
- A scene may set its own `type` only for a deliberate chapter break or a gallery. One kit per
  video is the rule; mixing kits reads as a template.
- Brand kit: `theme.ts` → `defineTheme("mono-dark", { type: defineKit("swiss", { roles: { display: { weight: 700 } } }) })`.
  Families must come from the registry (`fonts` export) — no other fonts exist at render time.

## The litt kit (litt.md)

The look of litt.md as type: one grotesk at one weight, set tight, in sentence case, with
hierarchy from size and colour instead of weight, italics or a picked-out word. It is the
opposite of a kinetic or editorial kit — pick it for calm, precise, lit work, and pair it
with the `litt` / `litt-light` themes (the `lit` backdrop, glow-and-ring depth).

**Why Host Grotesk.** It is the closest open-source (OFL) stand-in for the Helvetica Now
Display setting of the reference frame; Continuity ships no non-OFL faces. litt.md's own web
UI face is Hanken Grotesk, which stays there (whether a Helvetica-style neo-grotesk replaces
it on the web is litt.md's open question Q20). Host Grotesk is wght-only (300–800), has no
tabular figures, and lacks `→ ↵ ✓` (they fall back to CT Symbols).

**litt kit rules**
1. **One weight.** Every role is 400, and the build flattens `font-medium` … `font-black` to
   400 for a `litt` video, so `font-bold` (also inside the UI kit's Button, Pill, …) draws at
   400 *by design*. Never reach for weight to make hierarchy. `font-[700]` is not flattened:
   don't write it. The flattening follows the video-level kit; a `litt` *scene* kit inside
   another kit's video does not flatten.
2. **Sentence case.** `Eyebrow` is untracked and not uppercase; don't add `uppercase` or
   `tracking-*`. A label above every scene is a generic-AI tell — use one only when it
   carries information (a version, a status).
3. **Never pick out a word.** No `Serif`, `Emph`, `Accent`, `GradientText` or `Highlight` on a
   headline, no italic, no accent-coloured word. Hierarchy is size first (≥ 2.5× steps),
   then colour: `text-fg` → `text-muted` → `text-subtle`.
4. **Figures in mono.** Host Grotesk has no tabular figures: counters and stats go in
   `font-mono` (`Stat` and the kit's figures role already do; a raw `<Counter>` needs
   `font-mono` or `counter-proportional` warns).
5. **No weight or width tweens.** The look is one weight. Host Grotesk is wght-only, so
   `weightIn` / `weightPulse` would run but break rule 1, and `widthIn` / `widthPulse` /
   `wdth` animate nothing (`axis-unsupported`). Type moves by position and opacity only.
6. **Tracking stays tight** (Helvetica-style): mega −0.045em · display −0.04em · h1 −0.035em ·
   h2 −0.03em · h3 −0.022em, leading 0.92–1.1, and the display role closes the word space
   (`word-spacing: −0.05em`; Host Grotesk's default reads wide beside tight tracking). Don't
   loosen either. Left-align by default; centre once per video.

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
- **Figures**: counters and stats need tabular figures. Fraunces, Hanken Grotesk, Host Grotesk
  and Instrument Serif have none — `Stat` uses the kit's figures role; a raw `<Counter>` should sit in
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
9. Under `litt`: bold anything (it renders at 400 anyway, so the intent is lost), an accent or
   italic word in a headline, uppercase mono eyebrows on every scene, weight/width motion.
