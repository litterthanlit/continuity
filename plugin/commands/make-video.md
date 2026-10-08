---
description: Make a motion design video end-to-end from a brief — director → parallel scene-builders → gate → critic → iterate → render.
argument-hint: <brief text or path> [--slug name] [--aspect 16:9|9:16|1:1|4:5] [--theme name]
---

Make a state-of-the-art motion design video for this brief:

$ARGUMENTS

You are the orchestrator (only you can spawn subagents). Load the `continuity`
skill first and follow its loop exactly.

Agent names: `director`, `scene-builder`, `critic` — when Continuity is installed as
a plugin they are namespaced (`continuity:director`, `continuity:scene-builder`,
`continuity:critic`); use whichever form your agent list shows.

0. **Toolchain.** If `npx ct doctor` fails because `ct` isn't installed, run the
   `/continuity:setup` steps first (install `@litterthanlit/continuity`, `npx ct init`).
1. **Setup.** Pick a kebab-case slug (or use `--slug`), aspect (social → 9:16,
   launch/product → 16:9) and theme. `npx ct new <slug> --aspect … --theme …`.
   Put the brief in `projects/<slug>/brief.md`. Ask the user only if the core
   message or audience is genuinely unknowable; otherwise assume and record.
2. **Direct.** Spawn the `director` subagent with the slug and brief. Review its
   storyboard yourself: one idea per scene, copy budget, read times, a clear arc.
   `npx ct lint <slug> --storyboard` must pass.
3. **Build in parallel.** Spawn one `scene-builder` per scene in a single message
   (they work on separate files and queue for the browser automatically). Give each:
   slug, scene id, the storyboard entry, and the shared-layout rule ("put shared
   components in projects/<slug>/lib/ — only the first builder creates them; others
   import"). If the scenes share a layout, write `lib/` yourself first.
4. **Gate.** `npx ct check <slug>` on the whole video. Fix cross-scene issues
   (transitions, continuity, overlaps) yourself or re-dispatch a builder.
5. **Critique.** Spawn the `critic` subagent. It scores 5 axes and returns ≤ 5 fixes.
6. **Iterate (max 3 rounds).** Apply the fixes (dispatch builders for scene-local
   fixes), gate, re-critique. If a round scores lower, `npx ct compare` the two
   iterations, record a `verdict`, and `npx ct restore <slug> best` if needed.
   Ship when the gate has 0 errors and every axis ≥ 4.
7. **Deliver.** `npx ct render <slug>`, `npx ct motion <slug>`,
   `npx ct report <slug>`. Send the user the MP4, the contact sheet and the
   report summary (scores, known issues, what you'd do with another round).
