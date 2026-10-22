---
name: typography
description: litt's typography for Continuity videos — Geist and Geist Mono in three weights by role, the video type scale (one display step, then title, body, small and label), two inks, tight lockups and wide gaps, mono for data, ink as the emphasis, tabular figures, no faux styles. Load when choosing a video's look (director) and whenever setting type in scene code.
---

# Typography: litt at video scale

Continuity's type is **litt** (Nick's design language, `docs/decisions/0006`): technical
precision, lit from above. One family carries everything — Geist — and rank comes from
**weight and ink first, then space, and only then from size**. There is one kit, `litt`;
`ct new` writes `"type": "litt"`. There is nothing else to reach for: the font registry
is Geist, Geist Mono and the symbol fallbacks.

## The scale

One display step, then four steps close together (title : body ≈ litt's 18 : 14). Pixels at
the 1080 short side; line heights are whole pixels; tracking tightens as size grows.

| Step | Component | 16:9 · 1:1 | 9:16 | Weight | Use |
|---|---|---|---|---|---|
| `display` | `Headline` | 112 / 112 · −0.04em | 112 / 112 | 500 | The scene's one statement. **One per scene**, ≤ 2 lines |
| `title` | `Title` | 48 / 56 · −0.025em | 56 / 64 | 500 | A feature name, a lockup's title, a stat |
| `body` | `Body` | 36 / 48 · −0.01em | 40 / 52 | 400 | Supporting copy, in the grey |
| `small` | `Caption` | 30 / 40 · −0.005em | 36 / 48 | 400 | Meta, captions, a credit |
| `label` | `Label` | 28 / 36 · 0 | 34 / 44 | 600 | A label over a title, sentence case, in the grey |

- The 9:16 column is automatic (the build picks it from the aspect): the probe's legibility
  floor is 34px there, 26px otherwise. Components never branch on aspect.
- **Display is the ceiling.** Nothing is set larger: the hero gets its presence from space,
  light and the product, not from a bigger number. If a line needs to be smaller to fit, cut
  words — never shrink the step (`Fit` is for variable data, not copy).
- **Video UI** (inside a Window, a List, a Toast) is litt's UI at 2×: 28px text, 26px meta,
  never below 26. The kit components already do this.

## Weight by role (P9)

Three weights and nothing else:
- **400** text: body, small, nav, descriptions (`font-normal`, the default).
- **500** titles: display, title, buttons, tabs, a window's title (`Headline` and `Title` set
  it; `font-title` elsewhere).
- **600** labels, at the label step only (`Label` sets it; `font-label` elsewhere).

No `font-medium`, `font-semibold`, `font-bold` or `font-light`: the `litt-weight` lint fails
them. Geist Mono stays at 400. Synthesis is off, so nothing is faked.

## Two inks

`text-fg` for titles and key values, **one grey** for everything else: `text-fg-muted` (body)
and `text-fg-subtle` (meta) are the same grey under two names, so a later split is one edit.
Never an accent-coloured word (`litt-accent-text`), never gradient text (`litt-gradient`),
never italic for emphasis.

**Emphasis is ink.** The word that matters stays in fg while the rest of the line steps back to
the grey — or brightens from the grey. In motion this is the `ink` channel at the instant tier:

```tsx
// view: the line in three spans so the words can change ink on their own
<Headline ct="line">
  <El as="span" ct="pre">{text.pre}</El><El as="span" ct="key">{text.key}</El><El as="span" ct="post">{text.post}</El>
</Headline>
```
```ts
m.enter("line", "maskUp", { at: "b1", split: "lines", ease: "expressive" });
m.emphasize(["pre", "post"], "dim", { at: "b2", stagger: 0 });   // the key word keeps fg
// or the other way round: m.emphasize("key", "ink", { at: "b2" }) on a line set in the grey
```
`Emph` keeps the copy in the storyboard while you treat one word on its own:
`<Emph text={text.l2} word="see">{(w) => <El as="span" ct="see">{w}</El>}</Emph>`.

## Text spacing: tight lockups, wide gaps

litt's spacing at video scale (×2), on the 16px grid (8 inside a lockup):
- a **label 8px above its title**, a title 8px above its text — a lockup reads as one unit:
  `<Stack gap={8}><Label/><Headline/></Stack>`;
- the **display line 32px above its summary**;
- **blocks 32px apart** (`Stack`/`Row` default), regions 96px apart.

Labels are **sentence case** (`litt-case` fails `uppercase`), in the sans at 600, never an
uppercase tracked mono eyebrow, and not the same label over every scene ("01 / FEATURES" is a
generic-AI tell). A label earns its place by saying something.

## Mono is for data

Geist Mono (`font-mono`) only for code, keyboard keys (`⌘K`), ids (`ENG-142`), versions
(`v0.2.0`), timecodes, numbers in tables, and the indices and coordinates of a technical overlay
(`Marker` labels `01`, `40.7° N` — the energetic register's annotation layer). Never for tags,
word labels or paragraphs. A hero
number is Geist 500 with tabular figures (`Stat`, `Counter` with `font-title tabular-nums`) —
not mono.

## Figures

Counters and stats need tabular figures so their width never jitters: `Stat` and `Counter` set
`tabular-nums`, and Geist has them. A stat's label sits **above** its value, in the grey; a
delta is a sentence in words ("Up 12% on last week"), coloured success / danger / grey.

## Weight and axes in motion

Geist has a weight axis only, and litt keeps to its three weights, so weight never animates
for effect: there are no weight, width or softness presets, and `weight-role` warns on a weight
tween that settles off 400/500/600. Rank changes by **ink**, not by weight.

## Layout of type

- Left-aligned on one edge by default, asymmetric (copy in columns 1–5 of 12 and the visual in
  7–12, column 6 left as air). Centered only for one short statement, once per video — the end
  card or a quote.
- Break display lines by meaning (`<br/>` is fine), `text-balance` is on by default.
- ≤ 12 words on screen per scene in 16:9, ≤ 7 in 9:16.

## Anti-patterns

1. A second family, a serif display or an italic accent word.
2. Bold, semibold, medium or light — anything outside 400 / 500 / 600 by role.
3. An accent-coloured or gradient headline word; emphasis by size punch or weight pulse.
4. Uppercase tracked mono eyebrows, the same label over every scene.
5. Two display lines competing in one frame; type larger than the display step.
6. Shrinking type to fit more copy — cut words.
7. Mono for paragraphs, labels or tags; proportional figures in a counter.
8. Loose lockups (a label floating 40px above its title) or cramped gaps between blocks.
