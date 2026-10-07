---
description: Final render of a Continuity project with QC, motion analysis and report.
argument-hint: <project-slug> [--format mp4|webm|mov|gif]
---

Deliver the final cut of: $ARGUMENTS

1. `pnpm ct check <slug> --deep` — must be 0 errors (stop and report if not). `--deep`
   adds HyperFrames' verification of the generated motion assertions (slower).
2. `pnpm ct render <slug>` (pass through `--format` if given). Render QC must be clean.
3. `pnpm ct motion <slug>` — read `motion.png`; mention dead zones or jolts if any.
4. `pnpm ct sheet <slug>` and `pnpm ct report <slug>`.
5. Send the user the rendered file, the contact sheet and the motion chart, with
   a 3-line summary: duration/format, gate + critique status, known gaps.
