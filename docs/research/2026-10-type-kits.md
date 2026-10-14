# Typography for Continuity v2: what top motion designers use (2026-10)

Research behind the v2 type kits (`src/themes/kits.ts`, ADR 0005). Compiled from live production CSS,
the Fontsource API and npm registry, the real font files (fvar/GSUB/OS-2 tables read with fontkit), and
trend writing. Tags: **[V]** verified directly; **[S]** secondary source; **[U]** unverified.

Constraint: every bundled face is OFL-1.1 (or Apache-2.0), installable as an exact-pinned
`@fontsource*` package and rendered offline. Commercial faces are named only as references, each with
its best free stand-in.

## 1. What brands and studios actually ship

Read from each site's production CSS [V] unless marked.

| Brand | Faces | Notes |
|---|---|---|
| Vercel | Geist, Geist Mono, Geist Pixel (circle/square/triangle) | Headings 600, −0.06em at ≥40px; pixel faces as decorative accent |
| Linear | Inter Variable, `font-feature-settings … "zero"` | Mono face not in CSS; "Berkeley Mono" only in 3rd-party writeups [S/U] |
| Stripe | Söhne (`sohne-var`) + Source Code Pro | Weight 300 as "normal"; `ss01`; `tnum` for figures |
| Raycast | Inter, Geist Mono, JetBrains Mono, Instrument Serif, VT323 | |
| Cursor | CursorGothic (custom Waldenburg cut), berkeleyMono, cursorMono | EB Garamond italic only inside an in-page product demo |
| Framer | Inter, Inter Tight, EB Garamond, JetBrains Mono | |
| Notion | NotionInter, Lyon Text, iA Writer Mono | |
| Anthropic | Styrene A/B, Tiempos, Copernicus; custom sans/serif/mono | Sans headlines, serif body |
| Figma | Figma Sans (Grilli Type) + condensed display [S] | Config 2025 film dropped 60→15 fps for a "tactile, handmade" feel; "expressive" and "functional" type motion presets |
| Arc / Dia | Exposure VAR, ABC Oracle, ABC Favorit Mono, Marlin Soft SQ, Söhne Breit | Dia headlines use a quirky variable display serif — the "whacky serif" look in a mainstream product |
| Apple | SF Pro Display/Text | Not redistributable |
| OpenAI | OpenAI Sans (custom, with ABC Dinamo) [S] | |
| Others | ElevenLabs: Waldenburg/Inter/Geist Mono · Resend: ABC Favorit/Commit Mono · Clerk: Suisse/Inter · Cal.com: Cal Sans/Inter · Runway: Times Now/Geist Mono · Supabase: Manrope | |

Studios: Buck → Mabry; DixonBaxi → Geist, Geist Mono, Graphik, Aeonik Fono; Pentagram → Neue Haas;
Jitter → Inter, TWK Lausanne; Rive → Inter, Roboto Flex, Fragment Mono, JetBrains Mono; Basement →
Geist, Geist Mono; Ordinary Folk → Circular. ManvsMachine, Koto, Collins unreachable [U].

**Takeaways**
- The product layer is Inter / Geist / Söhne + a mono. Serifs are an *accent* layer (Instrument Serif,
  EB Garamond, Lyon, Tiempos).
- Many brands now commission a custom face. With OFL faces, "feels custom" comes from one distinctive
  display cut used with restraint.
- The serif wave in AI branding reads as "human/warm"; critics already call it "tasteslop" [S: Monotype,
  Vadgama, WSJ]. Restraint is the craft.

## 2. The expressive serif trend

Gleam: a grotesk headline with one swapped-in serif-italic word is "cheap to do, still works";
Instrument Serif Italic is "the most used version". Fraunces is the go-to free expressive variable serif.

| Face (package) | Italic / axes [V] | Verdict |
|---|---|---|
| Instrument Serif `@fontsource/instrument-serif` | static 400 + italic; condensed; no `tnum` | Tasteful but saturated. x-height .51 ≈ Instrument Sans |
| **Fraunces** `@fontsource-variable/fraunces` | opsz 9–144, wght 100–900, SOFT 0–100, WONK 0–1, italic; no `tnum` | Best "whacky but tasteful". WONK is binary (leaning n/m/h roman, bulbous flags in italic, only above opsz 18). fvar default is opsz 9, wght 900, WONK 1, SOFT 0 — always set axes explicitly |
| **Newsreader** `…/newsreader` | opsz 6–72, wght 200–800, italic; `tnum` | Quiet, bookish — best Tiempos stand-in |
| EB Garamond `…/eb-garamond` | wght 400–800, italic | Classic (Cursor, Framer). Small x-height (.40) |
| Young Serif, Gloock, Caprasimo | static, no italic | Hearty one-offs |
| DM Serif Display | static + italic | Chunky, slightly dated |
| Playfair Display | wght 400–900 | Ubiquitous — avoid |
| Playfair 2 `…/playfair` | opsz 5–1200, wdth 87.5–112.5, wght 300–900 | Much better than Playfair Display |
| Bodoni Moda | opsz 6–96, italic | Fashion Didone; hairlines risky in video |
| Cormorant | wght 300–700 | Hairlines shimmer at light weights |
| Libre Caslon, Source Serif 4, Literata, Lora | variable + italic | Neutral body workhorses |

