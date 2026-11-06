import type { Theme } from "./index.js";

/**
 * Moving gradient fields as theme data. A preset is four colours floating on a
 * base; scenes name one and the stage paints it. Each preset has a dark and a light
 * tuning, picked by the theme's mode; `accent` reads the theme's own tokens, the
 * others are bold fixed palettes. A brand theme can override any of them.
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
 * Bold, not a pastel wash, in both modes: the four colours mix with broad weights, so complementary
 * hues average to grey and light ones flood the frame. Each mode is tuned for its own ink
 * (docs/decisions/0011 §6):
 *
 * - **dark** (`fg` is near-white): saturated, mid-dark hues, and a scale under 1 lets the near-black
 *   base show between the blobs, so the field has depth. Luminance stays ≤ ~0.19 on `accent` and
 *   `aurora`, ≤ ~0.25 on `ember` (its glow).
 * - **light** (`fg` is near-black): saturated, luminous hues on a coloured base, no white ground, so
 *   the field never fades to the canvas. Luminance stays ≥ ~0.14 on `accent`, ≥ ~0.25 on `aurora`
 *   and `ember`.
 *
 * So large `fg` type clears 3:1 anywhere on every preset in both themes (the floor is 3.3:1, dark
 * `ember`); body type does not everywhere, and the contrast check samples it through the scene.
 *
 * `accent` reads the theme's tokens where they carry: on dark the accent family alone; on light the
 * accent and its tint, with two luminous cobalts (litt-light's accent is too dark to carry dark ink alone).
 */
export const GRADIENTS: Record<Theme["mode"], Record<GradientName, GradientSpec>> = {
  dark: {
    accent: { colors: ["accent", "accent-tint", "canvas", "accent-text"], base: "canvas", speed: 0.2, scale: 0.75, warp: 0.8 },
    aurora: { colors: ["#2448ff", "#7a2cff", "#0a8fa8", "#e0206a"], base: "canvas", speed: 0.22, scale: 0.8, warp: 0.8 },
    ember: { colors: ["#ff6a14", "#d1200f", "#4a0818", "#0a0908"], base: "#0a0908", speed: 0.2, scale: 0.75, warp: 0.85 },
  },
  light: {
    accent: { colors: ["#4d8dff", "accent-tint", "#8b7cff", "accent"], base: "#4d8dff", speed: 0.2, scale: 0.75, warp: 0.8 },
    aurora: { colors: ["#4d7dff", "#9a6bff", "#12b5c9", "#ff4f8f"], base: "#8a7dff", speed: 0.22, scale: 0.8, warp: 0.8 },
    ember: { colors: ["#ff6a14", "#ff3d2e", "#ffb000", "#ff5c8a"], base: "#ff9a4d", speed: 0.2, scale: 0.75, warp: 0.85 },
  },
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

const HEX = /^#[0-9a-f]{6}$/i;

/** A spec from a scene or a brand theme is outside data: check it here, naming the field that is wrong. */
function checkSpec(spec: GradientSpec, theme: Theme, what: string): void {
  const fail = (field: string, msg: string) => {
    throw new Error(`${what}: ${field} ${msg}`);
  };
  const isColour = (c: unknown) => typeof c === "string" && (HEX.test(c) || Object.hasOwn(theme.colors, c));
  const colourHelp = `use a #rrggbb hex or a theme token (${Object.keys(theme.colors).join(", ")})`;
  if (!Array.isArray(spec.colors) || spec.colors.length !== 4) {
    fail("colors", `must be exactly four colours (got ${Array.isArray(spec.colors) ? spec.colors.length : typeof spec.colors})`);
  }
  spec.colors.forEach((c, i) => {
    if (!isColour(c)) fail(`colors[${i}]`, `${JSON.stringify(c)} is not a colour: ${colourHelp}`);
  });
  if (!isColour(spec.base)) fail("base", `${JSON.stringify(spec.base)} is not a colour: ${colourHelp}`);
  for (const k of ["speed", "scale", "warp"] as const) {
    if (typeof spec[k] !== "number" || !Number.isFinite(spec[k])) fail(k, `must be a finite number (got ${JSON.stringify(spec[k])})`);
  }
  if (spec.scale <= 0) fail("scale", `must be above 0 (got ${spec.scale})`);
}

function colour(theme: Theme, c: string): [number, number, number] {
  return srgbToLinear(c.startsWith("#") ? c : (theme.colors as Record<string, string>)[c]!);
}

/** A preset (litt's for the theme's mode, or the theme's own override) or a custom spec, as shader uniforms. */
export function resolveGradient(theme: Theme, g: GradientName | GradientSpec): GradientUniforms {
  const named = typeof g === "string";
  const override = named ? theme.gradients?.[g] : undefined;
  const spec = named ? (override ?? GRADIENTS[theme.mode][g]) : g;
  if (!spec) throw new Error(`Unknown gradient "${String(g)}". Available: ${GRADIENT_NAMES.join(", ")}`);
  if (!named || override) checkSpec(spec, theme, named ? `gradient "${g}" in theme ${theme.name}` : "gradient spec");
  return {
    colors: spec.colors.flatMap((c) => colour(theme, c)),
    base: colour(theme, spec.base),
    speed: spec.speed,
    scale: spec.scale,
    warp: spec.warp,
    seed: seedOf(named ? g : JSON.stringify(g)),
  };
}
