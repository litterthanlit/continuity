# ADR 0001 — Rendering engine: HyperFrames + a Continuity motion runtime

- Status: accepted
- Date: 2026-10-07

## Context

Continuity lets coding agents author motion design videos as code. The
render substrate must be (1) fully open-source (OSI licence) end to end,
(2) frame-accurate and deterministic, (3) fluent for LLMs to author, and
(4) able to give agents machine-readable feedback.

Candidates evaluated (Oct 2026):

| Engine | Licence | Notes |
|---|---|---|
| Remotion 4 | Source-available (paid above 3 people) | Most mature, but fails the licence bar. |
| **HyperFrames 0.8** | **Apache-2.0** | HTML/CSS compositions, seek-per-frame capture, `lint`/`check`/`snapshot` with `--json`. Pre-1.0, fast-moving. |
| Motion Canvas / Revideo | MIT | Canvas2D generators; dormant / low LLM fluency. |
| Theatre.js | Apache-2.0 | Development stopped. |

HyperFrames' default animation library is GSAP, whose licence is not OSI.
GSAP is optional in HyperFrames' render path.

## Decision

- Use **HyperFrames 0.8.140**, pinned exactly (including every
  `@hyperframes/*` transitive package via `pnpm.overrides`).
- Do **not** use GSAP. Continuity ships its own motion runtime that plugs
  into HyperFrames' documented `window.__hyperframes.registerFrameSource`
  hook and evaluates every tween as a pure function of scene-local time.
- Motion is **data** (`Timeline` JSON) shared by the runtime, the timeline
  linter, the motion-path tools and the generated `*.motion.json` assertions.
- Scenes are authored as **view (Preact JSX → static HTML + Tailwind)** +
  **motion (typed DSL → data)** and compiled into a single-file HyperFrames
  composition (`build/<slug>/index.html`).

## Spike results (this container: 4 vCPU, no GPU, Chromium 141 headless shell)

- Rendering works with `HYPERFRAMES_BROWSER_PATH` pointed at Playwright's
  preinstalled `chromium_headless_shell` (HyperFrames pins Chrome 152, whose
  download host is blocked here). MP4 renders use **BeginFrame** capture.
- Frame source drives motion correctly (verified on extracted frames).
- **Determinism:** a 120-frame PNG-sequence render is byte-identical with 1
  vs 4 workers (md5 of every frame).
- `hyperframes check --json` audits frame-source compositions and returns
  findings that carry our `data-ct` ids.
- Speed: ~35 ms/frame (simple), ~150 ms/frame (blur + grain + gradients) at
  1080p in software GL.

## Consequences

- The HyperFrames bundler rejects template-literal selectors in inline
  scripts → the runtime is bundled with template literals lowered.
- Tailwind preflight's system-font fallbacks are stripped (HyperFrames lint
  requires `@font-face` for every named family; they are also
  non-deterministic).
- `nested_structure_needs_subcomposition` lint warnings are expected: we use
  one root composition with scene clips by design (simpler, faster, and
  every element keeps a stable `data-ct` id).
- Telemetry, update checks, auto-installs and Gemini frame description are
  disabled for every HyperFrames invocation.
- Pre-1.0 churn risk is contained by the exact pin + golden-frame tests.
