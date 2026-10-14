import { fonts, type FontFamily } from "./fonts.js";
import type { KitName, TypeKit } from "./kits.js";

export type ColorToken =
  | "bg"
  | "surface"
  | "surface-2"
  | "border"
  | "fg"
  | "muted"
  | "subtle"
  | "accent"
  | "accent-2"
  | "accent-fg"
  | "positive"
  | "warning"
  | "danger";

export type StageBackground = "solid" | "aurora" | "grid" | "spotlight" | "dots" | "mesh" | "lit";

export interface Theme {
  name: string;
  description: string;
  /** "dark" or "light" — components pick glass/shadow treatments from this. */
  mode: "dark" | "light";
  colors: Record<ColorToken, string>;
  fonts: { display: FontFamily; sans: FontFamily; mono: FontFamily; serif: FontFamily };
  /** Default stage background for scenes that don't choose one. */
  background: StageBackground;
  /** 0..1 film grain strength. */
  grain: number;
  radius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    /**
     * Buttons, inputs and address bars (`rounded-control`, and `rounded-field` for
     * inputs). Unset keeps the legacy look: pill buttons and `lg`-radius inputs.
     */
    control?: number;
  };
  /**
   * Depth recipes (`shadow-glow`, `shadow-float`) as CSS box-shadow values. Unset
   * keeps the built-in soft glow and drop shadow.
   */
  shadows?: { glow?: string; float?: string };
  /**
   * Type kit for every project on this theme (a brand theme.ts can pin one). The
   * storyboard's `type` wins over it; with neither, the build uses `classic`
   * (this theme's `fonts` with v1 settings).
   */
  type?: KitName | TypeKit;
  /** The kit `ct new` writes into new storyboards on this theme. */
  suggestedType?: KitName;
}

export const monoDark: Theme = {
  name: "mono-dark",
  description:
    "Linear/Vercel-like: near-black canvas, white type, one violet accent, hairline borders, soft aurora glow. Precise and premium.",
  mode: "dark",
  colors: {
    bg: "#08080a",
    surface: "#111114",
    "surface-2": "#18181d",
    border: "rgba(255,255,255,0.09)",
    fg: "#f5f5f6",
    muted: "#a1a1aa",
    subtle: "#6b6b76",
    accent: "#8b7bff",
    "accent-2": "#3ee0cf",
    "accent-fg": "#0b0b10",
    positive: "#4ade80",
    warning: "#fbbf24",
    danger: "#f87171",
  },
  fonts: { display: fonts.interTight, sans: fonts.geist, mono: fonts.geistMono, serif: fonts.instrumentSerif },
  background: "aurora",
  grain: 0.06,
  radius: { sm: 8, md: 14, lg: 22, xl: 32 },
  suggestedType: "swiss",
};

export const lightEditorial: Theme = {
  name: "light-editorial",
  description:
    "Stripe/editorial: warm off-white paper, ink-black type, serif accents, a single saturated accent. Calm, confident, magazine-like.",
  mode: "light",
  colors: {
    bg: "#f6f4ef",
    surface: "#ffffff",
    "surface-2": "#eeebe4",
    border: "rgba(20,18,15,0.10)",
    fg: "#14120f",
    muted: "#5d5a54",
    subtle: "#8f8b83",
    accent: "#4f46e5",
    "accent-2": "#ff6a3d",
    "accent-fg": "#ffffff",
    positive: "#16a34a",
    warning: "#d97706",
    danger: "#dc2626",
  },
  fonts: { display: fonts.interTight, sans: fonts.inter, mono: fonts.geistMono, serif: fonts.instrumentSerif },
  background: "solid",
  grain: 0.04,
  radius: { sm: 6, md: 12, lg: 18, xl: 28 },
  suggestedType: "atelier",
};

export const vividGradient: Theme = {
  name: "vivid-gradient",
  description:
    "Bold launch energy: deep indigo canvas, electric gradient mesh, high-contrast white type. For hype cuts and social.",
  mode: "dark",
  colors: {
    bg: "#0a0620",
    surface: "#140d33",
    "surface-2": "#1d1446",
    border: "rgba(255,255,255,0.14)",
    fg: "#ffffff",
    muted: "#c4bdf0",
    subtle: "#8a80c4",
    accent: "#ff4fd8",
    "accent-2": "#5ce1ff",
    "accent-fg": "#0a0620",
    positive: "#5cffb0",
    warning: "#ffd25c",
    danger: "#ff6b8a",
  },
  fonts: { display: fonts.interTight, sans: fonts.geist, mono: fonts.geistMono, serif: fonts.instrumentSerif },
  background: "mesh",
  grain: 0.08,
  radius: { sm: 10, md: 16, lg: 26, xl: 40 },
  suggestedType: "broadside",
};

