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
 * - the `accent` gradient preset is the site's hero: monochrome smoke on black. Its brightest
 *   blob stays mid-grey so canvas-coloured type on it clears 3:1 at every frame.
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
    accent: { colors: ["#8e8e8e", "#5a5a5a", "#262626", "#000000"], base: "#050505", speed: 0.08, scale: 1.2, warp: 0.8 },
  },
});
