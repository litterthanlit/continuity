# 0005 — v2 look: type kits, variable-axis motion, transition presentations

**Status:** proposed · 2026-10-10

## Context

Every Continuity video looked alike: Inter Tight / Geist + Geist Mono + a one-word Instrument Serif
italic, and eight scene transitions that were plain tweens on the scene root (`inset()` clips only).
Research into what top product brands and motion studios ship in 2026
(`docs/research/2026-10-type-kits.md`, `docs/research/2026-10-transitions.md`) points to curated
serif/grotesk/mono pairings, variable-axis type motion, and a small, consistent *transition language*
per video built from feathered masks, motion-blurred camera moves and luminous overlays.

## Decisions

_To be completed when the implementation lands._

1. Type kits are orthogonal to colour themes.
2. Kit settings reach CSS through variables and `@layer components` role rules.
3. Variable-font axes are motion channels.
4. Transitions are a table of presentations; shapes are `fx` specs, overlays are DOM layers.
5. Existing projects render identically.

## Consequences

_To be completed._
