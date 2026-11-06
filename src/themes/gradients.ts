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

/**
 * Bold and deep, not a pastel wash: the four colours mix with broad weights, so complementary
 * hues average to grey and light ones flood the frame. Saturated, mid-dark hues keep every mix
 * vivid; a scale under 1 lets the base show between the blobs, so the field has depth. On
 * litt-dark, `accent` and `aurora` stay dark enough (luminance ≤ ~0.17) for `fg` type anywhere;
 * `ember` glows brighter, so place type over its dark side or on glass (docs/decisions/0011).
 */
export const GRADIENTS: Record<GradientName, GradientSpec> = {
  accent: { colors: ["accent", "accent-tint", "canvas", "accent-text"], base: "canvas", speed: 0.2, scale: 0.75, warp: 0.8 },
  aurora: { colors: ["#2448ff", "#7a2cff", "#0a8fa8", "#e0206a"], base: "canvas", speed: 0.22, scale: 0.8, warp: 0.8 },
  ember: { colors: ["#ff6a14", "#d1200f", "#4a0818", "#0a0908"], base: "#0a0908", speed: 0.2, scale: 0.75, warp: 0.85 },
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
