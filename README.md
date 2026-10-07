# Continuity

**An open-source harness that lets AI agents make state-of-the-art motion design — as code — and check their own work.**

Agents already write good code. What they make as *motion* is usually not good:
linear easing, everything moving at once, nothing settling, text colliding
mid-move, dead holds, frames nobody composed. And they can't see any of it.

Continuity gives coding agents (Claude Code first) three things:

1. **A motion vocabulary with taste built in** — tokens (durations, eases,
   springs, staggers, read time), presets, transitions and a video-scale UI kit.
   Every animation is declared as **data**, so it can be rendered, linted and
   critiqued from the same source.
2. **Eyes** — stills, timecoded contact sheets, onion-skin motion strips, a
   motion-energy chart of the render, and a gate that audits layout, contrast,
   safe areas, type size, clipping, collisions-in-motion, easing, settle, read
   time and dead air — every finding keyed to an element id and a time.
3. **A studio process** — a director plans the storyboard, scene-builders work
   in parallel, a critic scores each cut on five axes, and only measured
   improvements are kept.

Everything in the render path is OSI-licensed (Apache-2.0 engine, OFL fonts).
No GSAP, no network at render time, byte-identical frames across worker counts.

| | |
|---|---|
| ![contact sheet](projects/example-type/.continuity/sheet.png) | **example-type** — 14.7s 9:16 kinetic type, made through the harness. Gate: 0 errors. Critique mean 4.2/5. |

## How it works

```
 brief.md ─▶ director ─▶ storyboard.json ─▶ scene-builders (parallel) ─▶ scenes/*.tsx
                                                                       │
                     ┌──────────── pnpm ct build ◀─────────────────────┘
                     ▼
     HyperFrames composition (HTML + Tailwind + vendored fonts + motion runtime)
                     │
   ┌─────── gate ────┼──────────── eyes ─────────────┐
   │ ct lint  (timeline motion lint, schema, glyphs) │ ct stills / sheet / strip
   │ ct check (HyperFrames layout + contrast,        │ ct render → ct motion
   │           Continuity probe: safe areas, type,   │
   │           clipping, collisions in motion)       │
   └─────────────────┬───────────────────────────────┘
                     ▼
        critic: 5-axis score + fixes ─▶ iterate (≤3) ─▶ compare / verdict ─▶ best
```

- **Scenes = view + motion.** A scene file exports a static view (Preact JSX →
  HTML at build time, styled with Tailwind using theme tokens) and a `motion(m)`
  function that declares tweens with presets and tokens.
- **Motion is a pure function of time.** A small runtime registers one
  HyperFrames *frame source* per scene and evaluates the timeline per frame —
  deterministic under seek-based capture.
- **Engine:** [HyperFrames](https://github.com/heygen-com/hyperframes)
  (Apache-2.0), pinned exactly. Why, and what we learned:
  [`docs/decisions/0001-engine-hyperframes.md`](docs/decisions/0001-engine-hyperframes.md).

## Quickstart

```bash
pnpm install            # Node ≥ 22, ffmpeg on PATH; uses a local headless Chrome
pnpm ct doctor          # toolchain check
pnpm ct new my-video --aspect 9:16 --theme mono-dark
# write projects/my-video/brief.md + storyboard.json + scenes/*.tsx — or let an agent:
#   claude  →  /make-video "A 15s reel announcing …"
pnpm ct check my-video  # the gate
pnpm ct sheet my-video  # look
pnpm ct render my-video # MP4 + QC
```

A scene:

```tsx
import { scene, Stage, Safe, Center, Headline, Serif, Emph } from "continuity";

export default scene({
  view: ({ text }) => (
    <Stage bg="aurora">
      <Safe><Center>
        <Headline ct="title" size="display">
          <Emph text={text.title} word="craft.">{(w) => <Serif class="text-accent">{w}</Serif>}</Emph>
        </Headline>
      </Center></Safe>
    </Stage>
  ),
  motion: (m) => {
    m.enter("title", "maskUp", { at: "b1", split: "lines" });
    m.camera({ scale: [1, 1.04] });
  },
});
```

## Using it with Claude Code

`CLAUDE.md` is the constitution; `.claude/` holds the rest:

- **Skills:** `continuity` (the loop + API), `motion-craft` (timing, easing,
  choreography, composition — with numbers), `kinetic-type`, `product-launch`,
  `critique` (5-axis rubric), `hyperframes-ref`.
- **Agents:** `director`, `scene-builder`, `critic`.
- **Commands:** `/make-video`, `/iterate`, `/critique`, `/render`.
- **Hooks:** every project edit runs `ct lint` and feeds errors back; the agent
  can't declare "done" while a changed project hasn't passed `ct check`; cloud
  sessions install dependencies on start.

## CLI

`pnpm ct <command>` — `new · build · lint · check · timeline · stills · sheet ·
strip · render · motion · status · score · compare · verdict · restore · report ·
docs · licenses · gate-status · doctor`. `pnpm ct <command> --help` for options.

## Design system

Three themes (`mono-dark`, `light-editorial`, `vivid-gradient`), a 1080-based
type scale (`text-mega` 240 → `text-micro` 26), vendored Geist / Inter Tight /
Instrument Serif / Geist Mono + symbol fallbacks, a UI kit at video scale
(windows, browsers, phones, code, terminals, charts, cursor, toasts…). See
`projects/_kit` for the gallery and `.claude/skills/continuity/reference/` for
the generated catalog.

## Verifying the harness

```bash
pnpm verify                 # typecheck + eslint + unit tests
CT_SLOW=1 pnpm test         # + browser tests: every seeded defect is caught, golden frames match
pnpm ct licenses            # OSI-only production dependencies
pnpm bench run              # headless /make-video over bench/briefs (slow; costs tokens)
```

## Roadmap

- Voiceover with word timings + beat-synced music (storyboard `audio` track).
- Docker image pinning Chrome/fonts/ffmpeg for pixel-exact CI; cloud rendering.
- Multi-aspect variants from one storyboard (16:9 ↔ 9:16 ↔ 1:1).
- A web studio over the same CLI; a pairwise judge calibrated on the bench.

## License

Apache-2.0 — see `LICENSE` and `NOTICE`.
