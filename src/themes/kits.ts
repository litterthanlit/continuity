import { fonts, type FontFamily } from "./fonts.js";
import type { Theme } from "./index.js";

/**
 * Type kits: curated font pairings with tuned weights, widths, axes, tracking
 * and leading — the typographic half of a look, orthogonal to the colour theme.
 * Research: docs/research/2026-10-type-kits.md · decision: docs/decisions/0005.
 *
 * `classic` is not a font set: it is the theme's own fonts with v1 settings,
 * and emits exactly the v1 classes and CSS (so existing projects never move).
 */

export type TypeSize = "mega" | "display" | "h1" | "h2" | "h3" | "lead" | "body" | "caption" | "micro";
export type Role = "display" | "sans" | "mono" | "serif";

export const KIT_NAMES = ["swiss", "atelier", "wonk", "terminal", "broadside", "flexion"] as const;
export type KitName = (typeof KIT_NAMES)[number];

export interface RoleStyle {
  family: FontFamily;
  /** font-weight (variable families: any value inside the face range). */
  weight: number;
  /** font-stretch in % (needs a width-variable family). */
  width?: number;
  /** Custom variation axes, e.g. { SOFT: 100, WONK: 1 }. wght/wdth go through weight/width. */
  axes?: Record<string, number>;
  case?: "uppercase";
}

export interface TypeKit {
  name: string;
  description: string;
  /** Brands/studios this look evokes — for directors choosing a kit. */
  evokes: string;
  roles: Record<Role, RoleStyle>;
  /** Mono labels (Eyebrow). */
  label: { tracking: string; case: "uppercase" | "none" };
  /** Inline serif accent (Serif): x-height match against the surrounding sans/display. */
  accent: { scale: number; tracking: string; case?: "none" };
  /** Role used for big numbers (Stat): must have tabular figures or be monospace. */
  figures: Role;
  /** [line-height, letter-spacing] overrides of the global type scale, per size. */
  scale: Partial<Record<TypeSize, [number, string]>>;
  /** Colour themes this kit is designed against. */
  pairs: string[];
  /** v1 behaviour: emit the v1 classes and no role CSS (classic only). */
  v1?: boolean;
}

const r = (family: FontFamily, weight: number, extra: Partial<RoleStyle> = {}): RoleStyle => ({ family, weight, ...extra });
const instrument = r(fonts.instrumentSerif, 400);

