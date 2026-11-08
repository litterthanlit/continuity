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
 *   one into a plume, and a small scale (0.36) keeps it tight enough that the black shows around
 *   it (~60% of the frame below luma 20, p95 ≥ 150, like the site's median 7). The speed (0.07)
 *   is chosen for where the plume is when the field is on screen (the field runs on global time):
 *   on the turn (3.4–7.0 s) it sits right of the statement, on the end (27.6–31.4 s) low-left,
 *   under the centred statement, so canvas-coloured type keeps ≥ 3:1 at every sampled frame.
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
    accent: { colors: ["#000000", "#000000", "#0d0d0d", "#ffffff"], base: "#000000", speed: 0.07, scale: 0.36, warp: 1 },
  },
});