Not bundleable: Erode/Gambetta and other Fontshare faces (ITF Free Font License, not OFL); PP
Editorial New ("Free for Personal Use") [V]; Junicode (no Fontsource package).

Italics that sing in motion: Instrument Serif Italic for a one-word swap ≥96px; Fraunces Italic +
WONK 1 (most characterful; SOFT and wght animate continuously); Newsreader Italic at opsz 72 (elegant
slow fades); EB Garamond Italic (gentle).

## 3. Grotesk partners

| Face | Axes [V] | Notes |
|---|---|---|
| Inter | opsz 14–32, wght 100–900, italic | opsz 32 = Inter Display. The vendored latin subset does **not** carry ss01/cv11 |
| Inter Tight | wght 100–900, italic | In repo (v1 display) |
| Geist | wght 100–900, italic | `tnum`. No opsz |
| Hanken Grotesk | wght 100–900, italic | No `tnum` |
| Instrument Sans | wdth 75–100, wght 400–700, italic | `tnum`; weight floor 400 |
| Bricolage Grotesque | opsz 12–96, wdth 75–100, wght 200–800 | Quirky ink traps at low opsz |
| Mona Sans / Hubot Sans | wdth 75–125, wght 200–900, italic | `tnum` |
| Google Sans Flex | opsz, wdth 25–151, wght 1–1000, slnt, GRAD, ROND | OFL (Nov 2025) but 0.5–1.4 MB |
| Archivo | wdth 62–125, wght 100–900, italic | `tnum`; condensed→expanded |
| Anybody | wdth 50–150 | |
| Space Grotesk, Poppins, Montserrat | | Clichés |

## 4. Monospace

| Face | Notes [V] |
|---|---|
| Geist Mono | wght 100–900, italic |
| JetBrains Mono | wght 100–800, italic, `zero` |
| Commit Mono `@fontsource/commit-mono` | static 200–700 + italic — closest free Berkeley Mono stand-in |
| Martian Mono | wdth 75–112.5 (**file default 112.5** — set it), wght 100–800, no italic |
| IBM Plex Mono, DM Mono, Fragment Mono, Space Mono | static |
| Recursive | MONO, CASL, wght, slnt, CRSV |
| Departure Mono, Monaspace variable | OFL but not on npm in usable form — vendor later if needed |
| Geist Pixel `@fontsource/geist-pixel` | five variants |

## 5. Variable fonts in motion

Animatable axes: Fraunces (wght, opsz, SOFT; WONK is binary — toggle on a beat), Bricolage (opsz, wdth,
wght), Mona/Hubot (wdth 75–125, wght), Anybody (wdth 50–150), Archivo (wdth 62–125), Google Sans Flex,
Roboto Flex (GRAD changes apparent weight *without* changing advance widths), Recursive (CASL, MONO,
slnt), Martian Mono (wdth).

Deterministic-render practice:
1. Drive axes from the timeline each frame. Set custom axes explicitly — omitted axes fall back to the
   font's fvar default, which can surprise (Fraunces: WONK 1, wght 900).
2. **Reflow**: wght and wdth change advance widths. Use `white-space: nowrap` + a fixed stage, animate
   split chars, or use GRAD where available.
3. `font-optical-sizing: auto` sets opsz from the CSS px size — it does **not** follow `transform:
   scale()`. Set opsz explicitly when scaling text.
4. Chrome snaps text to whole pixels; animate transforms, not `font-size`.
5. Wait for `document.fonts.ready` / `load()`; keep vendored woff2 + generic fallbacks only.
6. Counters: `tabular-nums`. `tnum` exists in Geist, Inter, Instrument Sans, Mona, Newsreader, Archivo,
   Bricolage; it is **missing** in Instrument Serif, Fraunces, Hanken Grotesk, Host Grotesk.
7. Don't tween `ital` (separate file) or WONK (glyph swap).
8. `@font-face` must declare `font-stretch: a% b%` for wdth to apply; Chrome clamps to 100% otherwise.

## 6. Craft numbers for video

Vercel production tokens [V]: 72/64/56px → −0.06em, lh 1.0; 48 → −0.06em/1.17; 40 → −0.06em/1.2;
32/24 → −0.04em/1.25–1.33; 20/16 → −0.02em/1.3–1.5. Serif display: −0.01…−0.03em. Condensed caps:
0…+0.01em, lh .88–.92. Mono caps labels: +0.06…+0.12em.

| | 1920×1080 | 1080×1920 |
|---|---|---|
| Hero | 160–240px | 150–220px |
| H1 | 120 | 112 |
| H2 / subhead | 80 / 40–44 | 64–72 |
| Body | 32–36 (floor 28) | 56–70 (floor 48) |
| Mono label | 22–26 | 32–36 |

