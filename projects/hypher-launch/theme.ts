import { defineTheme } from "continuity";

/**
 * Hypher's colours, from hypher.app (captured 2026-11-07): a near-white page (#fdfcfc) with
 * #2f2d2d text and a grey second line, a black hero of blurred monochrome smoke, sage
 * (#88bba2) as the product accent (status dots), and Claude orange (#D97757) on the
 * save / resume commands. Neutrals, type and material stay litt's (Geist + Geist Mono, as
 * the site uses).
 *
 * - accent: sage. `accent-text` is a darker sage for type on the page (AA on canvas).
 * - data-amber: Claude orange, for the commands only (`/hypher-save`, `$hypher-resume`):
 *   colour that carries data, not decoration.
 * - the `accent` gradient preset is the site's hero: a black field with one bright plume. Three
 *   of the four colours are black (one a step off, #0d0d0d, for depth) so they carve the white
 *   one into a plume, and a small scale (0.29) keeps it tight enough that the black shows around
 *   it (≥ 65% of the frame below luma 20 and p95 ≥ 150 at every 0.25 s of both windows; the
 *   site: 74%, p95 150). The shader keeps its colour centres within ±0.42 field units of the
 *   frame's middle, so the plume always lives around the centre; the copy goes to the upper left
 *   (turn on hook's line, end on trust's), and speed + warp (0.05, 0.8) are chosen — by sampling
 *   the field, a pure function of global time, every 0.25 s — so the plume stays right of and
 *   below that copy on both windows: on the turn (3.4–7.2 s) behind-copy luma p90 ≤ ~47, median
 *   ≤ 10; on the end (27.2–31.0 s) p90 ≤ ~28, median ≈ 0. Change speed, scale, warp or the
 *   white's slot and the plume lands somewhere else in those windows: re-measure.
 *   Shape (ridged silk streaks and the site's grain rather than soft blobs) needs shader work.
 */
export default defineTheme("litt-light", {
  colors: {
    canvas: "#fdfcfc",
    fg: "#2f2d2d",
    "fg-muted": "#6f6b66",
    "fg-subtle": "#6f6b66",
    accent: "#88bba2",
    "accent-fg": "#1d2b24",
    "accent-text": "#3d7559",
    "accent-tint": "#e8f2ec",
    focus: "#3d7559",
    "data-amber": "#d97757",
    "data-amber-text": "#b04f2e",
  },
  gradients: {
    accent: { colors: ["#000000", "#000000", "#0d0d0d", "#ffffff"], base: "#000000", speed: 0.05, scale: 0.29, warp: 0.8 },
  },
});
