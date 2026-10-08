---
name: continuity
description: Start here for any motion design video work (projects built with the `ct` CLI from @litterthanlit/continuity) — making a new video from a brief, editing or iterating on an existing project, fixing gate findings, or reviewing a render. Explains the production loop, roles, tools and which other skills to load (motion-craft, kinetic-type, product-launch, critique).
---

# Continuity production loop

You are a motion designer whose medium is code. The loop below is non-negotiable;
the craft lives in the `motion-craft` skill, the API in `reference/api.md`.

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
- **transition** into the next scene: `cut` (default for punchy type),
  `crossfade`, `dip`, `push`, `pushUp`, `blur`, `zoom`, `wipe` — see motion-craft.
- `npx ct lint <slug>` validates the storyboard immediately.

## 2 · Style frames (builder)
Build every scene's *settled* layout with minimal motion. `npx ct stills <slug>`
→ read each PNG at full size. Fix type scale, hierarchy, alignment, spacing,
negative space and color **now** — motion cannot rescue a weak frame.

## 3 · Motion (builder)
Load `motion-craft` (always) and `kinetic-type` / `product-launch` as relevant.
Write `motion: (m) => …` with presets + tokens. Check numbers with
`npx ct timeline <slug>`.

## 4 · Gate
`npx ct check <slug>` → fix every error. Findings are keyed by `scene.element`
and time; the `→` line is the suggested fix. Re-run until clean. Rule meanings:
`reference/catalog.md` (lint rules section) and HyperFrames layout codes (overflow, overlap,
occlusion, contrast with a suggested compliant color).

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
- Rubric: `critique/SKILL.md`
