---
name: hyperframes-ref
description: Reference for the underlying HyperFrames engine (pinned 0.8.140) — only needed when debugging a build/render/check failure that the `ct` CLI surfaces from HyperFrames (lint codes, check finding codes, render flags, browser/doctor issues). Day-to-day work goes through `npx ct`.
---

# HyperFrames reference (engine under Continuity)

Continuity compiles each project into a plain HyperFrames composition in
`build/<slug>/` (or `build/<slug>~<scene>/` for scene-isolated checks) and drives
HyperFrames through `npx ct`. You rarely need HyperFrames directly. Read this when:

- `ct check` reports a `check:<code>` finding you don't understand → see the
  layout/contrast/motion code tables in `references/lint-validate-inspect.md`.
- `ct lint` reports `hf-lint:<code>` → same file, "lint" section.
- A render fails or capture is slow → `references/preview-render.md`
  (flags, workers, quality) and `references/doctor-browser.md` (browser
  resolution, BeginFrame vs screenshot capture).

Continuity-specific facts:
- No GSAP. Motion runs through `window.__hyperframes.registerFrameSource` (one
  per scene) and is evaluated as a pure function of time (see the Continuity repo's
  `docs/decisions/0001-engine-hyperframes.md`).
- Every HyperFrames call runs with telemetry/update checks/auto-installs off,
  Gemini frame description disabled, and `HYPERFRAMES_BROWSER_PATH` pointed at a
  local headless shell (`npx ct doctor` shows which; override with `CT_BROWSER_PATH`).
- `nested_structure_needs_subcomposition` is expected (single-file composition by
  design) and filtered out.
- To poke at a build manually: `npx hyperframes <cmd> build/<slug>` — but always
  fix things in `projects/<slug>/`, never in `build/`.

These references are vendored from HyperFrames (Apache-2.0, © HeyGen); see the
header of each file.
