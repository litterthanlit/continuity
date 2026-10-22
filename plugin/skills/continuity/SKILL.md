---
name: continuity
description: Start here for any motion design video work (projects built with the `ct` CLI from @litterthanlit/continuity) — making a new video from a brief, editing or iterating on an existing project, fixing gate findings, or reviewing a render. Explains the production loop, the house language (litt) and its two registers (calm, energetic), roles, tools and which other skills to load (typography, motion-craft, kinetic-type, product-launch, social-clip, critique).
---

# Continuity production loop

You are a motion designer whose medium is code. The loop below is non-negotiable;
the craft lives in the `motion-craft` skill, the API in `reference/api.md`.

**The look is litt** — Nick's design language: technical precision, lit from above. Geist in
three weights by role, two inks, warm stone neutrals (`litt-dark` or `litt-light`), one accent
that behaves like light, colour only for data, a soft light from the top, flat surfaces with
hairlines. Motion explains and never performs: responsive springs, one expressive moment per
scene, exits at 0.75×, material static, cuts on the beat. `docs/decisions/0006` is the
translation table; the `litt-*` and motion lint rules gate it. There are no other themes or
type kits to choose.

**Two registers** (`docs/decisions/0007`) set how loud litt speaks, not how it looks. `calm` (the
default) is everything above — launches, features, statements. `energetic` is for brand reels,
recaps, montages and collage-led social cuts: easing by role (`steep` for UI and camera, `pop`
for objects, `linear` for machines), every group staggered 1–3 frames, bursts answered by ~1s
holds, a camera that flies through depth (`depth` transition), copy that types or wipes,
imagery in strict containers on a `grid` backdrop, scene formulas used twice, and an ending that
reverses the opening. Choose it in the brief; set `"register"` on the storyboard, or on single
scenes for an energetic chapter in a calm video. The lint's motion bounds follow the register,
so an energetic scene never needs `allow` for its pop springs or its travelling camera.
Gallery: `projects/_energetic`; craft: `motion-craft` §12.

## 0 · Orient
- `npx ct status <slug>` — iterations, gate results, best version.
- Read `brief.md`, `storyboard.json`, and the latest `sheet.png` before touching code.

## 1 · Brief → storyboard (director)
Write/complete `projects/<slug>/brief.md`: audience, the ONE thing to remember,
CTA, format, tone, references, brand constraints, must-say copy.

Then `storyboard.json` (schema: `reference/api.md` → Storyboard; `npx ct lint <slug> --storyboard` validates it):
- **Scenes** each carry ONE idea (`intent`). 1.6–4s for kinetic type, 2.5–6s for
  product UI. Total: social 8–20s, launch 20–60s.
- **Beats** are the moments things land (`b1`, `b2`, `land`, `cta`…). Motion is
  scheduled against beats, not raw seconds — retiming a beat retimes the scene.
- **text** holds all copy by element id. Budget words: ≤ 7 words on screen at once
  for social, ≤ 12 for 16:9. Every text needs read time (≈17 chars/s + 0.4s).
- **elements** list ids, roles and coarse anchors (6×6 grid A1–F6).
- **theme** — `litt-dark` (default) or `litt-light`; **type** — `litt` (the only kit).
- **loop** + **caption** — for a clip meant to be posted (X, social, 5–15s): `"loop": true`
  turns on the loop gates (frame one a real state, a 30–50% final hold, 5–15s) and `caption` is
  the claim that ships with it. Load the `social-clip` skill.
- **register** — `calm` (default) or `energetic`; a scene's own `register` wins (one energetic
  chapter in a calm video, or a calm hold in a reel). Energetic scenes run 1–3s, holds 1–1.6s;
  plan the formulas (which scenes repeat which structure) and the mirrored ending here.
- **transition** into the next scene, from litt's ONE language (motion-craft §8):
  `cut` on the beat is the primary; accents `crossfade`, `dip`, `push`, `pushUp`,
  `wipe` — at most two types, with parameters, e.g. `{ "type": "push", "dir": "left", "blur": true }`.
  Energetic: up to three, and `depth` (`dir: "in"` / `"out"`) joins the language.
- `npx ct lint <slug>` validates the storyboard immediately.

## 2 · Style frames (builder)
Build every scene's *settled* layout with minimal motion. `npx ct stills <slug>`
→ read each PNG at full size. Fix hierarchy (weight and ink first, then space,
then the one display step), alignment (asymmetric, left edge), spacing (16px
grid, lockups 8, blocks 32), negative space, light and colour **now** — motion
cannot rescue a weak frame.

## 3 · Motion (builder)
Load `motion-craft` and `typography` (always) and `kinetic-type` / `product-launch` /
`social-clip` as relevant.
Write `motion: (m) => …` with presets + tokens. Check numbers with
`npx ct timeline <slug>`.

## 4 · Gate
`npx ct check <slug>` → fix every error. Findings are keyed by `scene.element`
and time; the `→` line is the suggested fix. Re-run until clean. Rule meanings:
`reference/catalog.md` (lint rules section) and HyperFrames layout codes (overflow, overlap,
occlusion, contrast with a suggested compliant color). The litt rules (`litt-*`,
`spring-bounce`, `expressive-budget`, `material-motion`, `property-motion`, `travel-too-far`,
`camera-drift`, `ambient-loop`, `text-fade`, `transition-register`) are the taste gate — their
bounds follow each scene's register: fix them, or justify a deliberate exception with
`allow: ["rule"]` / `litt-allow: <rule> (reason)` and a comment. If a scene keeps needing
`allow` for bounce, travel or camera, it is probably an energetic scene: say so and set its
register instead.

## 5 · Look (critic)
`npx ct sheet <slug>` + `npx ct stills <slug>` → read the images.
`npx ct strip <slug> --scene <id>` shows a scene's motion paths in one image;
`npx ct motion <slug>` (after a render) charts the edit's rhythm and flags dead
zones/jolts. Load the `critique` skill and score the 5 axes with evidence
(`npx ct score …`). Fix the top issues only.

## 6 · Iterate with discipline
- Max **3** visual rounds. Gains come in round 1; later rounds often regress.
- After each round: gate again, look again, and compare against the best
  iteration (`npx ct status`). If it got worse, restore the best
  (`npx ct restore <slug> <n>`) instead of polishing.
- Change one thing per finding; don't refactor a working scene to fix a nit.

## 7 · Deliver
`npx ct check <slug> --deep`, then `npx ct render <slug>` (final), check QC output, write
`.continuity/report.md` (`npx ct report <slug>`), and show the user the MP4 +
contact sheet.

## Working in parallel
`npx ct lint|check|stills|sheet|strip <slug> --scene <id>` build that scene in
isolation (others become placeholders, own build dir), so one builder's
half-written file never breaks another's check. Browser work queues for a
limited number of slots automatically. Always finish with a full `ct check`.

## Roles (subagents, when available)
- **director** — brief + storyboard + treatment. Never writes scene code.
- **scene-builder** — one scene file each, in parallel; owns its gate.
- **critic** — read-only; looks at evidence and scores; never edits.

## Fast reference
- API & component catalog: `reference/api.md`
- Presets & tokens with numbers: `motion-craft/SKILL.md`
- litt's type (scale, weights, inks, spacing): `typography/SKILL.md`
- The translation table (litt → video): `docs/decisions/0006-litt-house-language.md` in the repo
- Rubric: `critique/SKILL.md`