**Serif-italic accent in a grotesk line**: one word (two at most) — "the accent, never the body".
Match x-height, not point size. Scale next to Geist (x .530): Instrument Serif ×1.04 · Fraunces ×1.13
· DM Serif Display ×1.10 · Bodoni Moda ×1.15 · Newsreader ×1.24 · Playfair ×1.28 · EB Garamond ×1.33.

Mono labels/timecodes: uppercase, +0.08em, tabular, `00:00:12:08`. Sentence case for grotesk
headlines; uppercase only for condensed social cuts and mono labels. Keep serif display weights ≥ 320–400
and Didones ≥ 96px — hairlines shimmer under H.264/social re-encodes.

## 7. The v2 kits (shipped: Core 6)

| Kit | Evokes | Display | Text | Labels | Accent |
|---|---|---|---|---|---|
| swiss | Vercel, Linear, Stripe | Geist 600, −.05…−.06em | Geist | Geist Mono caps | Instrument Serif |
| atelier | Anthropic (Tiempos + Styrene) | Newsreader 340, −.02em | Instrument Sans | Geist Mono caps | Newsreader Italic |
| wonk | Reckless/Recoleta, Arc/Dia Exposure | Fraunces SOFT 100 WONK 1, −.03em | Hanken Grotesk | DM Mono caps | Fraunces Italic |
| terminal | Vercel, Resend, Cursor | Geist Mono 500 | Geist | Geist Mono caps | Instrument Serif |
| broadside | Figma Config condensed, brutalist social | Archivo wdth 66 wght 850 CAPS | Inter Tight 500 | Martian Mono | Instrument Serif |
| flexion | GitHub Universe, Söhne Breit | Mona Sans (wdth/wght animated) | Mona Sans | Martian Mono | Instrument Serif |

Deferred: Hearth (Bricolage + EB Garamond italic), Salon (Bodoni Moda / Playfair 2).

Commercial → free: Söhne → Inter/Geist/Hanken · Söhne Breit → Mona Sans/Archivo wdth 125 · Berkeley
Mono → Commit/Geist Mono · PP Editorial New → Instrument Serif/Bodoni Moda · Canela, GT Super →
Fraunces (SOFT)/Playfair 2 · Reckless, Exposure → Fraunces + WONK · Tiempos, Lyon → Newsreader ·
Neue Montreal, Diatype → Instrument Sans/Hanken.

## 8. Anti-patterns (2026)

- Inter used as-is (reads default) — use tight tracking/Display cut, or Geist/Hanken.
- Space Grotesk, Poppins, Montserrat, Playfair Display.
- Instrument Serif everywhere ("hundreds of startup landing pages") — one italic word, or another kit.
- Aggressive high-contrast serif italics as a default; two loud faces competing; >2 trends stacked.
- Fontshare / "free for personal use" faces in bundles.
- System font fallbacks (Georgia etc. make HyperFrames fetch substitutes at render time).
- Faux bold/italic; light weights at video bitrates; serif numerals in counters; untracked caps.
- Pixel fonts as decoration rather than a deliberate moment.

## Sources

Fetched/inspected: fontsource.org (instrument-serif, variable docs), api.fontsource.org (fonts, variable
axes), registry.npmjs.org, raw google/fonts TTFs, github.com/vercel/geist-font, undercasetype/Fraunces,
githubnext/monaspace, rektdeckard/departure-mono, rsms/inter, rsms.me/inter, commitmono.com,
vercel.com/geist/typography, designcompass.org (Cursor branding), type.today/en/journal/anthropic,
figma.com/blog (Config 2025, Config 2026 identity), madegooddesigns.com (font trends 2026, trending,
best new Google fonts), gleamstudio.design/blog-post/font-trends-2026, findfont.co,
fontalternatives.com, monotype.com (AI brands & serifs), keyavadgama.substack.com,
pangrampangram.com/products/editorial-new, blog.fontlab.com (variable fonts in motion),
resistenzatype.fontdue.com, blog.master.dev (multiplexed fonts), MDN font-optical-sizing /
font-variation-settings, remotion.dev/docs/fonts, remotion.dev/docs/troubleshooting/subpixel-rendering,
and the production CSS of linear.app, vercel.com, raycast.com, stripe.com, framer.com, cursor.com,
claude.com, anthropic.com, notion.com, figma.com, apple.com, arc.net, diabrowser.com, loom.com,
elevenlabs.io, resend.com, clerk.com, supabase.com, cal.com, runwayml.com, rive.app, jitter.video,
buck.co, dixonbaxi.com, pentagram.com, ordinaryfolk.co, basement.studio, hellomonday.com.

Search snippets only: reap.video, vidpros.com (safe zones); towbook, blitzcut (caption sizes);
browserless, argos-ci (headless text rendering); abduzeedo (Google Sans Flex). Unreachable:
ManvsMachine, Koto, Perplexity, OpenAI.
