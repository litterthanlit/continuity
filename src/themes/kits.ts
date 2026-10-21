import { fonts, type FontFamily } from "./fonts.js";
import type { Theme } from "./index.js";

/**
 * The type kit: litt's typography at video scale (docs/decisions/0006).
 *
 * Geist for everything, Geist Mono for code, keys, ids, versions and numbers
 * in tables. Weight by role (P9): text 400, titles 500, labels 600 at the
 * label step only. No serif, no italic accent, no uppercase. The kit
 * mechanism (roles, scene scoping, defineKit) stays for brand tweaks.
 */

export type TypeSize = "display" | "title" | "body" | "small" | "label";
export const TYPE_SIZES: readonly TypeSize[] = ["display", "title", "body", "small", "label"];
export type Role = "display" | "sans" | "mono";

export const KIT_NAMES = ["litt"] as const;
export type KitName = (typeof KIT_NAMES)[number];

/** litt's three weights, and nothing else (P9). */
export const WEIGHTS = { text: 400, title: 500, label: 600 } as const;

/** [size px, line height px, tracking]. Line heights are whole pixels. */
export type ScaleStep = [number, number, string];

export interface RoleStyle {
  family: FontFamily;
  /** font-weight (variable families: any value inside the face range — litt keeps to its three). */
  weight: number;
  /** font-stretch in % (needs a width-variable family). */
  width?: number;
  /** Custom variation axes. wght/wdth go through weight/width. */
  axes?: Record<string, number>;
}

export interface TypeKit {
  name: string;
  description: string;
  roles: Record<Role, RoleStyle>;
  /** Role used for big numbers (Stat): must have tabular figures or be monospace. */
  figures: Role;
  /** The scale at 1080 short side, landscape and square. */
  scale: Record<TypeSize, ScaleStep>;
  /** 9:16 overrides: the probe's legibility floor is 34px there. */
  portrait: Partial<Record<TypeSize, ScaleStep>>;
}

export const littKit: TypeKit = {
  name: "litt",
  description: "Geist in three weights by role, Geist Mono for code and data. One display step per scene; rank from weight, two inks and space.",
  roles: {
    display: { family: fonts.geist, weight: WEIGHTS.title },
    sans: { family: fonts.geist, weight: WEIGHTS.text },
    mono: { family: fonts.geistMono, weight: WEIGHTS.text },
  },
  figures: "sans",
  scale: {
    display: [112, 112, "-0.04em"],
    title: [48, 56, "-0.025em"],
    body: [36, 48, "-0.01em"],
    small: [30, 40, "-0.005em"],
    label: [28, 36, "0em"],
  },
  portrait: {
    title: [56, 64, "-0.025em"],
    body: [40, 52, "-0.01em"],
    small: [36, 48, "-0.005em"],
    label: [34, 44, "0em"],
  },
};

export const typeKits: Record<KitName, TypeKit> = { litt: littKit };

/** The scale a build uses: the kit's, with its portrait overrides on 9:16. */
export function kitScale(kit: TypeKit, portrait = false): Record<TypeSize, ScaleStep> {
  return portrait ? { ...kit.scale, ...kit.portrait } : kit.scale;
}

export function isKitName(name: string): name is KitName {
  return (KIT_NAMES as readonly string[]).includes(name);
}

export function getKit(name: string): TypeKit {
  if (!isKitName(name)) throw new Error(`Unknown type kit "${name}". Available: ${KIT_NAMES.join(", ")}`);
  return typeKits[name];
}

/** The kit a build uses: an explicit name (storyboard `type`), else the theme's own `type` (theme.ts), else litt. */
export function resolveKit(theme: Theme, name?: string): TypeKit {
  if (name) return getKit(name);
  if (theme.type) return typeof theme.type === "string" ? getKit(theme.type) : theme.type;
  return littKit;
}

/** A brand kit derived from litt (roles merge per role). Families must come from the registry. */
export function defineKit(
  base: KitName | TypeKit,
  overrides: Partial<Omit<TypeKit, "roles">> & { roles?: Partial<Record<Role, Partial<RoleStyle>>> } = {},
): TypeKit {
  const b = typeof base === "string" ? getKit(base) : base;
  const roles = { ...b.roles };
  for (const [k, v] of Object.entries(overrides.roles ?? {}) as Array<[Role, Partial<RoleStyle>]>) roles[k] = { ...roles[k], ...v };
  return { ...b, ...overrides, roles, scale: { ...b.scale, ...(overrides.scale ?? {}) }, portrait: { ...b.portrait, ...(overrides.portrait ?? {}) } };
}

/** Every family a kit needs (unique by family name). */
export function kitFamilies(kits: TypeKit[]): FontFamily[] {
  const seen = new Map<string, FontFamily>();
  for (const k of kits) for (const role of Object.values(k.roles)) seen.set(role.family.family, role.family);
  return [...seen.values()];
}
