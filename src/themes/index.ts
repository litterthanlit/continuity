import { fonts, type FontFamily } from "./fonts.js";
import type { KitName, TypeKit } from "./kits.js";

/**
 * litt's colour and material, at video scale (docs/decisions/0006). Values are
 * litt.md's `assets/tokens.css` (profile v0.16): warm stone neutrals on OKLCH
 * hue ~60, a cobalt accent, five data hues. Shadows, rings and highlights are
 * litt's at 2× (1px → 2px). When litt's tokens change, these change with them.
 */
export type ColorToken =
  | "canvas"
  | "surface-1"
  | "surface-2"
  | "surface-3"
  | "line"
  | "line-strong"
  | "line-control"
  | "fg"
  | "fg-muted"
  | "fg-subtle"
  | "fg-disabled"
  | "accent"
  | "accent-fg"
  | "accent-text"
  | "accent-tint"
  | "focus"
  | "success"
  | "warning"
  | "danger"
  /** A phone's bezel: a physical object, dark in both themes. */
  | "device"
  | `data-${DataHue}`
  | `data-${DataHue}-text`;

/** P11: color carries data. Assigned in this order, never cycled. */
export const DATA_HUES = ["blue", "amber", "teal", "violet", "rose"] as const;
export type DataHue = (typeof DATA_HUES)[number];

/** Stage backgrounds: the solid canvas, or litt's one light source from the top. */
export type StageBackground = "solid" | "lit";

export interface Material {
  /** Accent share of the top light (`lit`), %. */
  light: number;
  /** Accent share of the primary action's glow, %. */
  glow: number;
  /** Grain opacity (static noise, plain opacity). */
  grain: number;
  /** How much of a data hue its tint carries, %. */
  tint: number;
  glass: string;
  glassBorder: string;
  /** Colour of the 2px top highlight a raised surface catches. */
  highlight: string;
  /** Zero-offset glow plus a ring: tooltips, floating panels, modals (P4). */
  shadowTooltip: string;
  shadowFloat: string;
  shadowModal: string;
}

export interface Theme {
  name: string;
  description: string;
  /** "dark" or "light". Both are first-class (P8); each is tuned, never inverted. */
  mode: "dark" | "light";
  colors: Record<ColorToken, string>;
  material: Material;
  /** Default stage background for scenes that don't choose one. */
  background: StageBackground;
  /** litt's two radii at 2×: controls 8, surfaces 16 (a surface is a control plus the inset). Pills stay full. */
  radius: { control: number; surface: number };
  /** Type kit a brand theme.ts pins. The storyboard's `type` wins over it; with neither, `litt`. */
  type?: KitName | TypeKit;
}

/** Shadows at video scale: litt's glows and 1px rings, doubled. */
const lightShadows = {
  shadowTooltip: "0 0 4px rgba(17, 15, 13, 0.08), 0 0 0 2px rgba(17, 15, 13, 0.06)",
  shadowFloat: "0 0 16px rgba(17, 15, 13, 0.08), 0 0 48px rgba(17, 15, 13, 0.06), 0 0 0 2px rgba(17, 15, 13, 0.06)",
  shadowModal: "0 0 80px rgba(17, 15, 13, 0.10), 0 0 144px rgba(17, 15, 13, 0.06), 0 0 0 2px rgba(17, 15, 13, 0.06)",
};
const darkShadows = {
  // A dark ring vanishes on a dark canvas, so the tooltip rings in line-strong.
  shadowTooltip: "0 0 4px rgba(0, 0, 0, 0.4), 0 0 0 2px var(--color-line-strong)",
  shadowFloat: "0 0 16px rgba(0, 0, 0, 0.4), 0 0 48px rgba(0, 0, 0, 0.3), 0 0 0 2px rgba(0, 0, 0, 0.5)",
  shadowModal: "0 0 80px rgba(0, 0, 0, 0.5), 0 0 144px rgba(0, 0, 0, 0.3), 0 0 0 2px rgba(0, 0, 0, 0.5)",
};

