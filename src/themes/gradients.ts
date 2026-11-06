import type { Theme } from "./index.js";

/**
 * Moving gradient fields as theme data. A preset is four colours floating on a
 * base; scenes name one and the stage paints it. `accent` reads the theme's own
 * tokens, the others are bold fixed palettes a brand theme can override.
 */
export const GRADIENT_NAMES = ["accent", "aurora", "ember"] as const;
export type GradientName = (typeof GRADIENT_NAMES)[number];

export interface GradientSpec {
  /** Exactly four colours, hex or a theme token name ("accent", "canvas"…). */
  colors: [string, string, string, string];
  /** The ground the colours float on (hex or token). */
  base: string;
  /** Field units per second. */
  speed: number;
  /** Blob size; 1 = a blob is about a third of the frame. */
  scale: number;
  /** Domain-warp strength, 0..1. */
  warp: number;
}

export interface GradientUniforms {
  /** Four colours, linear RGB, flattened (12 numbers). */
  colors: number[];
  base: [number, number, number];
  speed: number;
  scale: number;
  warp: number;
  /** 0..1, stable per preset name (or custom spec): the same field in every scene. */
  seed: number;
}

export const GRADIENTS: Record<GradientName, GradientSpec> = {
  accent: { colors: ["accent", "accent-text", "accent-tint", "canvas"], base: "canvas", speed: 0.12, scale: 1.0, warp: 0.6 },
  aurora: { colors: ["#2d57e5", "#7b4dff", "#1fb8c9", "#e5487b"], base: "canvas", speed: 0.15, scale: 1.1, warp: 0.7 },
  ember: { colors: ["#ff5a1f", "#ffb347", "#b3200e", "#1a0a05"], base: "#0a0908", speed: 0.12, scale: 0.9, warp: 0.6 },
};

/** Standard sRGB EOTF on a #rrggbb hex. */
export function srgbToLinear(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`Not a #rrggbb colour: "${hex}"`);
  const n = parseInt(m[1]!, 16);
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return [lin((n >> 16) & 255), lin((n >> 8) & 255), lin(n & 255)];
}

/** FNV-1a 32-bit, mod 1000, over 1000. */
function seedOf(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return (h % 1000) / 1000;
}

function colour(theme: Theme, c: string): [number, number, number] {
  if (c.startsWith("#")) return srgbToLinear(c);
  const hex = (theme.colors as Record<string, string>)[c];
  if (!hex) throw new Error(`Unknown colour "${c}" in gradient: use a #rrggbb hex or a theme token (${Object.keys(theme.colors).join(", ")})`);
  return srgbToLinear(hex);
}

export function resolveGradient(theme: Theme, g: GradientName | GradientSpec): GradientUniforms {
  const spec = typeof g === "string" ? (theme.gradients?.[g] ?? GRADIENTS[g]) : g;
  if (!spec) throw new Error(`Unknown gradient "${String(g)}". Available: ${GRADIENT_NAMES.join(", ")}`);
  return {
    colors: spec.colors.flatMap((c) => colour(theme, c)),
    base: colour(theme, spec.base),
    speed: spec.speed,
    scale: spec.scale,
    warp: spec.warp,
    seed: seedOf(typeof g === "string" ? g : JSON.stringify(g)),
  };
}