/**
 * litt.md (tokens v0.5) at video scale: px values doubled (ring 1px to 2px, glow
 * 24px to 48px, radius 4/8 to 8/16). Depth is a zero-offset glow plus a ring, never
 * a drop shadow; the accent is used as light from above (background "lit").
 */
const littGlow = (strength: number) =>
  `0 0 0 2px color-mix(in oklab, var(--color-accent) 55%, transparent), 0 0 48px color-mix(in oklab, var(--color-accent) ${strength}%, transparent)`;

export const litt: Theme = {
  name: "litt",
  description: "litt.md: cool near-black, one signal-blue accent used as light from above, glow-and-ring depth, slight radius.",
  mode: "dark",
  colors: {
    bg: "#08090a",
    surface: "#0f1011",
    "surface-2": "#161719",
    border: "#232529",
    fg: "#f7f8f9",
    muted: "#d0d6e0",
    subtle: "#8a8f98",
    accent: "#4c9fff",
    "accent-2": "#6bb3ff",
    "accent-fg": "#08090a",
    positive: "#4bc680",
    warning: "#e19b1b",
    danger: "#ff756f",
  },
  // Classic-path fallback only: the litt kit sets these roles itself.
  fonts: { display: fonts.hostGrotesk, sans: fonts.hostGrotesk, mono: fonts.geistMono, serif: fonts.hostGrotesk },
  background: "lit",
  grain: 0.04,
  radius: { sm: 4, md: 8, lg: 16, xl: 16, control: 8 },
  shadows: {
    glow: littGlow(40),
    float: "0 0 16px rgba(0,0,0,0.4), 0 0 48px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,0,0,0.5)",
  },
  type: "litt",
  suggestedType: "litt",
};

export const littLight: Theme = {
  ...litt,
  name: "litt-light",
  description: "litt.md, light: cool off-white, one cobalt accent used as light from above, glow-and-ring depth, slight radius.",
  mode: "light",
  colors: {
    bg: "#fafbfc",
    surface: "#ffffff",
    "surface-2": "#f4f5f7",
    border: "#e3e5e9",
    fg: "#0e0f11",
    muted: "#3c3f45",
    subtle: "#64686f",
    accent: "#1a73d5",
    "accent-2": "#0961bb",
    "accent-fg": "#ffffff",
    positive: "#007c3b",
    warning: "#9c5a00",
    danger: "#be2e31",
  },
  grain: 0.02,
  shadows: {
    glow: littGlow(28),
    float: "0 0 16px rgba(14,15,17,0.08), 0 0 48px rgba(14,15,17,0.06), 0 0 0 1px rgba(14,15,17,0.06)",
  },
};

export const themes: Record<string, Theme> = {
  [monoDark.name]: monoDark,
  [lightEditorial.name]: lightEditorial,
  [vividGradient.name]: vividGradient,
  [litt.name]: litt,
  [littLight.name]: littLight,
};

export function getTheme(name: string): Theme {
  const t = themes[name];
  if (!t) throw new Error(`Unknown theme "${name}". Available: ${Object.keys(themes).join(", ")}`);
  return t;
}

/** Shallow-merge brand overrides onto a base theme (projects/<slug>/theme.ts). */
export function defineTheme(base: string | Theme, overrides: Partial<Omit<Theme, "colors">> & { colors?: Partial<Theme["colors"]> } = {}): Theme {
  const b = typeof base === "string" ? getTheme(base) : base;
  return {
    ...b,
    ...overrides,
    colors: { ...b.colors, ...(overrides.colors ?? {}) },
    fonts: { ...b.fonts, ...(overrides.fonts ?? {}) },
    radius: { ...b.radius, ...(overrides.radius ?? {}) },
    ...(b.shadows || overrides.shadows ? { shadows: { ...b.shadows, ...(overrides.shadows ?? {}) } } : {}),
  };
}

export { fonts };
export type { FontFamily };
