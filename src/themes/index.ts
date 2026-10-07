import { fonts, type FontFamily } from "./fonts.js";

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

export type StageBackground = "solid" | "aurora" | "grid" | "spotlight" | "dots" | "mesh";

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
  radius: { sm: number; md: number; lg: number; xl: number };
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
};

export const themes: Record<string, Theme> = {
  [monoDark.name]: monoDark,
  [lightEditorial.name]: lightEditorial,
  [vividGradient.name]: vividGradient,
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
  };
}

export { fonts };
export type { FontFamily };