export const littDark: Theme = {
  name: "litt-dark",
  description: "litt, dark: a warm near-black canvas, stepped stone surfaces, one cobalt accent that behaves like light.",
  mode: "dark",
  colors: {
    canvas: "#0a0908",
    "surface-1": "#11100f",
    "surface-2": "#191715",
    "surface-3": "#201d1b",
    line: "#282421",
    "line-strong": "#38332f",
    "line-control": "#6e6762",
    fg: "#f9f8f7",
    "fg-muted": "#968d86",
    "fg-subtle": "#968d86",
    "fg-disabled": "#6b645f",
    accent: "#2d57e5",
    "accent-fg": "#ffffff",
    "accent-text": "#507afd",
    "accent-tint": "#13234f",
    focus: "#507afd",
    success: "#4bc680",
    warning: "#e19b1b",
    danger: "#ff756f",
    device: "#1d1b19",
    "data-blue": "#2c90e8",
    "data-blue-text": "#5aa8f4",
    "data-amber": "#c07b03",
    "data-amber-text": "#d79540",
    "data-teal": "#09a198",
    "data-teal-text": "#42b4ab",
    "data-violet": "#8f78df",
    "data-violet-text": "#a896ef",
    "data-rose": "#d55c8c",
    "data-rose-text": "#eb81a7",
  },
  material: {
    light: 22,
    glow: 40,
    grain: 0.04,
    tint: 18,
    glass: "rgba(17, 16, 15, 0.72)",
    glassBorder: "rgba(255, 255, 255, 0.08)",
    highlight: "rgba(255, 255, 255, 0.06)",
    ...darkShadows,
  },
  background: "solid",
  radius: { control: 8, surface: 16 },
};

export const littLight: Theme = {
  name: "litt-light",
  description: "litt, light: a warm off-white canvas, white raised surfaces, the same cobalt accent as a cool light.",
  mode: "light",
  colors: {
    canvas: "#fcfbfa",
    "surface-1": "#ffffff",
    "surface-2": "#f7f5f3",
    "surface-3": "#efecea",
    line: "#e8e4e1",
    "line-strong": "#d7d1cc",
    "line-control": "#8c847e",
    fg: "#110f0d",
    "fg-muted": "#6d6661",
    "fg-subtle": "#6d6661",
    "fg-disabled": "#a49c96",
    accent: "#264bd1",
    "accent-fg": "#ffffff",
    "accent-text": "#264bd1",
    "accent-tint": "#e8eeff",
    focus: "#264bd1",
    success: "#007c3b",
    warning: "#9c5a00",
    danger: "#be2e31",
    device: "#1d1b19",
    "data-blue": "#2d90e9",
    "data-blue-text": "#006ebe",
    "data-amber": "#c47d04",
    "data-amber-text": "#986002",
    "data-teal": "#099d95",
    "data-teal-text": "#027972",
    "data-violet": "#9579ef",
    "data-violet-text": "#7658ca",
    "data-rose": "#e25f93",
    "data-rose-text": "#bb3c72",
  },
  material: {
    light: 12,
    glow: 28,
    grain: 0.02,
    tint: 12,
    glass: "rgba(255, 255, 255, 0.72)",
    glassBorder: "rgba(17, 15, 13, 0.07)",
    highlight: "rgba(255, 255, 255, 0.9)",
    ...lightShadows,
  },
  background: "solid",
  radius: { control: 8, surface: 16 },
};

export const themes: Record<string, Theme> = {
  [littDark.name]: littDark,
  [littLight.name]: littLight,
};

export const DEFAULT_THEME = littDark.name;

export function getTheme(name: string): Theme {
  const t = themes[name];
  if (!t) throw new Error(`Unknown theme "${name}". Available: ${Object.keys(themes).join(", ")}`);
  return t;
}

type ThemeOverrides = Partial<Omit<Theme, "colors" | "material" | "radius">> & {
  colors?: Partial<Theme["colors"]>;
  material?: Partial<Material>;
  radius?: Partial<Theme["radius"]>;
};

/**
 * Brand overrides on a litt theme (projects/<slug>/theme.ts). litt: one accent
 * per project — set accent, accent-text, accent-tint and focus together, in
 * both themes if the video ships both.
 */
export function defineTheme(base: string | Theme, overrides: ThemeOverrides = {}): Theme {
  const b = typeof base === "string" ? getTheme(base) : base;
  return {
    ...b,
    ...overrides,
    colors: { ...b.colors, ...(overrides.colors ?? {}) },
    material: { ...b.material, ...(overrides.material ?? {}) },
    radius: { ...b.radius, ...(overrides.radius ?? {}) },
  };
}

export { fonts };
export type { FontFamily };