export const typeKits: Record<KitName, TypeKit> = {
  swiss: {
    name: "swiss",
    description: "Pure grotesk, tight and precise. Geist display at 600 with Vercel-grade negative tracking, Geist Mono labels.",
    evokes: "Vercel, Linear, Stripe",
    roles: { display: r(fonts.geist, 600), sans: r(fonts.geist, 400), mono: r(fonts.geistMono, 400), serif: instrument },
    label: { tracking: "0.14em", case: "uppercase" },
    accent: { scale: 1.04, tracking: "0em" },
    figures: "display",
    scale: { mega: [0.86, "-0.06em"], display: [0.9, "-0.055em"], h1: [0.95, "-0.05em"], h2: [1.0, "-0.045em"], h3: [1.06, "-0.035em"] },
    pairs: ["mono-dark", "vivid-gradient"],
  },
  atelier: {
    name: "atelier",
    description: "Editorial serif over a clean grotesk. Newsreader display (optical sizes) with Instrument Sans text; italics carry the emphasis.",
    evokes: "Anthropic (Tiempos + Styrene), editorial product films",
    roles: {
      display: r(fonts.newsreader, 340),
      sans: r(fonts.instrumentSans, 400),
      mono: r(fonts.geistMono, 400),
      serif: r(fonts.newsreader, 340),
    },
    label: { tracking: "0.16em", case: "uppercase" },
    accent: { scale: 1, tracking: "-0.01em" },
    figures: "sans",
    scale: { mega: [0.98, "-0.02em"], display: [1.0, "-0.02em"], h1: [1.02, "-0.02em"], h2: [1.06, "-0.015em"], h3: [1.1, "-0.01em"] },
    pairs: ["light-editorial"],
  },
  wonk: {
    name: "wonk",
    description: "The expressive soft serif, done with restraint. Fraunces with SOFT and WONK on, Hanken Grotesk text, DM Mono labels and figures.",
    evokes: "Reckless/Recoleta, Arc/Dia's Exposure",
    roles: {
      display: r(fonts.fraunces, 400, { axes: { SOFT: 100, WONK: 1 } }),
      sans: r(fonts.hankenGrotesk, 400),
      mono: r(fonts.dmMono, 400),
      serif: r(fonts.fraunces, 400, { axes: { SOFT: 100, WONK: 1 } }),
    },
    label: { tracking: "0.12em", case: "uppercase" },
    accent: { scale: 1, tracking: "0em" },
    figures: "mono",
    scale: { mega: [0.94, "-0.03em"], display: [0.98, "-0.03em"], h1: [1.0, "-0.03em"], h2: [1.04, "-0.025em"], h3: [1.08, "-0.02em"] },
    pairs: ["light-editorial", "mono-dark"],
  },
  terminal: {
    name: "terminal",
    description: "Mono-led and technical. Geist Mono display, Geist text, tracked mono caps labels.",
    evokes: "Vercel, Resend, Cursor, dev-tool launches",
    roles: { display: r(fonts.geistMono, 500), sans: r(fonts.geist, 400), mono: r(fonts.geistMono, 400), serif: instrument },
    label: { tracking: "0.1em", case: "uppercase" },
    accent: { scale: 1.04, tracking: "0em" },
    figures: "mono",
    scale: { mega: [0.9, "-0.04em"], display: [0.94, "-0.035em"], h1: [1.0, "-0.03em"], h2: [1.04, "-0.03em"], h3: [1.1, "-0.02em"] },
    pairs: ["mono-dark"],
  },
  broadside: {
    name: "broadside",
    description: "Bold condensed caps for social cuts. Archivo at 66% width and 850 weight, Inter Tight text, Martian Mono labels.",
    evokes: "Figma Config condensed display, brutalist social",
    roles: {
      display: r(fonts.archivo, 850, { width: 66, case: "uppercase" }),
      sans: r(fonts.interTight, 500),
      mono: r(fonts.martianMono, 400, { width: 100 }),
      serif: instrument,
    },
    label: { tracking: "0.08em", case: "uppercase" },
    accent: { scale: 1.03, tracking: "0em", case: "none" },
    figures: "display",
    scale: { mega: [0.86, "0em"], display: [0.88, "0.005em"], h1: [0.9, "0.005em"], h2: [0.94, "0.01em"], h3: [1.0, "0.01em"] },
    pairs: ["vivid-gradient", "mono-dark"],
  },
  flexion: {
    name: "flexion",
    description: "A variable-axis showpiece. Mona Sans whose width (75–125) and weight (200–900) are meant to move; Martian Mono labels.",
    evokes: "GitHub Universe, Söhne Breit launches, kinetic type",
    roles: {
      display: r(fonts.monaSans, 600, { width: 100 }),
      sans: r(fonts.monaSans, 400, { width: 100 }),
      mono: r(fonts.martianMono, 400, { width: 100 }),
      serif: instrument,
    },
    label: { tracking: "0.1em", case: "uppercase" },
    accent: { scale: 1.02, tracking: "0em" },
    figures: "display",
    scale: { mega: [0.88, "-0.04em"], display: [0.92, "-0.04em"], h1: [0.96, "-0.04em"], h2: [1.02, "-0.035em"], h3: [1.08, "-0.025em"] },
    pairs: ["mono-dark", "vivid-gradient"],
  },
};

/** The theme's own fonts with v1 settings (what every project used before kits). */
export function classicKit(theme: Theme): TypeKit {
  return {
    name: "classic",
    description: "The theme's own fonts with v1 settings.",
    evokes: "",
    roles: {
      display: r(theme.fonts.display, 600),
      sans: r(theme.fonts.sans, 400),
      mono: r(theme.fonts.mono, 400),
      serif: r(theme.fonts.serif, 400),
    },
    label: { tracking: "0.18em", case: "uppercase" },
    accent: { scale: 1, tracking: "0em" },
    figures: "display",
    scale: {},
    pairs: [theme.name],
    v1: true,
  };
}

export function isKitName(name: string): name is KitName {
  return (KIT_NAMES as readonly string[]).includes(name);
}

export function getKit(name: string): TypeKit {
  if (!isKitName(name)) throw new Error(`Unknown type kit "${name}". Available: ${KIT_NAMES.join(", ")}`);
  return typeKits[name];
}

/**
 * The kit a build uses: an explicit name (storyboard `type`), else the theme's
 * own `type` (theme.ts), else classic.
 */
export function resolveKit(theme: Theme, name?: string): TypeKit {
  if (name) return getKit(name);
  if (theme.type) return typeof theme.type === "string" ? getKit(theme.type) : theme.type;
  return classicKit(theme);
}

/** A brand kit derived from a built-in one (roles merge per role). Families must come from the registry. */
export function defineKit(
  base: KitName | TypeKit,
  overrides: Partial<Omit<TypeKit, "roles">> & { roles?: Partial<Record<Role, Partial<RoleStyle>>> } = {},
): TypeKit {
  const b = typeof base === "string" ? getKit(base) : base;
  const roles = { ...b.roles };
  for (const [k, v] of Object.entries(overrides.roles ?? {}) as Array<[Role, Partial<RoleStyle>]>) roles[k] = { ...roles[k], ...v };
  return { ...b, ...overrides, roles, scale: { ...b.scale, ...(overrides.scale ?? {}) }, v1: undefined };
}

/** Every family a kit needs (unique by family name). */
export function kitFamilies(kits: TypeKit[]): FontFamily[] {
  const seen = new Map<string, FontFamily>();
  for (const k of kits) for (const role of Object.values(k.roles)) seen.set(role.family.family, role.family);
  return [...seen.values()];
}
